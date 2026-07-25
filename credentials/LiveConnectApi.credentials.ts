import type {
	IAuthenticate,
	ICredentialDataDecryptedObject,
	ICredentialTestRequest,
	ICredentialType,
	IHttpRequestHelper,
	INodeProperties,
} from 'n8n-workflow';

import type { LcTokenResponse } from '../nodes/LiveConnect/GenericFunctions';
import {
	extractSessionToken,
	LIVECONNECT_BASE_URL,
	LIVECONNECT_TOKEN_HEADER,
} from '../nodes/LiveConnect/GenericFunctions';

export class LiveConnectApi implements ICredentialType {
	name = 'liveConnectApi';

	displayName = 'LiveConnect API';

	documentationUrl = 'https://cdn.liveconnect.chat/liveconnect/public-openapi.json';

	properties: INodeProperties[] = [
		{
			displayName: 'Clave de Cuenta (cKey)',
			name: 'cKey',
			type: 'string',
			typeOptions: { password: true },
			default: '',
			required: true,
			description: 'Hash de la cuenta LiveConnect',
		},
		{
			displayName: 'Clave Privada (privateKey)',
			name: 'privateKey',
			type: 'string',
			typeOptions: { password: true },
			default: '',
			required: true,
			description: 'Clave privada de la cuenta LiveConnect',
		},
		{
			displayName: 'Session Token',
			name: 'sessionToken',
			type: 'hidden',
			typeOptions: { expirable: true },
			default: '',
		},
	];

	// POST /account/token {cKey, privateKey} emite el JWT de sesión. Según el caso el
	// API lo entrega en `data.token` o en el campo raíz `PageGearToken` del body.
	// Con credenciales inválidas responde 404 (texto plano); con keys faltantes
	// responde 200 con `status < 0` y un JWT anónimo que NO sirve como sesión.
	// n8n re-ejecuta esto automáticamente ante un 401 (sessionToken es `expirable`).
	async preAuthentication(this: IHttpRequestHelper, credentials: ICredentialDataDecryptedObject) {
		let response: LcTokenResponse;

		try {
			response = (await this.helpers.httpRequest({
				method: 'POST',
				url: `${LIVECONNECT_BASE_URL}/account/token`,
				body: {
					cKey: credentials.cKey,
					privateKey: credentials.privateKey,
				},
				json: true,
				timeout: 10000,
			})) as LcTokenResponse;
		} catch (error) {
			throw new Error(
				'LiveConnect rechazó las credenciales (¿cKey o privateKey inválidos?). Respuesta del API: ' +
					((error as Error).message ?? 'error desconocido'),
			);
		}

		// Valida status < 0 antes de leer el token (el API devuelve un JWT anónimo
		// inservible junto a las respuestas de error).
		return { sessionToken: extractSessionToken(response) };
	}

	// Forma de FUNCIÓN (no IAuthenticateGeneric) a propósito: n8n aplica `authenticate`
	// DESPUÉS de los preSend del routing, y la forma genérica pisa el header sin
	// condición. `refreshTokenIfExpired` siembra aquí un token recién emitido cuando el
	// de la credencial ya venció; si no hay nada sembrado se usa el de la credencial.
	authenticate: IAuthenticate = async (credentials, requestOptions) => {
		const headers = { ...requestOptions.headers };
		const seeded = headers[LIVECONNECT_TOKEN_HEADER];
		if (typeof seeded !== 'string' || seeded === '') {
			headers[LIVECONNECT_TOKEN_HEADER] = (credentials.sessionToken as string) ?? '';
		}
		return { ...requestOptions, headers };
	};

	test: ICredentialTestRequest = {
		request: {
			baseURL: LIVECONNECT_BASE_URL,
			url: '/channels/list',
			method: 'GET',
		},
		// El tester de n8n solo falla ante HTTP no-2xx; LiveConnect responde 200 con
		// status negativo, así que sin estas reglas diría "Connection successful!".
		rules: [
			{
				type: 'responseSuccessBody',
				properties: {
					key: 'status',
					value: -403,
					message: 'Token de sesión inválido: revisa la cKey y la clave privada',
				},
			},
			{
				type: 'responseSuccessBody',
				properties: {
					key: 'status',
					value: -2,
					message: 'Faltan la cKey o la clave privada en la credencial',
				},
			},
		],
	};
}
