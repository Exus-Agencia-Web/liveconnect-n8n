import type { INodeProperties } from 'n8n-workflow';

import { handleLcResponse } from '../GenericFunctions';

export const proxyOperations: INodeProperties[] = [
	{
		displayName: 'Operación',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['proxy'],
			},
		},
		options: [
			{
				name: 'Configurar Webhook',
				value: 'setWebhook',
				action: 'Configurar un webhook',
				description: 'Con estado 1 da de alta (o reemplaza) el webhook del canal en DynamoDB; con cualquier otro valor lo elimina',
				routing: {
					request: { method: 'POST', url: '/proxy/setWebhook' },
					output: { postReceive: [handleLcResponse] },
				},
			},
			{
				name: 'Consultar Saldo',
				value: 'getBalance',
				action: 'Consultar el saldo del proxy',
				description: 'Retorna el saldo disponible y la configuración del proxy de conversaciones de la cuenta autenticada',
				routing: {
					request: { method: 'GET', url: '/proxy/balance' },
					output: { postReceive: [handleLcResponse] },
				},
			},
			{
				name: 'Consultar Webhook',
				value: 'getWebhook',
				action: 'Consultar un webhook',
				description: 'Retorna la configuración de webhook (DynamoDB) asociada al canal indicado, si existe',
				routing: {
					request: { method: 'POST', url: '/proxy/getWebhook' },
					output: { postReceive: [handleLcResponse] },
				},
			},
			{
				name: 'Enviar Archivo',
				value: 'sendFile',
				action: 'Enviar un archivo',
				description:
					'Descuenta saldo del proxy de la cuenta y encola el archivo hacia la conversación indicada. Solo permite las extensiones jpg, png, gif, pdf, doc, docx, xls, xlsx, ppt y pptx.',
				routing: {
					request: { method: 'POST', url: '/proxy/sendFile' },
					output: { postReceive: [handleLcResponse] },
				},
			},
			{
				name: 'Enviar Mensaje',
				value: 'sendMessage',
				action: 'Enviar un mensaje',
				description: 'Descuenta saldo del proxy de la cuenta y encola el mensaje hacia la conversación indicada',
				routing: {
					request: { method: 'POST', url: '/proxy/sendMessage' },
					output: { postReceive: [handleLcResponse] },
				},
			},
			{
				name: 'Enviar Respuesta Rápida',
				value: 'sendQuickAnswer',
				action: 'Enviar una respuesta rápida',
				description: 'Busca la respuesta rápida por su ID, reemplaza sus variables y la envía (texto y/o archivo adjunto) a la conversación indicada',
				routing: {
					request: { method: 'POST', url: '/proxy/sendQuickAnswer' },
					output: { postReceive: [handleLcResponse] },
				},
			},
			{
				name: 'Transferir',
				value: 'transfer',
				action: 'Transferir una conversación',
				description:
					'Con estado 1 marca la conversación como transferida al proxy (crea la conversación en LiveConnect y, si se envía mensaje, el primer mensaje) y establece el tiempo de vida según la configuración de la cuenta. Con cualquier otro valor libera la transferencia.',
				routing: {
					request: { method: 'POST', url: '/proxy/transfer' },
					output: { postReceive: [handleLcResponse] },
				},
			},
		],
		default: 'sendMessage',
	},
];

