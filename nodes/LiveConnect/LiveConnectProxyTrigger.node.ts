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

/** Secret efectivo: el del parámetro, o el autogenerado persistido en staticData. */
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
		icon: { light: 'file:liveconnect2.svg', dark: 'file:liveconnect2.svg' },
		group: ['trigger'],
		version: 1,
		subtitle: '={{$parameter["path"]}}',
		description:
			'Se dispara cuando llega una notificación del proxy de conversaciones de LiveConnect',
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
				// Ruta configurable; el default reproduce la URL de versiones anteriores.
				// Al cambiarla cambia la URL, y checkExists la ve distinta a la registrada
				// en LiveConnect, así que el webhook se vuelve a dar de alta solo.
				path: '={{$parameter["path"] || "webhook"}}',
			},
		],
		properties: [
			{
				displayName:
					'Este trigger registra automáticamente el webhook del canal en LiveConnect al activar el workflow y lo elimina al desactivarlo. LiveConnect permite UN solo webhook por canal: no actives dos workflows con el mismo ID de canal. Ejemplo listo para importar: <b>examples/08-mensajes-proxy-trigger.json</b> del repositorio.',
				name: 'notice',
				type: 'notice',
				default: '',
			},
			{
				displayName: 'ID del Canal',
				name: 'id_canal',
				type: 'options',
				typeOptions: { loadOptionsMethod: 'getChannels' },
				required: true,
				default: '',
				description:
					'Canal cuyas notificaciones del proxy disparan el workflow. Elige de la lista o especifica un ID con una expresión.',
			},
			{
				displayName: 'Ruta del Webhook',
				name: 'path',
				type: 'string',
				default: 'webhook',
				placeholder: 'proxy-soporte',
				description:
					'Último tramo de la URL del webhook, para identificarla cuando tienes varios canales. Al cambiarla, el webhook se vuelve a registrar en LiveConnect con la URL nueva.',
			},
			{
				displayName: 'Secreto',
				name: 'secret',
				type: 'string',
				typeOptions: { password: true },
				default: '',
				description:
					'Secreto que LiveConnect envía en cada notificación del webhook. Dejar vacío para generar uno automáticamente al activar el workflow.',
			},
			{
				displayName: 'Simplificar',
				name: 'simple',
				type: 'boolean',
				default: true,
				description:
					'Si se activa, entrega el evento simplificado (mensaje, sessionId, contacto…) en lugar del payload crudo',
			},
		],
	};

	webhookMethods = {
		default: {
			// Registro en LiveConnect: POST /proxy/setWebhook con estado=1 da de alta o
			// REEMPLAZA el webhook del canal (slot único); estado distinto de 1 lo elimina.
			async checkExists(this: IHookFunctions): Promise<boolean> {
				const idCanal = this.getNodeParameter('id_canal') as number;
				const webhookUrl = this.getNodeWebhookUrl('default');

				let envelope: LcEnvelope;
				try {
					envelope = await lcHookRequest.call(this, '/proxy/getWebhook', { id_canal: idCanal });
				} catch {
					// Sin registro (o API caída): n8n llamará create()
					return false;
				}
				if (typeof envelope.status === 'number' && envelope.status < 0) return false;

				const data = asObject(envelope.data);
				if (data === undefined) return false;
				if (data.webhook !== webhookUrl) return false;

				// TTL de DynamoDB vencido (epoch en segundos) → tratar como inexistente y re-registrar
				const ttl = Number(data.TTL);
				if (Number.isFinite(ttl) && ttl > 0 && ttl * 1000 < Date.now()) return false;

				// Secret local desconocido (p.ej. staticData perdido tras un delete fallido):
				// NUNCA dar el registro por válido — forzar create() para regenerar y persistir.
				const expected = effectiveSecret(
					this.getNodeParameter('secret', '') as string,
					this.getWorkflowStaticData('node'),
				);
				if (expected === '') return false;
				// Secret cambiado por el usuario → re-registrar con el nuevo
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
					// hex → inmune a problemas de encoding en query/header
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
						message: envelope.status_message ?? 'LiveConnect rechazó el registro del webhook',
						description: `LiveConnect devolvió status ${envelope.status} al registrar el webhook del canal ${idCanal}`,
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
					// Solo olvidar el secret local cuando el borrado remoto fue confirmado:
					// si falló, el registro remoto sigue vivo con este secret y webhook()
					// debe seguir validándolo.
					delete staticData.secret;
				} catch {
					// Registro ya inexistente o API caída: no bloquear la desactivación del workflow
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
