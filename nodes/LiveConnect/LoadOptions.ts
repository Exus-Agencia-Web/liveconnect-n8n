import type { IDataObject, ILoadOptionsFunctions, INodePropertyOptions } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

import type { LcTokenContext } from './GenericFunctions';
import {
	burnTokenForContext,
	ensureFreshToken,
	LIVECONNECT_BASE_URL,
	LIVECONNECT_CREDENTIALS_NAME,
	LIVECONNECT_TOKEN_HEADER,
} from './GenericFunctions';

/**
 * Llama un endpoint de listado del API para alimentar un selector.
 * Valida el envelope estándar: `status < 0` es error aun con HTTP 200.
 */
async function lcList(
	ctx: ILoadOptionsFunctions,
	endpoint: string,
	method: 'GET' | 'POST' = 'GET',
	body?: IDataObject,
): Promise<IDataObject[]> {
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

	return pickRows(response.data);
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

	// El ID de una plantilla WABA es un número largo poco legible: se etiqueta con el
	// nombre, el idioma y el estado (solo las aprobadas se pueden enviar).
	return rows
		.filter((row) => row.id !== undefined && row.id !== null)
		.map((row) => {
			const nombre =
				typeof row.name === 'string' && row.name.trim() !== '' ? row.name : `ID ${row.id}`;
			const idioma = typeof row.language === 'string' && row.language !== '' ? row.language : '';
			const estado = typeof row.status === 'string' ? row.status.toUpperCase() : '';
			const detalles = [idioma, estado !== 'APPROVED' && estado !== '' ? estado : '']
				.filter((part) => part !== '')
				.join(' · ');
			return {
				name: detalles !== '' ? `${nombre} (${detalles})` : nombre,
				value: row.id as string | number,
			};
		})
		.sort((a, b) => a.name.localeCompare(b.name, 'es'));
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
	getWabaTemplates,
};
