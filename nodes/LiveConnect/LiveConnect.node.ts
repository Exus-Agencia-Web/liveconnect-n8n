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
	// Selectores dinámicos: alimentan los campos de ID con los endpoints de listado.
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
				// preSend global: `resource` siempre está visible y es la primera propiedad,
				// así que su preSend corre en todas las operaciones y antes que cualquier
				// otro. Sin `property` no envía nada al body ni al query.
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
				// El callback HTTP admite UNA sola respuesta por ejecución.
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
							// El contrato exige data.actions no vacío; sin autoInput no hay keep-alive implícito.
							throw new NodeOperationError(
								this.getNode(),
								'Configure at least one action or enable "Automatically Add Closing Input"',
								{ itemIndex: i },
							);
						}

						const envelope = buildEnvelope(actions);

						const respond = this.getNodeParameter('respondWebhook', i, true) as boolean;
						if (respond && !responded) {
							// Misma forma que el core Respond to Webhook (IN8nHttpFullResponse).
							// Sin webhook esperando (ejecución manual) es no-op: no lanza.
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
						// Siempre se envuelve, incluso lo que ya es NodeOperationError: la regla
						// `require-node-api-error` del linter de nodos verificados prohíbe relanzar
						// el error tal cual. NodeOperationError conserva el mensaje del original,
						// así que el texto que ve el usuario no cambia.
						throw new NodeOperationError(this.getNode(), error as Error, { itemIndex: i });
					}
				}

				return [returnData];
			},
		},
	};
}
