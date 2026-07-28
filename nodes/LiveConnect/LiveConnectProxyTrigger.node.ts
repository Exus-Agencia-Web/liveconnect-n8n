import { randomBytes } from 'crypto';

import type {
	IDataObject,
	IHookFunctions,
	INodeType,
	INodeTypeDescription,
	IWebhookFunctions,
	IWebhookResponseData,
	JsonObject,
} from 'n8n-workflow';
import { NodeApiError, NodeConnectionTypes } from 'n8n-workflow';

import { getChannels } from './LoadOptions';
import type { LcEnvelope } from './TriggerFunctions';
import {
	asObject,
	lcHookRequest,
	requestSecretIsValid,
	simplifyProxyEvent,
} from './TriggerFunctions';

/** Effective secret: the one from the parameter, or the auto-generated one persisted in staticData. */
function effectiveSecret(param: string, staticData: IDataObject): string {
	if (param !== '') return param;
	return typeof staticData.secret === 'string' ? staticData.secret : '';
}

export class LiveConnectProxyTrigger implements INodeType {
	methods = {
		loadOptions: { getChannels },
	};

	description: INodeTypeDescription = {
		displayName: 'LiveConnect Proxy Trigger',
		name: 'liveConnectProxyTrigger',
		icon: { light: 'file:liveconnect2.svg', dark: 'file:liveconnect2.dark.svg' },
		group: ['trigger'],
		version: 1,
		subtitle: '={{$parameter["path"]}}',
		description:
			'Triggers when a notification arrives from the LiveConnect conversation proxy',
		defaults: {
			name: 'LiveConnect Proxy Trigger',
		},
		inputs: [],
		outputs: [NodeConnectionTypes.Main],
		usableAsTool: true,
		credentials: [
			{
				name: 'liveConnectApi',
				required: true,
			},
		],
		webhooks: [
			{
				name: 'default',
				httpMethod: 'POST',
				responseMode: 'onReceived',
				// Configurable path; the default reproduces the URL of earlier versions.
				// Changing it changes the URL, and checkExists sees it as different from the one
				// registered in LiveConnect, so the webhook re-registers itself automatically.
				path: '={{$parameter["path"] || "webhook"}}',
			},
		],
		properties: [
			{
				displayName:
					'This trigger automatically registers the channel webhook in LiveConnect when the workflow is activated, and removes it when deactivated. LiveConnect allows only ONE webhook per channel: do not activate two workflows with the same channel ID. Ready-to-import example: <b>examples/08-mensajes-proxy-trigger.json</b> from the repository.',
				name: 'notice',
				type: 'notice',
				default: '',
			},
			{
				displayName: 'Channel Name or ID',
				name: 'id_canal',
				type: 'options',
				typeOptions: { loadOptionsMethod: 'getChannels' },
				required: true,
				default: '',
				description:
					'Channel whose proxy notifications trigger the workflow. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
			},
			{
				displayName: 'Webhook Path',
				name: 'path',
				type: 'string',
				default: 'webhook',
				placeholder: 'proxy-support',
				description:
					'Last segment of the webhook URL, used to identify it when you have multiple channels. Changing it re-registers the webhook in LiveConnect with the new URL.',
			},
			{
				displayName: 'Secret',
				name: 'secret',
				type: 'string',
				typeOptions: { password: true },
				default: '',
				description:
					'Secret that LiveConnect sends with each webhook notification. Leave empty to generate one automatically when the workflow is activated.',
			},
			{
				displayName: 'Simplify',
				name: 'simple',
				type: 'boolean',
				default: true,
				description:
					'Whether to return a simplified version of the response instead of the raw data',
			},
		],
	};

