import type { IDataObject, ILoadOptionsFunctions, INodePropertyOptions } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

import { buildTemplateLayout } from './TemplateFields';

import type { LcTokenContext } from './GenericFunctions';
import {
	burnTokenForContext,
	ensureFreshToken,
	LIVECONNECT_BASE_URL,
	LIVECONNECT_CREDENTIALS_NAME,
	LIVECONNECT_TOKEN_HEADER,
} from './GenericFunctions';

/**
 * Llama un endpoint del API y devuelve `data` en crudo.
 * Valida el envelope estándar: `status < 0` es error aun con HTTP 200.
 */
async function lcRequest(
	ctx: ILoadOptionsFunctions,
	endpoint: string,
	method: 'GET' | 'POST' = 'GET',
	body?: IDataObject,
): Promise<unknown> {
	let response: { status?: number; status_message?: string; data?: unknown };

	// Los selectores NO pasan por el preSend del nodo, así que el token de la credencial
	// puede estar vencido (el API lo reporta como HTTP 200 con status -403). Se siembra
	// uno vigente; `authenticate` respeta el header ya presente.
	const tokenContext = ctx as unknown as LcTokenContext;
	const token = await ensureFreshToken(tokenContext);

	try {
		response = (await ctx.helpers.httpRequestWithAuthentication.call(
			ctx,
			LIVECONNECT_CREDENTIALS_NAME,
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
			'No se pudo cargar la lista desde LiveConnect',
			{
				description:
					'Verifica que la credencial "LiveConnect API" esté configurada y que la cuenta tenga ' +
					`acceso a ${endpoint}. Detalle: ${(error as Error).message ?? 'error desconocido'}`,
			},
		);
	}

	if (typeof response.status === 'number' && response.status < 0) {
		if (response.status === -403) {
			// Token rechazado pese a la renovación: se quema para que el siguiente intento
			// emita uno nuevo en vez de repetir el mismo error.
			await burnTokenForContext(tokenContext);
			throw new NodeOperationError(
				ctx.getNode(),
				'El token de sesión de LiveConnect expiró al cargar la lista',
				{
					description:
						'Vuelve a abrir el desplegable: el nodo emitirá un token nuevo. Si el error se repite, ' +
						'revisa la cKey y la clave privada de la credencial "LiveConnect API".',
				},
			);
		}
		throw new NodeOperationError(
			ctx.getNode(),
			`LiveConnect no devolvió la lista: ${response.status_message ?? 'error'} (status ${response.status})`,
		);
	}

	return response.data;
}

/** Igual que `lcRequest`, pero normalizando la respuesta a filas para los selectores. */
async function lcList(
	ctx: ILoadOptionsFunctions,
	endpoint: string,
	method: 'GET' | 'POST' = 'GET',
	body?: IDataObject,
): Promise<IDataObject[]> {
	return pickRows(await lcRequest(ctx, endpoint, method, body));
}

/**
 * Filas de la respuesta. La mayoría de listados devuelve `data` como array, pero
 * algunos lo anidan (p. ej. /direct/waba/getTemplates → `data.templates` + `paging`),
 * así que se busca el primer array dentro del objeto.
 */
function pickRows(data: unknown): IDataObject[] {
	if (Array.isArray(data)) return data as IDataObject[];
	if (data === null || typeof data !== 'object') return [];

	const container = data as IDataObject;
	// Claves conocidas primero; si el API cambia el nombre, cae al primer array que haya.
	for (const key of ['templates', 'items', 'list', 'rows', 'results', 'data']) {
		if (Array.isArray(container[key])) return container[key] as IDataObject[];
	}
	for (const value of Object.values(container)) {
		if (Array.isArray(value)) return value as IDataObject[];
	}
	return [];
}

/** Filas del API → opciones del selector, con el ID visible y orden alfabético español. */
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
 * Ruta EXACTA del parámetro del que depende cada selector, según el recurso y la
 * operación abiertos. Es determinista a propósito: n8n no limpia los valores de los
 * campos que quedan ocultos al cambiar de operación, así que buscar "el primer
 * candidato no vacío" entre varias rutas devolvería el valor de otra operación.
 */
const DEPENDENCY_PATHS: Record<string, string> = {
	// id_pipeline → etapas
	'crm.getStages.id_pipeline': 'id_pipeline',
	'deal.create.id_pipeline': 'id_pipeline',
	'deal.update.id_pipeline': 'updateFields.id_pipeline',
	// id_canal → plantillas WABA
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
		// En el editor las expresiones no están resueltas: no se puede consultar el API.
		throw new NodeOperationError(
			ctx.getNode(),
			`No se puede cargar la lista mientras ${label} use una expresión`,
			{
				description:
					`Escribe temporalmente un valor fijo en ${label} para elegir de la lista, o rellena ` +
					'este campo también con una expresión.',
			},
		);
	}
	return value as string | number;
}

/**
 * Valor del parámetro del que depende el selector. Usa la ruta exacta del contexto
 * actual y, si el contexto no está mapeado, cae a la ruta top-level.
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

/** Texto donde buscar el proveedor de un canal (`proveedor.tipo`, `proveedor.nombre`, nombre). */
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
 * Filtra los canales por proveedor. Si ninguno coincide (p. ej. el API no devuelve
 * `proveedor` en esta cuenta) se devuelven TODOS: es preferible una lista de más a un
 * desplegable vacío que bloquee al usuario.
 */
