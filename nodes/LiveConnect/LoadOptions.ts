import type { IDataObject, ILoadOptionsFunctions, INodePropertyOptions } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

import { buildTemplateLayout, encodeTemplateValue, templateSendIdentifier } from './TemplateFields';

import type { LcTokenContext } from './GenericFunctions';
import {
	burnTokenForContext,
	ensureFreshToken,
	LIVECONNECT_BASE_URL,
	LC_CREDENTIALS,
	LIVECONNECT_TOKEN_HEADER,
} from './GenericFunctions';

/**
 * Calls an API endpoint and returns `data` raw.
 * Validates the standard envelope: `status < 0` is an error even with HTTP 200.
 */
async function lcRequest(
	ctx: ILoadOptionsFunctions,
	endpoint: string,
	method: 'GET' | 'POST' = 'GET',
	body?: IDataObject,
): Promise<unknown> {
	let response: { status?: number; status_message?: string; data?: unknown };

	// Selectors do NOT go through the node's preSend, so the credential's token might
	// be expired (the API reports it as HTTP 200 with status -403). A valid one is
	// seeded here; `authenticate` honors the header that's already present.
	const tokenContext = ctx as unknown as LcTokenContext;
	const token = await ensureFreshToken(tokenContext);

	try {
		response = (await ctx.helpers.httpRequestWithAuthentication.call(
			ctx,
			LC_CREDENTIALS.name,
			{
				method,
				url: `${LIVECONNECT_BASE_URL}${endpoint}`,
				...(body !== undefined ? { body } : {}),
				...(token !== undefined ? { headers: { [LIVECONNECT_TOKEN_HEADER]: token } } : {}),
				json: true,
			},
		)) as typeof response;
	} catch (error) {
		throw new NodeOperationError(
			ctx.getNode(),
			'Could not load the list from LiveConnect',
			{
				description:
					'Check that the "LiveConnect API" credential is configured and that the account has ' +
					`access to ${endpoint}. Detail: ${(error as Error).message ?? 'unknown error'}`,
			},
		);
	}

	if (typeof response.status === 'number' && response.status < 0) {
		if (response.status === -403) {
			// Token rejected despite the renewal: burn it so the next attempt mints a
			// new one instead of repeating the same error.
			await burnTokenForContext(tokenContext);
			throw new NodeOperationError(
				ctx.getNode(),
				'The LiveConnect session token expired while loading the list',
				{
					description:
						'Open the dropdown again: the node will issue a new token. If the error keeps happening, ' +
						'check the cKey and private key of the "LiveConnect API" credential.',
				},
			);
		}
		throw new NodeOperationError(
			ctx.getNode(),
			`LiveConnect did not return the list: ${response.status_message ?? 'error'} (status ${response.status})`,
		);
	}

	return response.data;
}

/** Same as `lcRequest`, but normalizing the response into rows for the selectors. */
async function lcList(
	ctx: ILoadOptionsFunctions,
	endpoint: string,
	method: 'GET' | 'POST' = 'GET',
	body?: IDataObject,
): Promise<IDataObject[]> {
	return pickRows(await lcRequest(ctx, endpoint, method, body));
}

/**
 * Rows from the response. Most listings return `data` as an array, but some nest it
 * (e.g. /direct/waba/getTemplates → `data.templates` + `paging`), so the first array
 * found inside the object is used.
 */
function pickRows(data: unknown): IDataObject[] {
	if (Array.isArray(data)) return data as IDataObject[];
	if (data === null || typeof data !== 'object') return [];

	const container = data as IDataObject;
	// Known keys first; if the API changes the name, falls back to the first array found.
	for (const key of ['templates', 'items', 'list', 'rows', 'results', 'data']) {
		if (Array.isArray(container[key])) return container[key] as IDataObject[];
	}
	for (const value of Object.values(container)) {
		if (Array.isArray(value)) return value as IDataObject[];
	}
	return [];
}

