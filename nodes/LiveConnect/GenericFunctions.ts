import { createHash } from 'crypto';

import type {
	IDataObject,
	IExecuteSingleFunctions,
	IHttpRequestOptions,
	IN8nHttpFullResponse,
	INodeExecutionData,
	JsonObject,
} from 'n8n-workflow';
import { NodeApiError, NodeOperationError } from 'n8n-workflow';

import {
	buildTemplateLayout,
	decodeTemplateValue,
	headerUrlProperty,
	templateName,
	templateSendIdentifier,
} from './TemplateFields';

export const LIVECONNECT_BASE_URL = 'https://api.liveconnect.chat/prod';
export const LIVECONNECT_TOKEN_HEADER = 'PageGearToken';
/**
 * Name of the credential type, kept in a deliberately MUTABLE object.
 *
 * n8n indexes credentials by name in a global namespace, with no package prefix:
 * two extensions that both declare `liveConnectApi` are incompatible and n8n Cloud
 * rejects them. The generated Spanish package (scripts/build-es-package.mjs) rewrites
 * this `name` on its own copy of the compiled output, so both can coexist. That's why
 * this is an object instead of a string constant: it needs to be changeable at load time.
 */
export const LC_CREDENTIALS = { name: 'liveConnectApi' };

/** Status code LiveConnect uses to report an expired or invalid session token. */
const LC_STATUS_INVALID_TOKEN = -403;
/** Safety margin for clock skew: renews 60 s before the `exp`. */
const TOKEN_SKEW_SECONDS = 60;
/** Assumed lifetime (~10 min) when the `exp` of the issued token isn't readable. */
const TOKEN_FALLBACK_TTL_SECONDS = 540;

type TokenState = {
	minted?: { token: string; expiresAt: number };
	/** Hashes of tokens the API has already rejected with status -403. */
	burned: Set<string>;
	/** Last token sent over the wire, kept so it can be burned if the API rejects it. */
	lastSent?: string;
};

/**
 * In-process memory cache, one entry per account.
 *
 * n8n does NOT persist the token we mint here (`updateCredentials` isn't exposed to
 * nodes), so without this cache every item would request a new one. The key is a
 * hash of the cKey: credentials are never stored in plain text.
 */
const tokenStates = new Map<string, TokenState>();
/** In-flight mints: N concurrent items make a SINGLE call to /account/token. */
const inFlightMints = new Map<string, Promise<string>>();
/** Cap on cached accounts: prevents unbounded growth on multi-credential instances. */
const MAX_CACHED_ACCOUNTS = 50;

function sha256(value: string): string {
	return createHash('sha256').update(value).digest('hex');
}

function accountKey(cKey: string): string {
	return sha256(cKey).slice(0, 32);
}

function stateFor(key: string): TokenState {
	const existing = tokenStates.get(key);
	if (existing !== undefined) return existing;
	if (tokenStates.size >= MAX_CACHED_ACCOUNTS) {
		// Map preserves insertion order: the oldest account gets evicted.
		const oldest = tokenStates.keys().next();
		if (!oldest.done) tokenStates.delete(oldest.value);
	}
	const created: TokenState = { burned: new Set<string>() };
	tokenStates.set(key, created);
	return created;
}

/** Response of POST /account/token in any of its known shapes. */
export interface LcTokenResponse {
	status?: number;
	status_message?: string;
	data?: { token?: string } | string;
	PageGearToken?: string;
}

/**
 * `exp` (epoch in seconds) from a JWT's payload, or `undefined` if it can't be decoded
 * or carries no `exp`. Doesn't validate the signature: it only cares whether it already expired.
 */
