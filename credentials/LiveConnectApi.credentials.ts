import type {
	IAuthenticate,
	Icon,
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

	// Same icon as the nodes: dist/credentials/ and dist/nodes/LiveConnect/ are
	// siblings under dist/, hence the "../" (gulpfile.js copies both svg files as-is).
	icon: Icon = {
		light: 'file:../nodes/LiveConnect/liveconnect2.svg',
		dark: 'file:../nodes/LiveConnect/liveconnect2.dark.svg',
	};

	documentationUrl = 'https://cdn.liveconnect.chat/liveconnect/public-openapi.json';

	properties: INodeProperties[] = [
		{
			displayName: 'Account Key (cKey)',
			name: 'cKey',
			type: 'string',
			typeOptions: { password: true },
			default: '',
			required: true,
			description: 'LiveConnect account hash',
		},
		{
			displayName: 'Private Key (privateKey)',
			name: 'privateKey',
			type: 'string',
			typeOptions: { password: true },
			default: '',
			required: true,
			description: 'LiveConnect account private key',
		},
		{
			displayName: 'Session Token',
			name: 'sessionToken',
			type: 'hidden',
			typeOptions: { expirable: true, password: true },
			default: '',
		},
	];

	// POST /account/token {cKey, privateKey} issues the session JWT. Depending on the
	// case, the API delivers it in `data.token` or in the root `PageGearToken` field
	// of the body. With invalid credentials it responds 404 (plain text); with missing
	// keys it responds 200 with `status < 0` and an anonymous JWT that does NOT work
	// as a session. n8n re-runs this automatically on a 401 (sessionToken is `expirable`).
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
				'LiveConnect rejected the credentials (invalid cKey or privateKey?). API response: ' +
					((error as Error).message ?? 'unknown error'),
			);
		}

		// Validates status < 0 before reading the token (the API returns a useless
		// anonymous JWT alongside its error responses).
		return { sessionToken: extractSessionToken(response) };
	}

	// Deliberately the FUNCTION form (not IAuthenticateGeneric): n8n applies `authenticate`
	// AFTER the routing's preSend hooks, and the generic form overwrites the header
	// unconditionally. `refreshTokenIfExpired` seeds a freshly minted token here when
	// the credential's own token has already expired; if nothing was seeded, the
	// credential's token is used instead.
	authenticate: IAuthenticate = async (credentials, requestOptions) => {
		const headers = { ...requestOptions.headers };
		const seeded = headers[LIVECONNECT_TOKEN_HEADER];
		if (typeof seeded !== 'string' || seeded === '') {
			const sessionToken = credentials.sessionToken;
			// Empty header = an unauthenticated request with noise; better to omit it.
			if (typeof sessionToken === 'string' && sessionToken !== '') {
				headers[LIVECONNECT_TOKEN_HEADER] = sessionToken;
			} else {
				delete headers[LIVECONNECT_TOKEN_HEADER];
			}
		}
		return { ...requestOptions, headers };
	};

	test: ICredentialTestRequest = {
		request: {
			baseURL: LIVECONNECT_BASE_URL,
			url: '/channels/list',
			method: 'GET',
		},
		// n8n's tester only fails on a non-2xx HTTP status; LiveConnect responds 200 with
		// a negative status, so without these rules it would say "Connection successful!".
		rules: [
			{
				type: 'responseSuccessBody',
				properties: {
					key: 'status',
					value: -403,
					message: 'Invalid session token. Check the account key and private key.',
				},
			},
			{
				type: 'responseSuccessBody',
				properties: {
					key: 'status',
					value: -2,
					message: 'The account key or private key is missing from the credential.',
				},
			},
		],
	};
}
