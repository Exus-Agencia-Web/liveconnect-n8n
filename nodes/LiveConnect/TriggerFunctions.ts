import { createHash, randomUUID, timingSafeEqual } from 'crypto';

import type { IDataObject, IHookFunctions, IWebhookFunctions } from 'n8n-workflow';

import type { LcTokenContext } from './GenericFunctions';
import {
	ensureFreshToken,
	LIVECONNECT_BASE_URL,
	LIVECONNECT_TOKEN_HEADER,
} from './GenericFunctions';

/** Envelope estándar del API: { status, status_message, data }. status < 0 = error aun con HTTP 200. */
export interface LcEnvelope {
	status?: number;
	status_message?: string;
	data?: IDataObject | IDataObject[] | string | null;
}

/** POST autenticado (JWT PageGearToken vía credencial) usado por los webhookMethods del Proxy Trigger. */
export async function lcHookRequest(
	this: IHookFunctions,
	endpoint: string,
	body: IDataObject,
): Promise<LcEnvelope> {
	// Los webhookMethods tampoco pasan por el preSend del nodo: se siembra un token
	// vigente para no registrar/eliminar webhooks con un JWT ya vencido.
	const token = await ensureFreshToken(this as unknown as LcTokenContext);
	return (await this.helpers.httpRequestWithAuthentication.call(this, 'liveConnectApi', {
		method: 'POST',
		url: `${LIVECONNECT_BASE_URL}${endpoint}`,
		body,
		...(token !== undefined ? { headers: { [LIVECONNECT_TOKEN_HEADER]: token } } : {}),
		json: true,
	})) as LcEnvelope;
}

export function asObject(value: unknown): IDataObject | undefined {
	if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
		return value as IDataObject;
	}
	return undefined;
}

function secretEquals(received: string, expected: string): boolean {
	const a = Buffer.from(received);
	const b = Buffer.from(expected);
	if (a.length !== b.length) return false;
	return timingSafeEqual(a, b);
}

/**
 * LiveConnect envía el secret en la query (?secret=) y en el header `secret`
 * (user-agent PageGear-Lambda-Hook). Se acepta cualquiera de los dos.
 */
export function requestSecretIsValid(ctx: IWebhookFunctions, expected: string): boolean {
	const query = ctx.getQueryData() as IDataObject;
	const headerSecret = (ctx.getHeaderData() as IDataObject).secret;
	const candidates: Array<string | undefined> = [
		typeof query.secret === 'string' ? query.secret : undefined,
		typeof headerSecret === 'string'
			? headerSecret
			: Array.isArray(headerSecret)
				? (headerSecret[0] as string | undefined)
				: undefined,
	];
	return candidates.some((c) => c !== undefined && secretEquals(c, expected));
}

/** Prioridad: inputs.id → chat.contacto.id → chat.id → hash(id_canal + fecha_ini). */
export function resolveSessionId(
	chat: IDataObject | undefined,
	inputs: IDataObject | undefined,
): string {
	if (typeof inputs?.id === 'string' && inputs.id !== '') return inputs.id;
	const contacto = asObject(chat?.contacto);
	if (typeof contacto?.id === 'string' && contacto.id !== '') return contacto.id;
	if (typeof chat?.id === 'string' && chat.id !== '') return chat.id;
	// Sin NINGÚN identificador (payload malformado): id aleatorio por evento —
	// un hash de campos ausentes sería constante y mezclaría conversaciones distintas.
	if (chat?.id_canal === undefined && chat?.fecha_ini === undefined) return randomUUID();
	return createHash('sha256')
		.update(`${chat?.id_canal ?? ''}:${chat?.fecha_ini ?? ''}`)
		.digest('hex')
		.slice(0, 20);
}

/** chat.usuarios es OBJETO indexado por id (no array). Humano = alguna entrada con isbot === 0. */
export function hasHumanAgent(usuarios: unknown): boolean {
	const map = asObject(usuarios);
	if (map === undefined) return false;
	return Object.values(map).some(
		(u) => u !== null && typeof u === 'object' && (u as IDataObject).isbot === 0,
	);
}

/**
 * Forma simplificada del callback del Flowbot. En el primer turno userInput llega
 * vacío y el saludo real viene en inputs.mensaje_inicial. Un turno posterior sin
 * texto pero CON adjunto (userFile) no se confunde con el primer turno; un turno
 * vacío sin adjunto es indistinguible del primero (limitación del contrato del API).
 */
export function simplifyCallbackEvent(body: IDataObject): IDataObject {
	const chat = asObject(body.chat) ?? {};
	const inputs = asObject(body.inputs) ?? {};
	const userInput = typeof body.userInput === 'string' ? body.userInput : '';
	const userFile = asObject(body.userFile) ?? {};
	const tieneAdjunto = Object.keys(userFile).length > 0;
	const esPrimerTurno = userInput === '' && !tieneAdjunto;
	const mensajeInicial = typeof inputs.mensaje_inicial === 'string' ? inputs.mensaje_inicial : '';
	return {
		mensaje: userInput !== '' ? userInput : tieneAdjunto ? '' : mensajeInicial,
		sessionId: resolveSessionId(chat, inputs),
		esPrimerTurno,
		tieneAdjunto,
		userFile,
		hayAgenteHumano: hasHumanAgent(chat.usuarios),
		id_conversacion: typeof chat.id === 'string' ? chat.id : null,
		id_canal: typeof chat.id_canal === 'number' ? chat.id_canal : null,
		contacto: asObject(chat.contacto) ?? {},
		inputs,
		intent: asObject(body.intent) ?? {},
		raw: body,
	};
}

/**
 * El payload de las notificaciones del proxy no está documentado en el spec.
 * Si trae la forma conocida {chat, inputs, userInput} se simplifica con guardas;
 * cualquier otra forma se entrega cruda.
 */
export function simplifyProxyEvent(body: IDataObject): IDataObject {
	const chat = asObject(body.chat);
	const inputs = asObject(body.inputs);
	const userInput = typeof body.userInput === 'string' ? body.userInput : undefined;
	if (chat === undefined && inputs === undefined && userInput === undefined) {
		return body;
	}
	const mensajeInicial = typeof inputs?.mensaje_inicial === 'string' ? inputs.mensaje_inicial : '';
	return {
		mensaje: userInput !== undefined && userInput !== '' ? userInput : mensajeInicial,
		sessionId: resolveSessionId(chat, inputs),
		id_conversacion: typeof chat?.id === 'string' ? chat.id : null,
		id_canal: typeof chat?.id_canal === 'number' ? chat.id_canal : null,
		contacto: asObject(chat?.contacto) ?? {},
		inputs: inputs ?? {},
		raw: body,
	};
}
