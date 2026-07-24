import type {
	IDataObject,
	IExecuteSingleFunctions,
	IN8nHttpFullResponse,
	INodeExecutionData,
	JsonObject,
} from 'n8n-workflow';
import { NodeApiError } from 'n8n-workflow';

export const LIVECONNECT_BASE_URL = 'https://api.liveconnect.chat/prod';

/**
 * postReceive compartido por todas las operaciones.
 *
 * La API de LiveConnect responde siempre `{ status, status_message, data }`:
 * `status > 0` es éxito y `status < 0` es error (aún con HTTP 200).
 * - Lanza NodeApiError cuando `status < 0`.
 * - Si "Return Full Response" está apagado (default), devuelve solo `data`
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
		throw new NodeApiError(this.getNode(), body as JsonObject, {
			message: (body.status_message as string) || 'LiveConnect API error',
			description: `LiveConnect devolvió status ${status}`,
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