function filterChannels(rows: IDataObject[], incluye: RegExp, excluye?: RegExp): IDataObject[] {
	const filtrados = rows.filter((row) => {
		const firma = channelSignature(row);
		if (!incluye.test(firma)) return false;
		return excluye === undefined || !excluye.test(firma);
	});
	return filtrados.length > 0 ? filtrados : rows;
}

/** Canales de WhatsApp Business API (WABA), los únicos que envían plantillas. */
export async function getWabaChannels(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
	const rows = await lcList(this, '/channels/list');
	return toOptions(filterChannels(rows, /waba|business|cloud|meta|gupshup|360dialog/));
}

/** Canales de WhatsApp QR (instancias no oficiales), excluyendo los WABA. */
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
	const idPipeline = dependencyValue(this, 'id_pipeline', 'el Pipeline');
	if (idPipeline === undefined) {
		throw new NodeOperationError(
			this.getNode(),
			'Selecciona primero el Pipeline para poder listar sus etapas',
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

/** Plantillas del canal WABA seleccionado. Su ID es string (no entero, como el resto). */
export async function getWabaTemplates(
	this: ILoadOptionsFunctions,
): Promise<INodePropertyOptions[]> {
	const idCanal = dependencyValue(this, 'id_canal', 'el Canal');
	if (idCanal === undefined) {
		throw new NodeOperationError(
			this.getNode(),
			'Selecciona primero el Canal para poder listar sus plantillas',
		);
	}
	const rows = await lcList(this, '/direct/waba/getTemplates', 'POST', {
		id_canal: Number(idCanal),
	});

	// La etiqueta dice lo que hay que rellenar para enviar esa plantilla: cuántas
	// variables pide y si necesita imagen, video o documento en el encabezado.
	return rows
		.filter((row) => row.id !== undefined && row.id !== null)
		.map((row) => {
			const estado = typeof row.status === 'string' ? row.status.toUpperCase() : '';
			const detalles = [
				typeof row.language === 'string' ? row.language : '',
				describeTemplateNeeds(row),
				estado !== '' && estado !== 'APPROVED' ? estado : '',
			]
				.filter((part) => part !== '')
				.join(' · ');
			const nombre = templateLabel(row);
			return {
				name: detalles !== '' ? `${nombre} · ${detalles}` : nombre,
				value: row.id as string | number,
				// Las aprobadas primero: son las únicas que se pueden enviar.
				aprobada: estado === '' || estado === 'APPROVED',
			};
		})
		.sort((a, b) => {
			if (a.aprobada !== b.aprobada) return a.aprobada ? -1 : 1;
			return a.name.localeCompare(b.name, 'es');
		})
		.map(({ name, value }) => ({ name, value }));
}

/** Resumen de lo que la plantilla exige: "2 variables · imagen · botón". */
function describeTemplateNeeds(row: IDataObject): string {
	const { fields, headerFormat } = buildTemplateLayout(row);
	const partes: string[] = [];

	const variables = fields.filter(
		(f) => f.id.startsWith('body_') || (f.id.startsWith('header_') && !f.id.startsWith('header_media')),
	).length;
	if (variables > 0) partes.push(variables === 1 ? '1 variable' : `${variables} variables`);

	if (headerFormat === 'IMAGE') partes.push('imagen');
	else if (headerFormat === 'VIDEO') partes.push('video');
	else if (headerFormat === 'DOCUMENT') partes.push('documento');

	const botones = fields.filter((f) => f.id.startsWith('button_')).length;
	if (botones > 0) partes.push(botones === 1 ? 'botón' : `${botones} botones`);

	if (partes.length === 0) return 'sin variables';
	return partes.join(' · ');
}

/**
 * Identificadores de Meta del tipo `667058365993373_67d4976c2921a_6360` o UUIDs: son
 * técnicamente un "nombre" pero no dicen nada, así que se prefiere el contenido.
 */
function esIdentificadorOpaco(value: string): boolean {
	return (
		/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value) ||
		/^[0-9a-f]{6,}(_[0-9a-f]{4,}){1,}$/i.test(value) ||
		/^\d{8,}$/.test(value)
	);
}

/** Primer texto legible de una plantilla: nombre, alias o su contenido. */
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

	// Solo hay identificadores opacos: mejor mostrar el contenido si existe.
	const cuerpo = parseTemplateBody(row.data);
	if (cuerpo !== undefined) {
		const limpio = cuerpo.replace(/\s+/g, ' ').trim();
		if (limpio !== '') return limpio.length > 60 ? `${limpio.slice(0, 60)}…` : limpio;
	}
	if (opacos.length > 0) return opacos[0];

	// Algunas cuentas entregan el contenido en `data` (texto plano o JSON serializado).
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
		// No era JSON: se usa el texto tal cual.
		return data;
	}
}

/**
 * Plantilla WABA concreta, en crudo. La usa el preSend de "Enviar Plantilla" para saber
 * qué necesita la plantilla antes de enviarla.
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

/** Métodos listos para el bloque `methods.loadOptions` de cada nodo. */
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
