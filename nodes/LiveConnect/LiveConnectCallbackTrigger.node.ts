import type {
	INodeType,
	INodeTypeDescription,
	IWebhookFunctions,
	IWebhookResponseData,
} from 'n8n-workflow';

import { requestSecretIsValid, simplifyCallbackEvent } from './TriggerFunctions';

export class LiveConnectCallbackTrigger implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'LiveConnect Callback Trigger',
		name: 'liveConnectCallbackTrigger',
		icon: 'file:liveconnect.svg',
		group: ['trigger'],
		version: 1,
		description: 'Recibe los callbacks del chatbot (Flowbot) de LiveConnect',
		activationMessage:
			'Pega la URL de producción de este webhook en la acción de callback de tu Flowbot de LiveConnect.',
		defaults: {
			name: 'LiveConnect Callback Trigger',
		},
		inputs: [],
		outputs: ['main'],
		webhooks: [
			{
				name: 'default',
				httpMethod: 'POST',
				responseMode: '={{$parameter["responseMode"]}}',
				responseData: '={{$parameter["responseMode"] === "lastNode" ? "firstEntryJson" : undefined}}',
				path: 'webhook',
			},
		],
		properties: [
			{
				displayName: 'Secret',
				name: 'secret',
				type: 'string',
				typeOptions: { password: true },
				default: '',
				description:
					'Secreto configurado en el Flowbot. Si se deja vacío, no se valida el secret de las notificaciones entrantes.',
			},
			{
				displayName: 'Response Mode',
				name: 'responseMode',
				type: 'options',
				options: [
					{
						name: 'Immediately',
						value: 'onReceived',
						description: 'Responde de inmediato; el Flowbot no recibe actions',
					},
					{
						name: 'Using Respond to Webhook Node',
						value: 'responseNode',
						description:
							'La respuesta la construye un nodo Respond to Webhook con el envelope de actions (recomendado)',
					},
					{
						name: 'When Last Node Finishes',
						value: 'lastNode',
						description:
							'Responde con el JSON del primer item del último nodo, que debe ser el envelope de actions',
					},
				],
				default: 'responseNode',
				description:
					'Cuándo y cómo responder al callback. LiveConnect espera una respuesta síncrona con la forma { "status": 1, "status_message": "Ok", "data": { "actions": [...] } }.',
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

	// Sin webhookMethods: la URL del callback se registra manualmente en el Flowbot
	// (no existe API de registro), igual que el nodo Webhook core.

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
