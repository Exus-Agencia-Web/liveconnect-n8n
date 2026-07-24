import type {
	IAuthenticateGeneric,
	ICredentialDataDecryptedObject,
	ICredentialTestRequest,
	ICredentialType,
	IHttpRequestHelper,
	INodeProperties,
} from 'n8n-workflow';

import { LIVECONNECT_BASE_URL } from '../nodes/LiveConnect/GenericFunctions';

export class LiveConnectApi implements ICredentialType {
	name = 'liveConnectApi';

	displayName = 'LiveConnect API';

	documentationUrl = 'https://cdn.liveconnect.chat/liveconnect/public-openapi.json';

	properties: INodeProperties[] = [
		{
			displayName: 'Account Key (cKey)',
			name: 'cKey',
			type: 'string',
			typeOptions: { password: true },
			default: '',
			required: true,
			description: 'Hash de la cuenta LiveConnect',
		},
		{
			displayName: 'Private Key',
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
		let response: {
			status?: number;
			status_message?: string;
			data?: { token?: string } | string;
			PageGearToken?: string;
		};

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
			})) as typeof response;
		} catch (error) {
			throw new Error(
				'LiveConnect rechazó las credenciales (¿cKey o privateKey inválidos?). Respuesta del API: ' +
					((error as Error).message ?? 'error desconocido'),
			);
		}

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

		return { sessionToken: token };
	}

	authenticate: IAuthenticateGeneric = {
		type: 'generic',
		properties: {
			headers: {
				PageGearToken: '={{$credentials.sessionToken}}',
			},
		},
	};

	test: ICredentialTestRequest = {
		request: {
			baseURL: LIVECONNECT_BASE_URL,
			url: '/channels/list',
			method: 'GET',
		},
	};
}
