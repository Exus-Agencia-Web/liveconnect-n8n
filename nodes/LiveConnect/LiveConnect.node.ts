import type {
	IDataObject,
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';
import { NodeConnectionTypes, NodeOperationError } from 'n8n-workflow';

import { applyClosingRule, buildEnvelope, toAction } from './ActionsFunctions';
import { LIVECONNECT_BASE_URL, refreshTokenIfExpired } from './GenericFunctions';
import { liveConnectLoadOptions } from './LoadOptions';
import {
	assistantFields,
	assistantOperations,
	automationFields,
	automationOperations,
	callbackResponseFields,
	callbackResponseOperations,
	categoryFields,
	categoryOperations,
	channelFields,
	channelOperations,
	contactFields,
	contactOperations,
	conversationFields,
	conversationOperations,
	crmFields,
	crmOperations,
	dealFields,
	dealOperations,
	dealTaskFields,
	dealTaskOperations,
	groupFields,
	groupOperations,
	historyFields,
	historyOperations,
	productFields,
	productOperations,
	proxyFields,
	proxyOperations,
	quickReplyFields,
	quickReplyOperations,
	topicFields,
	topicOperations,
	userFields,
	userOperations,
	wabaFields,
	wabaOperations,
	whatsAppFields,
	whatsAppOperations,
} from './descriptions';

export class LiveConnect implements INodeType {
	// Dynamic selectors: feed the ID fields from the listing endpoints.
	methods = {
		loadOptions: liveConnectLoadOptions,
	};

	description: INodeTypeDescription = {
		displayName: 'LiveConnect',
		name: 'liveConnect',
		icon: { light: 'file:liveconnect2.svg', dark: 'file:liveconnect2.dark.svg' },
		group: ['transform'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Interact with the LiveConnect API (omnichannel messaging + CRM)',
		defaults: {
			name: 'LiveConnect',
		},
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
		usableAsTool: true,
		credentials: [
			{
				name: 'liveConnectApi',
				required: true,
			},
		],
		requestDefaults: {
			baseURL: LIVECONNECT_BASE_URL,
			headers: {
				Accept: 'application/json',
				'Content-Type': 'application/json',
			},
		},
		properties: [
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				noDataExpression: true,
				// Global preSend: `resource` is always visible and is the first property,
				// so its preSend runs on every operation and before any other one.
				// Without `property` it sends nothing to the body or the query.
				routing: {
					send: { preSend: [refreshTokenIfExpired] },
				},
				options: [
					{ name: 'Assistant', value: 'assistant' },
					{ name: 'Callback Response', value: 'callbackResponse' },
					{ name: 'Category', value: 'category' },
					{ name: 'Channel', value: 'channel' },
					{ name: 'Contact', value: 'contact' },
					{ name: 'Conversation', value: 'conversation' },
					{ name: 'CRM', value: 'crm' },
					{ name: 'CRM Automation', value: 'automation' },
					{ name: 'Deal', value: 'deal' },
					{ name: 'Deal Task', value: 'dealTask' },
					{ name: 'History', value: 'history' },
					{ name: 'Product', value: 'product' },
					{ name: 'Proxy', value: 'proxy' },
					{ name: 'Quick Reply', value: 'quickReply' },
					{ name: 'Team', value: 'group' },
					{ name: 'Topic', value: 'topic' },
					{ name: 'User', value: 'user' },
					{ name: 'WhatsApp Business (WABA)', value: 'waba' },
					{ name: 'WhatsApp QR', value: 'whatsapp' },
				],
				default: 'contact',
			},

			...assistantOperations,
			...assistantFields,
			...callbackResponseOperations,
			...callbackResponseFields,
			...automationOperations,
			...automationFields,
			...categoryOperations,
			...categoryFields,
			...channelOperations,
			...channelFields,
			...contactOperations,
			...contactFields,
			...conversationOperations,
			...conversationFields,
			...crmOperations,
			...crmFields,
			...dealOperations,
			...dealFields,
			...dealTaskOperations,
			...dealTaskFields,
			...groupOperations,
			...groupFields,
			...historyOperations,
			...historyFields,
			...productOperations,
			...productFields,
			...proxyOperations,
			...proxyFields,
			...quickReplyOperations,
			...quickReplyFields,
			...topicOperations,
			...topicFields,
			...userOperations,
			...userFields,
			...wabaOperations,
			...wabaFields,
			...whatsAppOperations,
			...whatsAppFields,

			{
				displayName: 'Return Full Response',
				name: 'fullResponse',
				type: 'boolean',
				default: false,
				description:
					'Whether to return the full API envelope ({ status, status_message, data }) instead of just the data field',
				// Hidden for Callback Response: that resource never calls the API, so there is
				// no envelope to unwrap and the toggle would only add noise.
				displayOptions: {
					hide: {
						resource: ['callbackResponse'],
					},
				},
			},
		],
	};

	/**
	 * The Callback Response resource does not call the API: it builds the action envelope
	 * and answers the Flowbot webhook. n8n runs `customOperations` instead of the routing
	 * for that resource/operation pair, which is how a declarative node can carry one
	 * custom implementation without turning the other 58 operations programmatic.
	 */
	customOperations = {
		callbackResponse: {
			async send(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
				const items = this.getInputData();
				const returnData: INodeExecutionData[] = [];
				// The HTTP callback allows only ONE response per execution.
				let responded = false;

				for (let i = 0; i < items.length; i++) {
					try {
						const raw = this.getNodeParameter('acciones', i, {}) as { accion?: IDataObject[] };
						const autoInput = this.getNodeParameter('autoInput', i, true) as boolean;
						const uiActions = raw.accion ?? [];

						let actions = uiActions.map((ui, idx) => toAction(this.getNode(), ui, idx + 1, i));
						if (autoInput) {
							actions = applyClosingRule(actions);
						} else if (actions.length === 0) {
							// The contract requires a non-empty data.actions; without autoInput there's no implicit keep-alive.
							throw new NodeOperationError(
								this.getNode(),
								'Configure at least one action or enable "Automatically Add Closing Input"',
								{ itemIndex: i },
							);
						}

						const envelope = buildEnvelope(actions);

						const respond = this.getNodeParameter('respondWebhook', i, true) as boolean;
						if (respond && !responded) {
							// Same shape as the core Respond to Webhook (IN8nHttpFullResponse).
							// With no webhook waiting (manual execution) it's a no-op: it doesn't throw.
							this.sendResponse({
								body: envelope,
								headers: { 'content-type': 'application/json' },
								statusCode: 200,
							});
							responded = true;
						}

						returnData.push({ json: envelope, pairedItem: { item: i } });
					} catch (error) {
						if (this.continueOnFail()) {
							returnData.push({
								json: { error: (error as Error).message },
								pairedItem: { item: i },
							});
							continue;
						}
						// Always wrapped, even when it's already a NodeOperationError: the
						// `require-node-api-error` rule in the verified-nodes linter forbids
						// rethrowing the error as-is. NodeOperationError preserves the original
						// message, so the text the user sees doesn't change.
						throw new NodeOperationError(this.getNode(), error as Error, { itemIndex: i });
					}
				}

				return [returnData];
			},
		},
	};
}