	webhookMethods = {
		default: {
			// Registration in LiveConnect: POST /proxy/setWebhook with estado=1 creates or
			// REPLACES the channel's webhook (single slot); any other estado value removes it.
			async checkExists(this: IHookFunctions): Promise<boolean> {
				const idCanal = this.getNodeParameter('id_canal') as number;
				const webhookUrl = this.getNodeWebhookUrl('default');

				let envelope: LcEnvelope;
				try {
					envelope = await lcHookRequest.call(this, '/proxy/getWebhook', { id_canal: idCanal });
				} catch {
					// No registration (or the API is down): n8n will call create()
					return false;
				}
				if (typeof envelope.status === 'number' && envelope.status < 0) return false;

				const data = asObject(envelope.data);
				if (data === undefined) return false;
				if (data.webhook !== webhookUrl) return false;

				// Expired DynamoDB TTL (epoch in seconds) → treat as nonexistent and re-register
				const ttl = Number(data.TTL);
				if (Number.isFinite(ttl) && ttl > 0 && ttl * 1000 < Date.now()) return false;

				// Unknown local secret (e.g. staticData lost after a failed delete):
				// NEVER treat the registration as valid — force create() to regenerate and persist it.
				const expected = effectiveSecret(
					this.getNodeParameter('secret', '') as string,
					this.getWorkflowStaticData('node'),
				);
				if (expected === '') return false;
				// Secret changed by the user → re-register with the new one
				if (data.secret !== expected) return false;

				return true;
			},

			async create(this: IHookFunctions): Promise<boolean> {
				const idCanal = this.getNodeParameter('id_canal') as number;
				const webhookUrl = this.getNodeWebhookUrl('default');
				if (webhookUrl === undefined) return false;

				const staticData = this.getWorkflowStaticData('node');
				let secret = effectiveSecret(this.getNodeParameter('secret', '') as string, staticData);
				if (secret === '') {
					// hex → immune to encoding issues in query/header
					secret = randomBytes(16).toString('hex');
				}

				const envelope = await lcHookRequest.call(this, '/proxy/setWebhook', {
					id_canal: idCanal,
					url: webhookUrl,
					estado: 1,
					secret,
				});
				if (typeof envelope.status === 'number' && envelope.status < 0) {
					throw new NodeApiError(this.getNode(), envelope as JsonObject, {
						message: envelope.status_message ?? 'LiveConnect rejected the webhook registration',
						description: `LiveConnect returned status ${envelope.status} while registering the webhook for channel ${idCanal}`,
					});
				}

				staticData.secret = secret;
				return true;
			},

			async delete(this: IHookFunctions): Promise<boolean> {
				const idCanal = this.getNodeParameter('id_canal') as number;
				const webhookUrl = this.getNodeWebhookUrl('default') ?? '';
				const staticData = this.getWorkflowStaticData('node');
				const secret = effectiveSecret(this.getNodeParameter('secret', '') as string, staticData);
				try {
					await lcHookRequest.call(this, '/proxy/setWebhook', {
						id_canal: idCanal,
						url: webhookUrl,
						estado: 0,
						secret,
					});
					// Only forget the local secret once the remote deletion is confirmed:
					// if it failed, the remote registration is still alive with this secret and
					// webhook() must keep validating against it.
					delete staticData.secret;
				} catch {
					// Registration already gone or the API is down: don't block deactivating the workflow
				}
				return true;
			},
		},
	};

	async webhook(this: IWebhookFunctions): Promise<IWebhookResponseData> {
		const staticData = this.getWorkflowStaticData('node');
		const expected = effectiveSecret(this.getNodeParameter('secret', '') as string, staticData);

		if (expected !== '' && !requestSecretIsValid(this, expected)) {
			const res = this.getResponseObject();
			res.status(403).json({ status: -1, status_message: 'Invalid secret' });
			return { noWebhookResponse: true };
		}

		const body = this.getBodyData();
		const simple = this.getNodeParameter('simple') as boolean;
		const json = simple ? simplifyProxyEvent(body) : body;
		return {
			workflowData: [this.helpers.returnJsonArray(json)],
		};
	}
}
