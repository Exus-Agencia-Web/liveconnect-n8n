import type {
	IHookFunctions,
	INodeType,
	INodeTypeDescription,
	IWebhookFunctions,
	IWebhookResponseData,
} from 'n8n-workflow';
import { NodeConnectionTypes } from 'n8n-workflow';

import { requestSecretIsValid, simplifyCallbackEvent } from './TriggerFunctions';

export class LiveConnectCallbackTrigger implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'LiveConnect Callback Trigger',
		name: 'liveConnectCallbackTrigger',
		icon: { light: 'file:liveconnect2.svg', dark: 'file:liveconnect2.dark.svg' },
		group: ['trigger'],
		version: 1,
		subtitle: '={{$parameter["path"]}}',
		description: 'Receives callbacks from the LiveConnect chatbot (Flowbot)',
		activationMessage:
			'Paste the production URL of this webhook into the callback action of your LiveConnect Flowbot.',
		defaults: {
			name: 'LiveConnect Callback Trigger',
		},
		inputs: [],
		outputs: [NodeConnectionTypes.Main],
		usableAsTool: true,
		webhooks: [
			{
				name: 'default',
				httpMethod: 'POST',
				responseMode: '={{$parameter["responseMode"]}}',
				responseData: '={{$parameter["responseMode"] === "lastNode" ? "firstEntryJson" : undefined}}',
				// Configurable path (the default reproduces the URL of earlier versions).
				// The full URL is <base>/<webhookId>/<path>: the webhookId is already unique per
				// node, so this doesn't prevent collisions —there aren't any— it just allows a
				// readable, stable URL to paste into the Flowbot.
				path: '={{$parameter["path"] || "webhook"}}',
			},
		],
		properties: [
			{
				displayName:
					'Activate the workflow and paste the <b>production</b> URL of this webhook into the callback action of your Flowbot. LiveConnect expects a synchronous response shaped like <code>{ "status": 1, "status_message": "Ok", "data": { "actions": [...] } }</code> — build it without code using the <b>LiveConnect Callback Response</b> node (recommended: it responds on its own and applies the closing <code>input</code> rule) or with a <b>Respond to Webhook</b> node. Examples from the repository: <b>examples/09</b> (visual) and <b>examples/07</b> (with Code).',
				name: 'notice',
				type: 'notice',
				default: '',
			},
			{
				displayName: 'Webhook Path',
				name: 'path',
				type: 'string',
				default: 'webhook',
				placeholder: 'callback-sales',
				description:
					'Last segment of the webhook URL, used to identify it when you have multiple chatbots. Changing it changes the URL: update it in the Flowbot as well.',
			},
			{
				displayName: 'Secret',
				name: 'secret',
				type: 'string',
				typeOptions: { password: true },
				default: '',
				description:
					'Secret configured in the Flowbot. If left empty, the secret of incoming notifications is not validated.',
			},
			{
				displayName: 'Response Mode',
				name: 'responseMode',
				type: 'options',
				options: [
					{
						name: 'When Last Node Finishes',
						value: 'lastNode',
						description:
							'Responds with the JSON of the first item from the last node, which must be the actions envelope',
					},
					{
						name: 'Immediately',
						value: 'onReceived',
						description: 'Responds immediately; the Flowbot does not receive actions',
					},
					{
						name: 'Using Respond to Webhook Node',
						value: 'responseNode',
						description:
							'The response is built by a Respond to Webhook node with the actions envelope (recommended)',
					},
				],
				default: 'responseNode',
				description:
					'When and how to respond to the callback. LiveConnect expects a synchronous response shaped like { "status": 1, "status_message": "Ok", "data": { "actions": [...] } }.',
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

	// The Flowbot doesn't expose a webhook-registration API: the URL is pasted by hand into
	// its configuration (same as the core Webhook node). checkExists/create/delete don't
	// call any API — they're honest no-ops that exist only because n8n's verified-nodes
	// scanner requires implementing all three lifecycle methods.
	// HEADS UP if LiveConnect ever exposes a Flowbot registration API: since checkExists
	// always returns true, n8n will NEVER call create(). Implementing create() without
	// touching checkExists would leave dead code with no symptom at all.
	webhookMethods = {
		default: {
			async checkExists(this: IHookFunctions): Promise<boolean> {
				return true;
			},
			async create(this: IHookFunctions): Promise<boolean> {
				return true;
			},
			async delete(this: IHookFunctions): Promise<boolean> {
				return true;
			},
		},
	};

	async webhook(this: IWebhookFunctions): Promise<IWebhookResponseData> {
		const expected = this.getNodeParameter('secret', '') as string;

		if (expected !== '' && !requestSecretIsValid(this, expected)) {
			const res = this.getResponseObject();
			res.status(403).json({ status: -1, status_message: 'Invalid secret' });
			return { noWebhookResponse: true };
		}

		const body = this.getBodyData();
		const simple = this.getNodeParameter('simple') as boolean;
		const json = simple ? simplifyCallbackEvent(body) : body;
		return {
			workflowData: [this.helpers.returnJsonArray(json)],
		};
	}
}