/** API rows → selector options, with the ID visible and sorted alphabetically in Spanish. */
function toOptions(
	rows: IDataObject[],
	labelKey = 'nombre',
	valueKey = 'id',
): INodePropertyOptions[] {
	return rows
		.filter((row) => row[valueKey] !== undefined && row[valueKey] !== null)
		.map((row) => {
			const value = row[valueKey] as string | number;
			const label = row[labelKey];
			const name =
				typeof label === 'string' && label.trim() !== '' ? `${label} (${value})` : `ID ${value}`;
			return { name, value };
		})
		.sort((a, b) => a.name.localeCompare(b.name, 'es'));
}

/**
 * EXACT path of the parameter each selector depends on, based on the currently open
 * resource and operation. Deliberately deterministic: n8n doesn't clear the values of
 * fields that become hidden when the operation changes, so looking for "the first
 * non-empty candidate" across several paths would return another operation's value.
 */
const DEPENDENCY_PATHS: Record<string, string> = {
	// id_pipeline → stages
	'crm.getStages.id_pipeline': 'id_pipeline',
	'deal.create.id_pipeline': 'id_pipeline',
	'deal.update.id_pipeline': 'updateFields.id_pipeline',
	// id_canal → WABA templates
	'waba.sendTemplate.id_canal': 'id_canal',
	'automation.create.id_canal': 'additionalFields.id_canal',
	'automation.update.id_canal': 'updateFields.id_canal',
};

function readParameter(
	ctx: ILoadOptionsFunctions,
	path: string,
	label: string,
): string | number | undefined {
	const value = ctx.getCurrentNodeParameter(path);
	if (value === undefined || value === null || value === '' || value === 0) return undefined;
	if (typeof value === 'string' && value.startsWith('=')) {
		// Expressions aren't resolved in the editor: the API can't be queried.
		throw new NodeOperationError(
			ctx.getNode(),
			`The list cannot be loaded while ${label} uses an expression`,
			{
				description:
					`Temporarily type a fixed value in ${label} to choose from the list, or also fill in ` +
					'this field with an expression.',
			},
		);
	}
	return value as string | number;
}

/**
 * Value of the parameter the selector depends on. Uses the exact path for the current
 * context and, if the context isn't mapped, falls back to the top-level path.
 */
function dependencyValue(
	ctx: ILoadOptionsFunctions,
	name: string,
	label: string,
): string | number | undefined {
	const resource = ctx.getCurrentNodeParameter('resource');
	const operation = ctx.getCurrentNodeParameter('operation');
	const mapped = DEPENDENCY_PATHS[`${String(resource)}.${String(operation)}.${name}`];
	return readParameter(ctx, mapped ?? name, label);
}

export async function getChannels(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
	return toOptions(await lcList(this, '/channels/list'));
}

/** Text to search for a channel's provider (`proveedor.tipo`, `proveedor.nombre`, name). */
function channelSignature(row: IDataObject): string {
	const proveedor = row.proveedor;
	const partes: string[] = [];
	if (proveedor !== null && typeof proveedor === 'object') {
		const p = proveedor as IDataObject;
		for (const key of ['tipo', 'nombre']) {
			if (typeof p[key] === 'string') partes.push(p[key] as string);
		}
	}
	if (typeof row.nombre === 'string') partes.push(row.nombre);
	return partes.join(' ').toLowerCase();
}

/**
 * Filters channels by provider. If none match (e.g. the API doesn't return `proveedor`
 * for this account) ALL of them are returned: a longer list is preferable to an empty
 * dropdown that blocks the user.
 */
function filterChannels(rows: IDataObject[], incluye: RegExp, excluye?: RegExp): IDataObject[] {
	const filtrados = rows.filter((row) => {
		const firma = channelSignature(row);
		if (!incluye.test(firma)) return false;
		return excluye === undefined || !excluye.test(firma);
	});
	return filtrados.length > 0 ? filtrados : rows;
}

/** WhatsApp Business API (WABA) channels, the only ones that send templates. */
export async function getWabaChannels(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
	const rows = await lcList(this, '/channels/list');
	return toOptions(filterChannels(rows, /waba|business|cloud|meta|gupshup|360dialog/));
}

