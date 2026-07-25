import type { IDataObject, ILoadOptionsFunctions, INodePropertyOptions } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

import { LIVECONNECT_BASE_URL, LIVECONNECT_CREDENTIALS_NAME } from './GenericFunctions';

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

	try {
		response = (await ctx.helpers.httpRequestWithAuthentication.call(
			ctx,
			LIVECONNECT_CREDENTIALS_NAME,
			{
				method,
				url: `${LIVECONNECT_BASE_URL}${endpoint}`,
				...(body !== undefined ? { body } : {}),
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
		throw new NodeOperationError(
			ctx.getNode(),
			`LiveConnect no devolvió la lista: ${response.status_message ?? 'error'} (status ${response.status})`,
		);
	}

	return Array.isArray(response.data) ? (response.data as IDataObject[]) : [];
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
	return toOptions(rows, 'name', 'id');
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
