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
		icon: 'file:liveconnect2.svg',
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
				displayName:
					'Activa el workflow y pega la URL de <b>producción</b> de este webhook en la acción de callback de tu Flowbot. LiveConnect espera una respuesta síncrona con la forma <code>{ "status": 1, "status_message": "Ok", "data": { "actions": [...] } }</code> — constrúyela sin código con el nodo <b>LiveConnect Respuesta al Callback</b> (recomendado: responde solo y aplica la regla del <code>input</code> de cierre) o con un nodo <b>Respond to Webhook</b>. Ejemplos del repositorio: <b>examples/09</b> (visual) y <b>examples/07</b> (con Code).',
				name: 'notice',
				type: 'notice',
				default: '',
			},
			{
				displayName: 'Secreto',
				name: 'secret',
				type: 'string',
				typeOptions: { password: true },
				default: '',
				description:
					'Secreto configurado en el Flowbot. Si se deja vacío, no se valida el secret de las notificaciones entrantes.',
			},
			{
				displayName: 'Modo de Respuesta',
				name: 'responseMode',
				type: 'options',
				options: [
					{
						name: 'Al Terminar el Último Nodo',
						value: 'lastNode',
						description:
							'Responde con el JSON del primer item del último nodo, que debe ser el envelope de actions',
					},
					{
						name: 'Inmediatamente',
						value: 'onReceived',
						description: 'Responde de inmediato; el Flowbot no recibe actions',
					},
					{
						name: 'Usando el Nodo Respond to Webhook',
						value: 'responseNode',
						description:
							'La respuesta la construye un nodo Respond to Webhook con el envelope de actions (recomendado)',
					},
				],
				default: 'responseNode',
				description:
					'Cuándo y cómo responder al callback. LiveConnect espera una respuesta síncrona con la forma { "status": 1, "status_message": "Ok", "data": { "actions": [...] } }.',
			},
			{
				displayName: 'Simplificar',
				name: 'simple',
				type: 'boolean',
				default: true,
				description:
					'Si se activa, entrega el evento simplificado (mensaje, sessionId, esPrimerTurno, hayAgenteHumano…) en lugar del payload crudo',
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
