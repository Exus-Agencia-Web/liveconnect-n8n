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

import { buildTemplateLayout, headerUrlProperty } from './TemplateFields';

export const LIVECONNECT_BASE_URL = 'https://api.liveconnect.chat/prod';
export const LIVECONNECT_TOKEN_HEADER = 'PageGearToken';
export const LIVECONNECT_CREDENTIALS_NAME = 'liveConnectApi';

/** Status con el que LiveConnect reporta un token de sesión vencido o inválido. */
const LC_STATUS_INVALID_TOKEN = -403;
/** Margen ante relojes desfasados: se renueva 60 s antes del `exp`. */
const TOKEN_SKEW_SECONDS = 60;
/** Vida asumida (~10 min) cuando el `exp` del token emitido no es legible. */
const TOKEN_FALLBACK_TTL_SECONDS = 540;

type TokenState = {
	minted?: { token: string; expiresAt: number };
	/** Hashes de tokens que el API ya rechazó con status -403. */
	burned: Set<string>;
	/** Último token puesto en el cable, para poder quemarlo si el API lo rechaza. */
	lastSent?: string;
};

/**
 * Caché en memoria del proceso, una entrada por cuenta.
 *
 * n8n NO persiste el token que emitimos aquí (`updateCredentials` no está expuesto a
 * los nodos), así que sin esta caché cada ítem volvería a pedir uno. La clave es un
 * hash de la cKey: nunca se guardan credenciales en claro.
 */
const tokenStates = new Map<string, TokenState>();
/** Emisiones en vuelo: N ítems concurrentes hacen UNA sola llamada a /account/token. */
const inFlightMints = new Map<string, Promise<string>>();
/** Tope de cuentas en caché: evita crecimiento indefinido en instancias multi-credencial. */
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
		// Map conserva el orden de inserción: se descarta la cuenta más antigua.
		const oldest = tokenStates.keys().next();
		if (!oldest.done) tokenStates.delete(oldest.value);
	}
	const created: TokenState = { burned: new Set<string>() };
	tokenStates.set(key, created);
	return created;
}

/** Respuesta de POST /account/token en cualquiera de sus formas conocidas. */
export interface LcTokenResponse {
	status?: number;
	status_message?: string;
	data?: { token?: string } | string;
	PageGearToken?: string;
}

/**
 * `exp` (epoch en segundos) del payload de un JWT, o `undefined` si no es decodificable
 * o no trae `exp`. No valida la firma: solo interesa saber si ya venció.
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
		// JWT malformado: no se puede afirmar que venció. La capa reactiva
		// (handleLcResponse con -403) lo quema si el API lo rechaza.
		return undefined;
	}
}

/**
 * Extrae el JWT de sesión de la respuesta de POST /account/token.
 *
 * TRAMPA DEL API: con keys faltantes responde HTTP 200 con `status:-2` Y un JWT ANÓNIMO
 * en `PageGearToken` que no sirve como sesión. Por eso `status < 0` se valida ANTES de
 * mirar el token.
 */
export function extractSessionToken(response: LcTokenResponse): string {
	if (typeof response.status === 'number' && response.status < 0) {
		throw new Error(
			`LiveConnect devolvió un error de autenticación (status ${response.status}): ` +
				(response.status_message ?? 'sin mensaje'),
		);
	}

	const token =
		typeof response.data === 'string'
			? response.data
			: (response.data?.token ?? response.PageGearToken ?? undefined);

	if (!token) {
		throw new Error(
			'LiveConnect no devolvió un token de sesión en data.token ni en PageGearToken. Verifica cKey y privateKey.',
		);
	}

	return token;
}

/**
 * Contexto mínimo para renovar el token. Lo cumplen IExecuteSingleFunctions,
 * ILoadOptionsFunctions e IHookFunctions, que son las tres rutas que hablan con el API.
 */
export interface LcTokenContext {
	getNode: IExecuteSingleFunctions['getNode'];
	getCredentials: (type: string) => Promise<IDataObject>;
	helpers: { httpRequest: IExecuteSingleFunctions['helpers']['httpRequest'] };
}