export const proxyFields: INodeProperties[] = [
	// ----------------------------------
	//         proxy: getWebhook
	// ----------------------------------
	{
		displayName: 'ID del Canal',
		name: 'id_canal',
		type: 'options',
		typeOptions: { loadOptionsMethod: 'getChannels' },
		required: true,
		default: '',
		description:
			'ID del canal de la cuenta. Elige de la lista o especifica un ID con una expresión.',
		displayOptions: {
			show: {
				resource: ['proxy'],
				operation: ['getWebhook'],
			},
		},
		routing: {
			send: { type: 'body', property: 'id_canal' },
		},
	},

	// ----------------------------------
	//         proxy: sendFile
	// ----------------------------------
	{
		displayName: 'ID de la Conversación',
		name: 'id_conversacion',
		type: 'string',
		required: true,
		default: '',
		description: 'ID de conversación de LiveConnect',
		displayOptions: {
			show: {
				resource: ['proxy'],
				operation: ['sendFile'],
			},
		},
		routing: {
			send: { type: 'body', property: 'id_conversacion' },
		},
	},
	{
		displayName: 'URL del Archivo',
		name: 'url',
		type: 'string',
		required: true,
		default: '',
		description: 'URL pública del archivo a enviar',
		displayOptions: {
			show: {
				resource: ['proxy'],
				operation: ['sendFile'],
			},
		},
		routing: {
			send: { type: 'body', property: 'url' },
		},
	},
	{
		displayName: 'Campos Adicionales',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Agregar Campo',
		default: {},
		displayOptions: {
			show: {
				resource: ['proxy'],
				operation: ['sendFile'],
			},
		},
		options: [
			{
				displayName: 'Extensión',
				name: 'extension',
				type: 'string',
				default: '',
				description: 'Extensión del archivo (por defecto, se infiere de la URL)',
				routing: { send: { type: 'body', property: 'extension' } },
			},
			{
				displayName: 'Nombre',
				name: 'nombre',
				type: 'string',
				default: '',
				description: 'Nombre/título del archivo (por defecto, el del archivo en la URL)',
				routing: { send: { type: 'body', property: 'nombre' } },
			},
		],
	},

	// ----------------------------------
	//         proxy: sendMessage
	// ----------------------------------
	{
		displayName: 'ID de la Conversación',
		name: 'id_conversacion',
		type: 'string',
		required: true,
		default: '',
		description: 'ID de conversación de LiveConnect',
		displayOptions: {
			show: {
				resource: ['proxy'],
				operation: ['sendMessage'],
			},
		},
		routing: {
			send: { type: 'body', property: 'id_conversacion' },
		},
	},
	{
		displayName: 'Mensaje',
		name: 'mensaje',
		type: 'string',
		typeOptions: { rows: 3 },
		required: true,
		default: '',
		description: 'Texto a enviar',
		displayOptions: {
			show: {
				resource: ['proxy'],
				operation: ['sendMessage'],
			},
		},
		routing: {
			send: { type: 'body', property: 'mensaje' },
		},
	},

	// ----------------------------------
	//         proxy: sendQuickAnswer
	// ----------------------------------
	{
		displayName: 'ID de la Conversación',
		name: 'id_conversacion',
		type: 'string',
		required: true,
		default: '',
		description: 'ID de conversación de LiveConnect',
		displayOptions: {
			show: {
				resource: ['proxy'],
				operation: ['sendQuickAnswer'],
			},
		},
		routing: {
			send: { type: 'body', property: 'id_conversacion' },
		},
	},
	{
		displayName: 'ID de la Respuesta Rápida',
		name: 'id_respuesta',
		type: 'number',
		required: true,
		default: 0,
		description: 'ID de la respuesta rápida (lc_respuestasrapidas)',
		displayOptions: {
			show: {
				resource: ['proxy'],
				operation: ['sendQuickAnswer'],
			},
		},
		routing: {
			send: { type: 'body', property: 'id_respuesta' },
		},
	},
	{
		displayName: 'Campos Adicionales',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Agregar Campo',
		default: {},
		displayOptions: {
			show: {
				resource: ['proxy'],
				operation: ['sendQuickAnswer'],
			},
		},
		options: [
			{
				displayName: 'Variables',
				name: 'variables',
				type: 'json',
				default: '{}',
				description: 'Valores para reemplazar los marcadores {clave} del texto',
				routing: {
					send: {
						type: 'body',
						property: 'variables',
						value: '={{ typeof $value === "object" && $value !== null ? $value : JSON.parse($value || "{}") }}',
					},
				},
			},
		],
	},

	// ----------------------------------
	//         proxy: setWebhook
	// ----------------------------------
	{
		displayName: 'ID del Canal',
		name: 'id_canal',
		type: 'options',
		typeOptions: { loadOptionsMethod: 'getChannels' },
		required: true,
		default: '',
		description:
			'ID del canal de la cuenta. Elige de la lista o especifica un ID con una expresión.',
		displayOptions: {
			show: {
				resource: ['proxy'],
				operation: ['setWebhook'],
			},
		},
		routing: {
			send: { type: 'body', property: 'id_canal' },
		},
	},
	{
		displayName: 'URL del Webhook',
		name: 'url',
		type: 'string',
		required: true,
		default: '',
		description: 'URL del webhook a notificar',
		displayOptions: {
			show: {
				resource: ['proxy'],
				operation: ['setWebhook'],
			},
		},
		routing: {
			send: { type: 'body', property: 'url' },
		},
	},
	{
		displayName: 'Estado',
		name: 'estado',
		type: 'options',
		options: [
			{ name: 'No', value: 0 },
			{ name: 'Sí', value: 1 },
		],
		required: true,
		default: 1,
		description: 'Sí establece el webhook; No lo elimina',
		displayOptions: {
			show: {
				resource: ['proxy'],
				operation: ['setWebhook'],
			},
		},
		routing: {
			send: { type: 'body', property: 'estado' },
		},
	},
	{
		displayName: 'Secreto',
		name: 'secret',
		type: 'string',
		typeOptions: { password: true },
		required: true,
		default: '',
		description: 'Secreto enviado en cada notificación del webhook',
		displayOptions: {
			show: {
				resource: ['proxy'],
				operation: ['setWebhook'],
			},
		},
		routing: {
			send: { type: 'body', property: 'secret' },
		},
	},

	// ----------------------------------
	//         proxy: transfer
	// ----------------------------------
	{
		displayName: 'ID de la Conversación',
		name: 'id_conversacion',
		type: 'string',
		required: true,
		default: '',
		description: 'ID de conversación de LiveConnect',
		displayOptions: {
			show: {
				resource: ['proxy'],
				operation: ['transfer'],
			},
		},
		routing: {
			send: { type: 'body', property: 'id_conversacion' },
		},
	},
	{
		displayName: 'Estado',
		name: 'estado',
		type: 'options',
		options: [
			{ name: 'No', value: 0 },
			{ name: 'Sí', value: 1 },
		],
		required: true,
		default: 1,
		description: 'Sí transfiere la conversación al proxy; No libera la transferencia',
		displayOptions: {
			show: {
				resource: ['proxy'],
				operation: ['transfer'],
			},
		},
		routing: {
			send: { type: 'body', property: 'estado' },
		},
	},
	{
		displayName: 'Campos Adicionales',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Agregar Campo',
		default: {},
		displayOptions: {
			show: {
				resource: ['proxy'],
				operation: ['transfer'],
			},
		},
		options: [
			{
				displayName: 'Agente',
				name: 'usuario',
				type: 'json',
				default: '{}',
				description: 'Agente a asignar a la conversación (objeto con ID)',
				routing: {
					send: {
						type: 'body',
						property: 'usuario',
						value: '={{ typeof $value === "object" && $value !== null ? $value : JSON.parse($value || "{}") }}',
					},
				},
			},
			{
				displayName: 'Contacto',
				name: 'contacto',
				type: 'json',
				default: '{}',
				description: 'Datos del contacto (nombre, correo, celular, etc.)',
				routing: {
					send: {
						type: 'body',
						property: 'contacto',
						value: '={{ typeof $value === "object" && $value !== null ? $value : JSON.parse($value || "{}") }}',
					},
				},
			},
			{
				displayName: 'ID del Canal',
				name: 'id_canal',
				type: 'options',
				typeOptions: { loadOptionsMethod: 'getChannels' },
				default: '',
				description:
					'ID del canal (requerido al transferir la conversación al proxy). Elige de la lista o especifica un ID con una expresión.',
				routing: { send: { type: 'body', property: 'id_canal' } },
			},
			{
				displayName: 'ID del Grupo',
				name: 'id_grupo',
				type: 'options',
				typeOptions: { loadOptionsMethod: 'getGroups' },
				default: '',
				description:
					'ID del grupo de agentes a asignar. Elige de la lista o especifica un ID con una expresión.',
				routing: { send: { type: 'body', property: 'id_grupo' } },
			},
			{
				displayName: 'IDs de Etiquetas',
				name: 'etiquetas',
				type: 'string',
				default: '',
				placeholder: '1,2,3',
				description: 'IDs de etiquetas a aplicar al contacto, separados por comas',
				routing: {
					send: {
						type: 'body',
						property: 'etiquetas',
						value:
							'={{ $value.toString().split(",").map((v) => v.trim()).filter((v) => v !== "").map((v) => Number(v)).filter((v) => !isNaN(v)) }}',
					},
				},
			},
			{
				displayName: 'Mensaje',
				name: 'mensaje',
				type: 'string',
				typeOptions: { rows: 3 },
				default: '',
				description: 'Mensaje inicial a enviar al crear la conversación',
				routing: { send: { type: 'body', property: 'mensaje' } },
			},
			{
				displayName: 'Nota de Origen',
				name: 'info_mensaje',
				type: 'string',
				default: '',
				description: 'Nota interna sobre el origen de la transferencia',
				routing: { send: { type: 'body', property: 'info_mensaje' } },
			},
		],
	},
];
