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

	// POST /account/token {cKey, privateKey} -> data.token (JWT). n8n re-runs this
	// automatically when a request fails with 401 (sessionToken is `expirable`).
	async preAuthentication(this: IHttpRequestHelper, credentials: ICredentialDataDecryptedObject) {
		const response = (await this.helpers.httpRequest({
			method: 'POST',
			url: `${LIVECONNECT_BASE_URL}/account/token`,
			body: {
				cKey: credentials.cKey,
				privateKey: credentials.privateKey,
			},
			json: true,
			timeout: 10000,
		})) as { data?: { token?: string } | string };

		const token =
			typeof response.data === 'string' ? response.data : (response.data?.token ?? undefined);

		if (!token) {
			throw new Error(
				'LiveConnect no devolvió un token de sesión. Verifica cKey y privateKey.',
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