/** Emite un token nuevo. Deduplica las emisiones concurrentes de la misma cuenta. */
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
				'No se pudo renovar el token de sesión de LiveConnect',
				{
					description:
						'Falló POST /account/token al renovar el token vencido. Revisa la conectividad con ' +
						'api.liveconnect.chat y que la cKey y la clave privada de la credencial "LiveConnect API" ' +
						`sean correctas. Detalle: ${(error as Error).message ?? 'error desconocido'}`,
					level: 'warning',
				},
			);
		}

		let token: string;
		try {
			token = extractSessionToken(response);
		} catch (error) {
			throw new NodeApiError(this.getNode(), response as unknown as JsonObject, {
				message: 'LiveConnect rechazó la renovación del token de sesión',
				description: `${(error as Error).message} Abre la credencial "LiveConnect API" y verifica la cKey y la clave privada.`,
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
 * Marca el token vigente como inservible tras un -403 del API (capa reactiva).
 *
 * Se quema `lastSent` (el último token puesto en el cable para esa cuenta). Con varios
 * ítems concurrentes podría quemarse un token recién emitido en vez del rechazado: el
 * peor caso es una emisión extra, nunca una falla, porque `mintSessionToken` limpia la
 * lista de quemados al emitir.
 */
function burnCurrentToken(cKey: string): void {
	const state = tokenStates.get(accountKey(cKey));
	if (state === undefined) return;
	if (state.lastSent !== undefined) state.burned.add(sha256(state.lastSent));
	state.minted = undefined;
}

/**
 * preSend compartido por todas las operaciones: garantiza que la request salga con un
 * PageGearToken vigente.
 *
 * Por qué existe: el JWT dura ~10 min y n8n solo re-ejecuta `preAuthentication` ante un
 * HTTP 401. LiveConnect reporta el token vencido como HTTP 200 con `status:-403`, así
 * que ese 401 nunca ocurre y la credencial se queda con el token muerto.
 *
 * Este preSend SIEMBRA el header y `LiveConnectApi.authenticate` (forma de FUNCIÓN) lo
 * respeta. Con `IAuthenticateGeneric` no funcionaría: n8n aplica la autenticación
 * DESPUÉS de los preSend y pisaría el header sin condición.
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
 * Devuelve un token de sesión vigente para la cuenta de la credencial, renovándolo si
 * hace falta. `undefined` cuando no hay credenciales que usar (deja el flujo normal).
 *
 * La usan las tres rutas que llaman al API: el preSend del nodo declarativo, los
 * selectores dinámicos (LoadOptions) y los webhookMethods de los triggers. Estas dos
 * últimas NO pasan por el preSend, así que sin esto usarían el token rancio de la
 * credencial y fallarían con status -403.
 */
export async function ensureFreshToken(ctx: LcTokenContext): Promise<string | undefined> {
	let credentials: { cKey?: string; privateKey?: string; sessionToken?: string };
	try {
		credentials = (await ctx.getCredentials(LIVECONNECT_CREDENTIALS_NAME)) as typeof credentials;
	} catch {
		// Credencial no configurada (es opcional en el nodo de respuesta al callback):
		// se deja que la llamada siga y sea n8n quien reporte el error real.
		return undefined;
	}

	const cKey = credentials.cKey ?? '';
	const privateKey = credentials.privateKey ?? '';
	// Sin keys no hay nada que renovar: sigue el flujo normal de n8n.
	if (cKey === '' || privateKey === '') return undefined;

	const key = accountKey(cKey);
	const state = stateFor(key);
	const nowSeconds = Math.floor(Date.now() / 1000);

	// Candidato: el token emitido por el nodo (más fresco) o el de la credencial.
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

/** Quema el token de la cuenta tras un rechazo del API. Reexportado para las otras rutas. */
export async function burnTokenForContext(ctx: LcTokenContext): Promise<void> {
	const credentials = (await ctx.getCredentials(LIVECONNECT_CREDENTIALS_NAME)) as {
		cKey?: string;
	};
	if (credentials.cKey) burnCurrentToken(credentials.cKey);
}

/* ------------------------------------------------------------------ *
 * Enviar plantilla WABA
 * ------------------------------------------------------------------ */

/** Plantillas ya consultadas: evita una petición por ítem en envíos masivos. */
const templateCache = new Map<string, { template?: IDataObject; expiresAt: number }>();
const TEMPLATE_CACHE_TTL_MS = 5 * 60 * 1000;
const MAX_CACHED_TEMPLATES = 100;

/** Lista de valores separados por comas → array, respetando el orden y sin vacíos al final. */
function parseCsv(value: unknown): string[] {
	if (Array.isArray(value)) return value.map((v) => String(v ?? ''));
	if (typeof value !== 'string' || value.trim() === '') return [];
	return value.split(',').map((v) => v.trim());
}

async function loadTemplate(
	ctx: IExecuteSingleFunctions,
	idCanal: number,
	idPlantilla: string,
): Promise<IDataObject | undefined> {
	const key = `${idCanal}:${idPlantilla}`;
	const cached = templateCache.get(key);
	if (cached !== undefined && cached.expiresAt > Date.now()) return cached.template;

	let template: IDataObject | undefined;
	try {
		const token = await ensureFreshToken(ctx as unknown as LcTokenContext);
		const response = (await ctx.helpers.httpRequestWithAuthentication.call(
			ctx,
			LIVECONNECT_CREDENTIALS_NAME,
			{
				method: 'POST',
				url: `${LIVECONNECT_BASE_URL}/direct/waba/getTemplate`,
				body: { id_canal: idCanal, id: idPlantilla },
				...(token !== undefined ? { headers: { [LIVECONNECT_TOKEN_HEADER]: token } } : {}),
				json: true,
			},
		)) as { status?: number; data?: unknown };

		if (typeof response.status !== 'number' || response.status >= 0) {
			const data = Array.isArray(response.data) ? response.data[0] : response.data;
			if (data !== null && typeof data === 'object') template = data as IDataObject;
		}
	} catch {
		// Si no se puede consultar la plantilla no se bloquea el envío: se manda lo que
		// el usuario configuró y que sea el API quien valide.
		template = undefined;
	}

	if (templateCache.size >= MAX_CACHED_TEMPLATES) {
		const oldest = templateCache.keys().next();
		if (!oldest.done) templateCache.delete(oldest.value);
	}
	templateCache.set(key, { template, expiresAt: Date.now() + TEMPLATE_CACHE_TTL_MS });
	return template;
}

/**
 * preSend de "Enviar Plantilla": consulta la plantilla elegida para saber qué necesita,
 * coloca cada dato en la propiedad correcta del cuerpo y avisa con un mensaje útil
 * cuando falta algo (en vez de dejar que el API responda un error opaco).
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
	const idPlantilla = String(this.getNodeParameter('id_plantilla', ''));
	const urlEncabezado = String(this.getNodeParameter('url_encabezado', '') ?? '').trim();
	const usarEjemplo = this.getNodeParameter('additionalFields.usar_ejemplo', false) as boolean;
	let variables = parseCsv(this.getNodeParameter('variables', ''));

	const template =
		idCanal > 0 && idPlantilla !== '' ? await loadTemplate(this, idCanal, idPlantilla) : undefined;

	// Sin datos de la plantilla se envía lo que haya configurado el usuario.
	if (template === undefined) {
		if (variables.length > 0) body.variables = variables;
		if (urlEncabezado !== '') body.url_imagen_encabezado = urlEncabezado;
		return { ...requestOptions, body };
	}

	// El API acepta "id/nombre" de plantilla, pero el identificador largo de Meta
	// (667058365993373_67d4976c2921a_6360) no siempre resuelve: se envía el NOMBRE,
	// que es con el que trabaja el panel de LiveConnect.
	if (typeof template.name === 'string' && template.name.trim() !== '') {
		body.id_plantilla = template.name.trim();
	}

	const { fields, headerFormat } = buildTemplateLayout(template);
	const camposCuerpo = fields.filter((f) => f.id.startsWith('body_'));
	const ejemplosCuerpo = camposCuerpo.map((f) =>
		typeof f.defaultValue === 'string' ? f.defaultValue : '',
	);
	const nombre =
		typeof template.name === 'string' && template.name.trim() !== ''
			? template.name
			: idPlantilla;

	if (variables.length === 0 && usarEjemplo) variables = ejemplosCuerpo;

	// Validación que enseña: cuántas variables faltan y un ejemplo tomado de la plantilla.
	if (camposCuerpo.length > 0 && variables.length !== camposCuerpo.length) {
		const ejemplo = ejemplosCuerpo.filter((v) => v !== '').join(', ');
		throw new NodeOperationError(
			this.getNode(),
			`La plantilla «${nombre}» necesita ${camposCuerpo.length} ${camposCuerpo.length === 1 ? 'variable' : 'variables'} y recibió ${variables.length}`,
			{
				description:
					'Escribe los valores separados por comas en el campo "Variables", en el orden {{1}}, {{2}}…' +
					(ejemplo !== '' ? ` Por ejemplo: ${ejemplo}` : '') +
					'. También puedes activar "Usar Datos de Ejemplo" en Campos Adicionales para una prueba rápida.',
			},
		);
	}
	if (variables.length > 0) body.variables = variables;

	// URL del encabezado a la propiedad que corresponde al formato de la plantilla.
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
		if (url === '' && yaConfigurada === undefined) {
			const medio =
				headerFormat === 'IMAGE' ? 'una imagen' : headerFormat === 'VIDEO' ? 'un video' : 'un documento';
			throw new NodeOperationError(
				this.getNode(),
				`La plantilla «${nombre}» lleva ${medio} en el encabezado y falta su URL`,
				{
					description:
						`Pega la URL pública ${headerFormat === 'IMAGE' ? 'de la imagen' : headerFormat === 'VIDEO' ? 'del video' : 'del documento'} en el campo "URL del Encabezado".` +
						(typeof ejemploUrl === 'string' && ejemploUrl !== ''
							? ` La plantilla trae este ejemplo: ${ejemploUrl}`
							: ''),
				},
			);
		}
		if (url !== '' && yaConfigurada === undefined) body[propiedadUrl] = url;
	} else if (urlEncabezado !== '') {
		// La plantilla no declara medio pero el usuario puso una URL: se respeta.
		body.url_imagen_encabezado = urlEncabezado;
	}

	// Botones con parámetro dinámico: solo se rellenan con el ejemplo si se pidió.
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
 * Contexto de lo enviado, para que un error del API se pueda diagnosticar sin tener que
 * reproducir la llamada. Hoy solo detalla el envío de plantillas, que es el que más
 * datos combina.
 */
function describeRequestContext(ctx: IExecuteSingleFunctions): string {
	try {
		const resource = String(ctx.getNodeParameter('resource', ''));
		const operation = String(ctx.getNodeParameter('operation', ''));
		if (resource !== 'waba' || operation !== 'sendTemplate') return '';

		const variables = parseCsv(ctx.getNodeParameter('variables', ''));
		const partes = [
			`plantilla: ${String(ctx.getNodeParameter('id_plantilla', '')) || '(sin elegir)'}`,
			`canal: ${String(ctx.getNodeParameter('id_canal', '')) || '(sin elegir)'}`,
			`número: ${String(ctx.getNodeParameter('numero', '')) || '(vacío)'}`,
			`variables enviadas: ${variables.length}`,
		];
		return `. Datos del envío → ${partes.join(' · ')}. Comprueba que la plantilla esté APROBADA para ese canal y que el número incluya el código de país.`;
	} catch {
		return '';
	}
}

/**
 * postReceive compartido por todas las operaciones.
 *
 * La API de LiveConnect responde siempre `{ status, status_message, data }`:
 * `status > 0` es éxito y `status < 0` es error (aún con HTTP 200).
 * - Lanza NodeApiError cuando `status < 0`.
 * - Si "Devolver Respuesta Completa" está apagado (default), devuelve solo `data`
 *   (una fila por elemento cuando `data` es un array).
 */
export async function handleLcResponse(
	this: IExecuteSingleFunctions,
	items: INodeExecutionData[],
	response: IN8nHttpFullResponse,
): Promise<INodeExecutionData[]> {
	const body = response.body as IDataObject | undefined;

	if (body === undefined || body === null || typeof body !== 'object' || Array.isArray(body)) {
		// La API siempre envuelve en { status, status_message, data }; cualquier otra
		// forma se entrega tal cual llegó (robustez defensiva).
		return items;
	}

	const status = body.status as number | undefined;
	if (typeof status === 'number' && status < 0) {
		if (status === LC_STATUS_INVALID_TOKEN) {
			// Capa reactiva: se quema el token para que el próximo request renueve,
			// incluso si el `exp` del JWT no era legible.
			const credentials = await this.getCredentials<{ cKey?: string }>(
				LIVECONNECT_CREDENTIALS_NAME,
			);
			if (credentials.cKey) burnCurrentToken(credentials.cKey);

			throw new NodeApiError(this.getNode(), body as JsonObject, {
				message: 'El token de sesión de LiveConnect no es válido o expiró',
				description:
					'LiveConnect respondió "Token no valido!" (status -403). El token de sesión dura ~10 minutos ' +
					'y el nodo lo renueva solo: vuelve a ejecutar el workflow y debería funcionar. Si el error se ' +
					'repite, abre la credencial "LiveConnect API" y verifica la cKey y la clave privada.',
				httpCode: String(response.statusCode),
			});
		}

		throw new NodeApiError(this.getNode(), body as JsonObject, {
			message: (body.status_message as string) || 'LiveConnect API error',
			description: `LiveConnect devolvió status ${status}${describeRequestContext(this)}`,
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
