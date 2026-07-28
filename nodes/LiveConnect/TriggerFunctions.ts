import { createHash, randomUUID, timingSafeEqual } from 'crypto';

import type { IDataObject, IHookFunctions, IWebhookFunctions } from 'n8n-workflow';

import type { LcTokenContext } from './GenericFunctions';
import {
	ensureFreshToken,
	LC_CREDENTIALS,
	LIVECONNECT_BASE_URL,
	LIVECONNECT_TOKEN_HEADER,
} from './GenericFunctions';

/** Standard API envelope: { status, status_message, data }. status < 0 = error even with HTTP 200. */
export interface LcEnvelope {
	status?: number;
	status_message?: string;
	data?: IDataObject | IDataObject[] | string | null;
}

/** Authenticated POST (JWT PageGearToken via credential) used by the Proxy Trigger's webhookMethods. */
export async function lcHookRequest(
	this: IHookFunctions,
	endpoint: string,
	body: IDataObject,
): Promise<LcEnvelope> {
	// webhookMethods don't go through the node's preSend either: a valid token is
	// seeded here so webhooks aren't registered/removed with an already-expired JWT.
	const token = await ensureFreshToken(this as unknown as LcTokenContext);
	return (await this.helpers.httpRequestWithAuthentication.call(this, LC_CREDENTIALS.name, {
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
 * LiveConnect sends the secret in the query (?secret=) and in the `secret` header
 * (user-agent PageGear-Lambda-Hook). Either one is accepted.
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

/** Priority: inputs.id → chat.contacto.id → chat.id → hash(id_canal + fecha_ini). */
export function resolveSessionId(
	chat: IDataObject | undefined,
	inputs: IDataObject | undefined,
): string {
	if (typeof inputs?.id === 'string' && inputs.id !== '') return inputs.id;
	const contacto = asObject(chat?.contacto);
	if (typeof contacto?.id === 'string' && contacto.id !== '') return contacto.id;
	if (typeof chat?.id === 'string' && chat.id !== '') return chat.id;
	// With NO identifier at all (malformed payload): a random id per event —
	// hashing absent fields would be constant and would mix up different conversations.
	if (chat?.id_canal === undefined && chat?.fecha_ini === undefined) return randomUUID();
	return createHash('sha256')
		.update(`${chat?.id_canal ?? ''}:${chat?.fecha_ini ?? ''}`)
		.digest('hex')
		.slice(0, 20);
}

/** chat.usuarios is an OBJECT indexed by id (not an array). Human = any entry with isbot === 0. */
export function hasHumanAgent(usuarios: unknown): boolean {
	const map = asObject(usuarios);
	if (map === undefined) return false;
	return Object.values(map).some(
		(u) => u !== null && typeof u === 'object' && (u as IDataObject).isbot === 0,
	);
}

/**
 * Simplified form of the Flowbot callback. On the first turn userInput arrives
 * empty and the actual greeting comes in inputs.mensaje_inicial. A later turn with no
 * text but WITH an attachment (userFile) isn't confused with the first turn; an empty
 * turn with no attachment is indistinguishable from the first one (a limitation of the
 * API's contract).
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
		message: userInput !== '' ? userInput : tieneAdjunto ? '' : mensajeInicial,
		sessionId: resolveSessionId(chat, inputs),
		isFirstTurn: esPrimerTurno,
		hasAttachment: tieneAdjunto,
		userFile,
		hasHumanAgent: hasHumanAgent(chat.usuarios),
		conversationId: typeof chat.id === 'string' ? chat.id : null,
		channelId: typeof chat.id_canal === 'number' ? chat.id_canal : null,
		contact: asObject(chat.contacto) ?? {},
		inputs,
		intent: asObject(body.intent) ?? {},
		raw: body,
	};
}

/**
 * The payload of the proxy notifications isn't documented in the spec.
 * If it has the known shape {chat, inputs, userInput} it's simplified with guards;
 * any other shape is delivered raw.
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
		message: userInput !== undefined && userInput !== '' ? userInput : mensajeInicial,
		sessionId: resolveSessionId(chat, inputs),
		conversationId: typeof chat?.id === 'string' ? chat.id : null,
		channelId: typeof chat?.id_canal === 'number' ? chat.id_canal : null,
		contact: asObject(chat?.contacto) ?? {},
		inputs: inputs ?? {},
		raw: body,
	};
}