/** WhatsApp QR channels (unofficial instances), excluding WABA ones. */
export async function getWhatsAppChannels(
	this: ILoadOptionsFunctions,
): Promise<INodePropertyOptions[]> {
	const rows = await lcList(this, '/channels/list');
	return toOptions(filterChannels(rows, /wapi|whatsapp|wa\b|qr/, /waba|business|cloud|gupshup/));
}

export async function getGroups(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
	return toOptions(await lcList(this, '/groups/list'));
}

export async function getUsers(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
	return toOptions(await lcList(this, '/users/list'));
}

export async function getPipelines(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
	return toOptions(await lcList(this, '/crm/getPipelines', 'POST', {}));
}

export async function getStages(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
	const idPipeline = dependencyValue(this, 'id_pipeline', 'the Pipeline');
	if (idPipeline === undefined) {
		throw new NodeOperationError(
			this.getNode(),
			'Select the Pipeline first to list its stages',
		);
	}
	return toOptions(await lcList(this, '/crm/getStages', 'POST', { id_pipeline: Number(idPipeline) }));
}

export async function getLeadOrigins(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
	return toOptions(await lcList(this, '/crm/getLeadOrigins', 'POST', {}));
}

export async function getLeadChannels(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
	return toOptions(await lcList(this, '/crm/getLeadChannels', 'POST', {}));
}

export async function getCategories(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
	return toOptions(await lcList(this, '/catalogue/listCategories'));
}

export async function getAssistants(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
	return toOptions(await lcList(this, '/assistant/listAssistant'));
}

/** Templates for the selected WABA channel. Its ID is a string (not an integer, unlike the rest). */
export async function getWabaTemplates(
	this: ILoadOptionsFunctions,
): Promise<INodePropertyOptions[]> {
	const idCanal = dependencyValue(this, 'id_canal', 'the Channel');
	if (idCanal === undefined) {
		throw new NodeOperationError(
			this.getNode(),
			'Select the Channel first to list its templates',
		);
	}
	const rows = await lcList(this, '/direct/waba/getTemplates', 'POST', {
		id_canal: Number(idCanal),
	});

	// The label states what needs to be filled in to send that template: how many
	// variables it asks for and whether it needs an image, video, or document header.
	return rows
		.filter((row) => row.id !== undefined && row.id !== null)
		.map((row) => {
			const estado = typeof row.status === 'string' ? row.status.toUpperCase() : '';
			// LiveConnect (Gupshup) calls it languageCode; Meta's format calls it language.
			const idioma = row.languageCode ?? row.language;
			const detalles = [
				typeof idioma === 'string' ? idioma : '',
				describeTemplateNeeds(row),
				estado !== '' && estado !== 'APPROVED' ? estado : '',
			]
				.filter((part) => part !== '')
				.join(' · ');
			const nombre = templateLabel(row);
			return {
				name: detalles !== '' ? `${nombre} · ${detalles}` : nombre,
				// The value encodes what the template needs so the node shows only the
				// fields that apply (see encodeTemplateValue).
				// The identifier depends on the channel's provider (see templateSendIdentifier).
				value: encodeTemplateValue(
					templateSendIdentifier(row) ?? String(row.id),
					countBodyVariables(row),
					buildTemplateLayout(row).headerFormat,
				),
				// Approved ones first: they're the only ones that can be sent.
				aprobada: estado === '' || estado === 'APPROVED',
			};
		})
		.sort((a, b) => {
			if (a.aprobada !== b.aprobada) return a.aprobada ? -1 : 1;
			return a.name.localeCompare(b.name, 'es');
		})
		.map(({ name, value }) => ({ name, value }));
}

/** Body and text-header variables that need to be filled in. */
function countBodyVariables(row: IDataObject): number {
	return buildTemplateLayout(row).fields.filter(
		(f) =>
			f.id.startsWith('body_') || (f.id.startsWith('header_') && !f.id.startsWith('header_media')),
	).length;
}