export function getJwtExpiry(token: string): number | undefined {
	const parts = token.split('.');
	if (parts.length !== 3) return undefined;
	try {
		const payload = JSON.parse(
			Buffer.from(parts[1].replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8'),
		) as { exp?: unknown };
		return typeof payload.exp === 'number' && Number.isFinite(payload.exp) ? payload.exp : undefined;
	} catch {
		// Malformed JWT: can't tell whether it expired. The reactive layer
		// (handleLcResponse with -403) will burn it if the API rejects it.
		return undefined;
	}
}

/**
 * Extracts the session JWT from the POST /account/token response.
 *
 * API GOTCHA: with missing keys it responds HTTP 200 with `status:-2` AND an ANONYMOUS JWT
 * in `PageGearToken` that doesn't work as a session. That's why `status < 0` is validated
 * BEFORE looking at the token.
 */
export function extractSessionToken(response: LcTokenResponse): string {
	if (typeof response.status === 'number' && response.status < 0) {
		throw new Error(
			`LiveConnect returned an authentication error (status ${response.status}): ` +
				(response.status_message ?? 'no message'),
		);
	}

	const token =
		typeof response.data === 'string'
			? response.data
			: (response.data?.token ?? response.PageGearToken ?? undefined);

	if (!token) {
		throw new Error(
			'LiveConnect did not return a session token in data.token or PageGearToken. Check cKey and privateKey.',
		);
	}

	return token;
}

/**
 * Minimal context needed to renew the token. Satisfied by IExecuteSingleFunctions,
 * ILoadOptionsFunctions, and IHookFunctions — the three code paths that talk to the API.
 */
export interface LcTokenContext {
	getNode: IExecuteSingleFunctions['getNode'];
	getCredentials: (type: string) => Promise<IDataObject>;
	helpers: { httpRequest: IExecuteSingleFunctions['helpers']['httpRequest'] };
}

/** Mints a new token. Deduplicates concurrent mints for the same account. */
async function mintSessionToken(
	this: LcTokenContext,
	key: string,
	cKey: string,
	privateKey: string,
): Promise<string> {
	const pending = inFlightMints.get(key);
	if (pending !== undefined) return await pending;

	const request = (async () => {
		let response: LcTokenResponse;
		try {
			response = (await this.helpers.httpRequest({
				method: 'POST',
				url: `${LIVECONNECT_BASE_URL}/account/token`,
				body: { cKey, privateKey },
				json: true,
				timeout: 10000,
			})) as LcTokenResponse;
		} catch (error) {
			throw new NodeOperationError(
				this.getNode(),
				'Could not renew the LiveConnect session token',
				{
					description:
						'POST /account/token failed while renewing the expired token. Check connectivity to ' +
						'api.liveconnect.chat and that the cKey and private key of the "LiveConnect API" credential ' +
						`are correct. Detail: ${(error as Error).message ?? 'unknown error'}`,
					level: 'warning',
				},
			);
		}

		let token: string;
		try {
			token = extractSessionToken(response);
		} catch (error) {
			throw new NodeApiError(this.getNode(), response as unknown as JsonObject, {
				message: 'LiveConnect rejected the session token renewal',
				description: `${(error as Error).message} Open the "LiveConnect API" credential and check the cKey and private key.`,
				httpCode: '401',
			});
		}

		const state = stateFor(key);
		const nowSeconds = Math.floor(Date.now() / 1000);
		state.minted = {
			token,
			expiresAt: getJwtExpiry(token) ?? nowSeconds + TOKEN_FALLBACK_TTL_SECONDS,
		};
		state.burned.clear();
		return token;
	})();

	inFlightMints.set(key, request);
	try {
		return await request;
	} finally {
		inFlightMints.delete(key);
	}
}

/**
 * Marks the current token as unusable after a -403 from the API (reactive layer).
 *
 * Burns `lastSent` (the last token sent over the wire for that account). With several
 * concurrent items, a freshly minted token could get burned instead of the rejected one:
 * the worst case is one extra mint, never a failure, because `mintSessionToken` clears
 * the burned list whenever it mints.
 */
function burnCurrentToken(cKey: string): void {
	const state = tokenStates.get(accountKey(cKey));
	if (state === undefined) return;
	if (state.lastSent !== undefined) state.burned.add(sha256(state.lastSent));
	state.minted = undefined;
}

/**
 * preSend shared by every operation: guarantees the request goes out with a valid
 * PageGearToken.
 *
 * Why it exists: the JWT lasts ~10 min and n8n only re-runs `preAuthentication` on an
 * actual HTTP 401. LiveConnect reports the expired token as HTTP 200 with `status:-403`,
 * so that 401 never happens and the credential is left holding a dead token.
 *
 * This preSend SEEDS the header and `LiveConnectApi.authenticate` (the FUNCTION form)
 * honors it. It wouldn't work with `IAuthenticateGeneric`: n8n applies authentication
 * AFTER the preSend hooks and would overwrite the header unconditionally.
 */
export async function refreshTokenIfExpired(
	this: IExecuteSingleFunctions,
	requestOptions: IHttpRequestOptions,
): Promise<IHttpRequestOptions> {
	const token = await ensureFreshToken(this as unknown as LcTokenContext);
	if (token === undefined) return requestOptions;

	return {
		...requestOptions,
		headers: { ...requestOptions.headers, [LIVECONNECT_TOKEN_HEADER]: token },
	};
}

/**
 * Returns a valid session token for the credential's account, renewing it if needed.
 * `undefined` when there are no credentials to use (lets the normal flow continue).
 *
 * Used by the three code paths that call the API: the declarative node's preSend, the
 * dynamic selectors (LoadOptions), and the triggers' webhookMethods. The latter two do
 * NOT go through the preSend, so without this they'd use the credential's stale token
 * and fail with status -403.
 */
export async function ensureFreshToken(ctx: LcTokenContext): Promise<string | undefined> {
	let credentials: { cKey?: string; privateKey?: string; sessionToken?: string };
	try {
		credentials = (await ctx.getCredentials(LC_CREDENTIALS.name)) as typeof credentials;
	} catch {
		// Credential not configured (it's optional on the callback response node):
		// let the call continue and have n8n report the real error.
		return undefined;
	}

	const cKey = credentials.cKey ?? '';
	const privateKey = credentials.privateKey ?? '';
	// With no keys there's nothing to renew: continue with n8n's normal flow.
	if (cKey === '' || privateKey === '') return undefined;

	const key = accountKey(cKey);
	const state = stateFor(key);
	const nowSeconds = Math.floor(Date.now() / 1000);

	// Candidate: the token minted by the node (freshest) or the credential's own token.
	const mintedIsUsable =
		state.minted !== undefined && state.minted.expiresAt - TOKEN_SKEW_SECONDS > nowSeconds;
	const candidate = mintedIsUsable
		? (state.minted as { token: string }).token
		: (credentials.sessionToken ?? '');

	const expiry = candidate === '' ? undefined : getJwtExpiry(candidate);
	const needsRefresh =
		candidate === '' ||
		state.burned.has(sha256(candidate)) ||
		(expiry !== undefined && expiry - TOKEN_SKEW_SECONDS <= nowSeconds);

	const token = needsRefresh ? await mintSessionToken.call(ctx, key, cKey, privateKey) : candidate;
	state.lastSent = token;
	return token;
}

/** Burns the account's token after an API rejection. Re-exported for the other code paths. */
export async function burnTokenForContext(ctx: LcTokenContext): Promise<void> {
	const credentials = (await ctx.getCredentials(LC_CREDENTIALS.name)) as {
		cKey?: string;
	};
	if (credentials.cKey) burnCurrentToken(credentials.cKey);
}

/* ------------------------------------------------------------------ *
 * Send WABA template
 * ------------------------------------------------------------------ */

/** Templates already fetched: avoids one request per item on bulk sends. */
/** Template listing per channel (key = id_canal). */
const templateCache = new Map<string, { rows?: IDataObject[]; expiresAt: number }>();
const TEMPLATE_CACHE_TTL_MS = 5 * 60 * 1000;
const MAX_CACHED_TEMPLATES = 100;


/**
 * Values of the "Variable {{1}}", "Variable {{2}}"… fields, in order. Trimmed at the
 * last one with content so no trailing gaps get sent.
 */
function readNumberedVariables(ctx: IExecuteSingleFunctions): string[] {
	const valores: string[] = [];
	for (let i = 1; i <= MAX_TEMPLATE_VARIABLES; i++) {
		const valor = ctx.getNodeParameter(`variable_${i}`, '');
		valores.push(valor === null || valor === undefined ? '' : String(valor));
	}
	let ultimo = valores.length;
	while (ultimo > 0 && valores[ultimo - 1].trim() === '') ultimo--;
	return valores.slice(0, ultimo);
}

/** Cap on the variable fields declared on the send operation. */
const MAX_TEMPLATE_VARIABLES = 10;

async function loadTemplate(
	ctx: IExecuteSingleFunctions,
	idCanal: number,
	idPlantilla: string,
): Promise<IDataObject | undefined> {
	const rows = await loadChannelTemplates(ctx, idCanal);
	if (rows === undefined) return undefined;

	const buscado = idPlantilla.trim().toLowerCase();
	return rows.find((row) => {
		for (const clave of ['id', 'elementName', 'name', 'templateName']) {
			const valor = row[clave];
			if (typeof valor === 'string' && valor.trim().toLowerCase() === buscado) return true;
		}
		return false;
	});
}

/**
 * Channel templates, cached.
 *
 * Uses the LIST endpoint instead of `/direct/waba/getTemplate`: that endpoint identifies
 * the template by its META id (or its alternate name) and responds `status:-400 Invalid
 * template id provided` when given the LiveConnect id — which is exactly the one that
 * needs to be sent. A single query per channel also covers every template and every
 * item in the batch.
 */
async function loadChannelTemplates(
	ctx: IExecuteSingleFunctions,
	idCanal: number,
): Promise<IDataObject[] | undefined> {
	const key = String(idCanal);
	const cached = templateCache.get(key);
	if (cached !== undefined && cached.expiresAt > Date.now()) return cached.rows;

	let rows: IDataObject[] | undefined;
	try {
		const token = await ensureFreshToken(ctx as unknown as LcTokenContext);
		const response = (await ctx.helpers.httpRequestWithAuthentication.call(
			ctx,
			LC_CREDENTIALS.name,
			{
				method: 'POST',
				url: `${LIVECONNECT_BASE_URL}/direct/waba/getTemplates`,
				body: { id_canal: idCanal },
				...(token !== undefined ? { headers: { [LIVECONNECT_TOKEN_HEADER]: token } } : {}),
				json: true,
			},
		)) as { status?: number; data?: unknown };

		if (typeof response.status !== 'number' || response.status >= 0) {
			rows = pickTemplateRows(response.data);
		}
	} catch {
		// If the listing can't be queried, the send isn't blocked: it goes out with
		// whatever the user configured and lets the API do the validating.
		rows = undefined;
	}

	if (templateCache.size >= MAX_CACHED_TEMPLATES) {
		const oldest = templateCache.keys().next();
		if (!oldest.done) templateCache.delete(oldest.value);
	}
	templateCache.set(key, { rows, expiresAt: Date.now() + TEMPLATE_CACHE_TTL_MS });
	return rows;
}

/** `data` is either a plain array or the `{ templates, paging }` object the API returns. */
function pickTemplateRows(data: unknown): IDataObject[] {
	if (Array.isArray(data)) return data as IDataObject[];
	if (data === null || typeof data !== 'object') return [];
	const contenedor = data as IDataObject;
	for (const clave of ['templates', 'items', 'list', 'rows', 'results', 'data']) {
		if (Array.isArray(contenedor[clave])) return contenedor[clave] as IDataObject[];
	}
	for (const valor of Object.values(contenedor)) {
		if (Array.isArray(valor)) return valor as IDataObject[];
	}
	return [];
}

/**
 * preSend for "Send Template": looks up the chosen template to find out what it needs,
 * places each piece of data in the correct body property, and warns with a useful
 * message when something is missing (instead of letting the API return an opaque error).
 */
export async function prepareTemplateSend(
	this: IExecuteSingleFunctions,
	requestOptions: IHttpRequestOptions,
): Promise<IHttpRequestOptions> {
	const bodyActual = requestOptions.body;
	if (bodyActual !== undefined && (typeof bodyActual !== 'object' || bodyActual === null)) {
		return requestOptions;
	}
	const body = { ...((bodyActual as IDataObject | undefined) ?? {}) };

	const idCanal = Number(this.getNodeParameter('id_canal', 0));
	// The selector encodes what the template needs: only the identifier should be
	// kept before sending it to the API.
	const { identificador: idPlantilla, headerFormat: formatoCodificado } = decodeTemplateValue(
		String(this.getNodeParameter('id_plantilla', '')),
	);
	body.id_plantilla = idPlantilla;
	const urlEncabezado = String(this.getNodeParameter('url_encabezado', '') ?? '').trim();
	const usarEjemplo = this.getNodeParameter('additionalFields.usar_ejemplo', false) as boolean;
	let variables = readNumberedVariables(this);
	// Fallback for a template chosen via expression: in that case the "Variable {{n}}"
	// fields aren't shown because displayOptions doesn't evaluate expressions.
	if (variables.length === 0) {
		variables = String(this.getNodeParameter('additionalFields.variables_csv', '') ?? '')
			.split(',')
			.map((valor) => valor.trim())
			.filter((valor, i, todos) => todos.slice(i).some((resto) => resto !== ''));
	}

	const template =
		idCanal > 0 && idPlantilla !== '' ? await loadTemplate(this, idCanal, idPlantilla) : undefined;

	// With no template data, whatever the user configured is sent as-is. The header
	// format is taken from the selector's value, which already carries it encoded.
	if (template === undefined) {
		if (variables.length > 0) body.variables = variables;
		if (urlEncabezado !== '') {
			body[headerUrlProperty(formatoCodificado ?? 'IMAGE') ?? 'url_imagen_encabezado'] =
				urlEncabezado;
		}
		return { ...requestOptions, body };
	}

	const { fields, headerFormat } = buildTemplateLayout(template);
	const camposCuerpo = fields.filter((f) => f.id.startsWith('body_'));
	const ejemplosCuerpo = camposCuerpo.map((f) =>
		typeof f.defaultValue === 'string' ? f.defaultValue : '',
	);
	const nombre = templateName(template) ?? idPlantilla;
	// The correct identifier depends on the channel's provider (Gupshup wants the id,
	// Meta direct wants the name): it's recalculated from the actual listing row, which
	// also fixes up a stale value saved on the node.
	const identificadorReal = templateSendIdentifier(template);
	if (identificadorReal !== undefined) body.id_plantilla = identificadorReal;

	const total = camposCuerpo.length;
	if (total > 0) {
		// Only the positions the template declares are used: when switching templates,
		// n8n keeps on the node whatever was typed into fields that are now hidden.
		variables = variables.slice(0, total);
		while (variables.length < total) variables.push('');
		if (usarEjemplo) {
			variables = variables.map((valor, i) => (valor.trim() !== '' ? valor : ejemplosCuerpo[i] ?? ''));
		}

		// Validation that teaches: it names the empty positions instead of an abstract total.
		const faltantes = variables
			.map((valor, i) => (valor.trim() === '' ? i + 1 : 0))
			.filter((posicion) => posicion > 0);
		if (faltantes.length > 0) {
			const ejemplo = ejemplosCuerpo.filter((v) => v !== '').join(', ');
			const lista = faltantes.map((n) => `{{${n}}}`).join(', ');
			throw new NodeOperationError(
				this.getNode(),
				`Template "${nombre}" needs ${total === 1 ? 'one variable' : `${total} variables`} and ${faltantes.length === 1 ? 'is missing the value of' : 'is missing the values of'} ${lista}`,
				{
					description:
						`Fill in ${faltantes.length === 1 ? 'the field' : 'the fields'} ${faltantes.map((n) => `"Variable {{${n}}}"`).join(', ')} below the template selector.` +
						(ejemplo !== '' ? ` The template includes this example: ${ejemplo}.` : '') +
						' You can also enable "Use Sample Data" in Additional Fields for a quick test.',
				},
			);
		}
	} else {
		variables = [];
	}
	if (variables.length > 0) body.variables = variables;

	// Header URL goes into the property that matches the template's format.
	const propiedadUrl = headerUrlProperty(headerFormat);
	if (propiedadUrl !== undefined) {
		const ejemploUrl = fields.find((f) => f.id.startsWith('header_media'))?.defaultValue;
		const url =
			urlEncabezado !== ''
				? urlEncabezado
				: usarEjemplo && typeof ejemploUrl === 'string'
					? ejemploUrl
					: '';
		const yaConfigurada =
			body.url_imagen_encabezado ?? body.url_video_encabezado ?? body.url_documento_encabezado;
		// A template with its own media is sent without a URL: the API uses its own
		// (verified live). It's only required when neither one is present.
		const medioPropio = typeof ejemploUrl === 'string' && ejemploUrl !== '';
		if (url === '' && yaConfigurada === undefined && !medioPropio) {
			const medio =
				headerFormat === 'IMAGE' ? 'an image' : headerFormat === 'VIDEO' ? 'a video' : 'a document';
			throw new NodeOperationError(
				this.getNode(),
				`Template "${nombre}" has ${medio} in the header and its URL is missing`,
				{
					description: `Paste the public URL ${headerFormat === 'IMAGE' ? 'of the image' : headerFormat === 'VIDEO' ? 'of the video' : 'of the document'} in the "Header URL" field. It must be accessible from the internet.`,
				},
			);
		}
		if (url !== '' && yaConfigurada === undefined) body[propiedadUrl] = url;
	} else if (urlEncabezado !== '') {
		// The template doesn't declare media but the user set a URL: it's respected.
		body.url_imagen_encabezado = urlEncabezado;
	}

	// Buttons with a dynamic parameter: only filled with the sample if it was requested.
	const camposBoton = fields.filter((f) => f.id.startsWith('button_'));
	if (usarEjemplo && camposBoton.length > 0 && body.buttons === undefined) {
		body.buttons = camposBoton.map((f, index) => ({
			index,
			parameter: typeof f.defaultValue === 'string' ? f.defaultValue : '',
		}));
	}

	return { ...requestOptions, body };
}

/**
 * Context of what was sent, so an API error can be diagnosed without having to
 * reproduce the call. Today it only details the template send, which is the one
 * combining the most data.
 */
function describeRequestContext(ctx: IExecuteSingleFunctions): string {
	try {
		const resource = String(ctx.getNodeParameter('resource', ''));
		const operation = String(ctx.getNodeParameter('operation', ''));
		if (resource !== 'waba' || operation !== 'sendTemplate') return '';

		const variables = readNumberedVariables(ctx);
		const partes = [
			`template: ${String(ctx.getNodeParameter('id_plantilla', '')) || '(not selected)'}`,
			`channel: ${String(ctx.getNodeParameter('id_canal', '')) || '(not selected)'}`,
			`number: ${String(ctx.getNodeParameter('numero', '')) || '(empty)'}`,
			`variables sent: ${variables.length}`,
		];
		return `. Send data → ${partes.join(' · ')}. Check that the template is APPROVED for that channel and that the number includes the country code.`;
	} catch {
		return '';
	}
}

/**
 * postReceive shared by every operation.
 *
 * The LiveConnect API always responds `{ status, status_message, data }`:
 * `status > 0` is success and `status < 0` is an error (even with HTTP 200).
 * - Throws NodeApiError when `status < 0`.
 * - If "Return Full Response" is off (default), returns only `data`
 *   (one row per item when `data` is an array).
 */
export async function handleLcResponse(
	this: IExecuteSingleFunctions,
	items: INodeExecutionData[],
	response: IN8nHttpFullResponse,
): Promise<INodeExecutionData[]> {
	const body = response.body as IDataObject | undefined;

	if (body === undefined || body === null || typeof body !== 'object' || Array.isArray(body)) {
		// The API always wraps in { status, status_message, data }; any other shape
		// is passed through as-is (defensive robustness).
		return items;
	}

	const status = body.status as number | undefined;
	if (typeof status === 'number' && status < 0) {
		if (status === LC_STATUS_INVALID_TOKEN) {
			// Reactive layer: burn the token so the next request renews it,
			// even if the JWT's `exp` wasn't readable.
			const credentials = await this.getCredentials<{ cKey?: string }>(
				LC_CREDENTIALS.name,
			);
			if (credentials.cKey) burnCurrentToken(credentials.cKey);

			throw new NodeApiError(this.getNode(), body as JsonObject, {
				message: 'The LiveConnect session token is invalid or expired',
				description:
					'LiveConnect responded "Token no valido!" (status -403). The session token lasts ~10 minutes ' +
					'and the node renews it automatically: run the workflow again and it should work. If the error ' +
					'keeps happening, open the "LiveConnect API" credential and check the cKey and private key.',
				httpCode: String(response.statusCode),
			});
		}

		throw new NodeApiError(this.getNode(), body as JsonObject, {
			message: (body.status_message as string) || 'LiveConnect API error',
			description: `LiveConnect returned status ${status}${describeRequestContext(this)}`,
			httpCode: String(response.statusCode),
		});
	}

	const fullResponse = this.getNodeParameter('fullResponse', false) as boolean;
	if (fullResponse) {
		return items;
	}

	const data = body.data;
	if (data === undefined || data === null) {
		return [{ json: body }];
	}
	if (Array.isArray(data)) {
		return data.map((entry) => ({
			json: (typeof entry === 'object' && entry !== null ? entry : { value: entry }) as IDataObject,
		}));
	}
	if (typeof data === 'object') {
		return [{ json: data as IDataObject }];
	}
	return [{ json: { value: data } }];
}