/** Summary of what the template requires: "2 variables · image · button". */
function describeTemplateNeeds(row: IDataObject): string {
	const { fields, headerFormat } = buildTemplateLayout(row);
	const partes: string[] = [];

	const variables = countBodyVariables(row);
	if (variables > 0) partes.push(variables === 1 ? '1 variable' : `${variables} variables`);

	if (headerFormat === 'IMAGE') partes.push('image');
	else if (headerFormat === 'VIDEO') partes.push('video');
	else if (headerFormat === 'DOCUMENT') partes.push('document');

	const botones = fields.filter((f) => f.id.startsWith('button_')).length;
	if (botones > 0) partes.push(botones === 1 ? 'button' : `${botones} buttons`);

	if (partes.length === 0) return 'no variables';
	return partes.join(' · ');
}

/**
 * Meta identifiers like `667058365993373_67d4976c2921a_6360`, or UUIDs: they're
 * technically a "name" but say nothing, so the content is preferred instead.
 */
function esIdentificadorOpaco(value: string): boolean {
	return (
		/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value) ||
		/^[0-9a-f]{6,}(_[0-9a-f]{4,}){1,}$/i.test(value) ||
		/^\d{8,}$/.test(value)
	);
}

/** First readable text for a template: name, alias, or its content. */
function templateLabel(row: IDataObject): string {
	const opacos: string[] = [];
	for (const key of ['name', 'nombre', 'templateName', 'elementName', 'title', 'alias']) {
		const value = row[key];
		if (typeof value === 'string' && value.trim() !== '') {
			const limpio = value.trim();
			if (esIdentificadorOpaco(limpio)) {
				opacos.push(limpio);
				continue;
			}
			return limpio;
		}
	}

	// Only opaque identifiers are available: better to show the content if it exists.
	const cuerpo = parseTemplateBody(row.data);
	if (cuerpo !== undefined) {
		const limpio = cuerpo.replace(/\s+/g, ' ').trim();
		if (limpio !== '') return limpio.length > 60 ? `${limpio.slice(0, 60)}…` : limpio;
	}
	if (opacos.length > 0) return opacos[0];

	// Some accounts deliver the content in `data` (plain text or serialized JSON).
	const contenido = parseTemplateBody(row.data);
	if (contenido !== undefined) {
		const limpio = contenido.replace(/\s+/g, ' ').trim();
		if (limpio !== '') return limpio.length > 60 ? `${limpio.slice(0, 60)}…` : limpio;
	}

	return `ID ${String(row.id)}`;
}

function parseTemplateBody(data: unknown): string | undefined {
	if (typeof data !== 'string' || data.trim() === '') return undefined;
	try {
		const parsed = JSON.parse(data) as IDataObject | string;
		if (typeof parsed === 'string') return parsed;
		for (const key of ['name', 'nombre', 'body', 'text', 'texto']) {
			const value = (parsed as IDataObject)[key];
			if (typeof value === 'string' && value.trim() !== '') return value;
		}
		return undefined;
	} catch {
		// Wasn't JSON: the text is used as-is.
		return data;
	}
}

/**
 * A specific WABA template, raw. Used by the "Send Template" preSend to find out
 * what the template needs before sending it.
 */
export async function fetchTemplate(
	ctx: ILoadOptionsFunctions,
	idCanal: number,
	idPlantilla: string,
): Promise<IDataObject | undefined> {
	const data = await lcRequest(ctx, '/direct/waba/getTemplate', 'POST', {
		id_canal: idCanal,
		id: idPlantilla,
	});
	const template = Array.isArray(data) ? data[0] : data;
	return template !== null && typeof template === 'object' ? (template as IDataObject) : undefined;
}

/** Methods ready for the `methods.loadOptions` block of each node. */
export const liveConnectLoadOptions = {
	getAssistants,
	getCategories,
	getChannels,
	getGroups,
	getLeadChannels,
	getLeadOrigins,
	getPipelines,
	getStages,
	getUsers,
	getWabaChannels,
	getWabaTemplates,
	getWhatsAppChannels,
};
