import type { INodeProperties } from 'n8n-workflow';

import { handleLcResponse } from '../GenericFunctions';

export const whatsAppOperations: INodeProperties[] = [
	{
		displayName: 'Operación',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['whatsapp'],
			},
		},
		options: [
			{
				name: 'Enviar Archivo',
				value: 'sendFile',
				action: 'Enviar un archivo',
				description:
					'Envía un archivo (imagen, documento, etc.) por URL al número destino a través del canal WhatsApp QR indicado',
				routing: {
					request: { method: 'POST', url: '/direct/wa/sendFile' },
					output: { postReceive: [handleLcResponse] },
				},
			},
			{
				name: 'Enviar Mensaje',
				value: 'sendMessage',
				action: 'Enviar un mensaje',
				description:
					'Envía un mensaje de texto al número destino a través del canal WhatsApp QR indicado',
				routing: {
					request: { method: 'POST', url: '/direct/wa/sendMessage' },
					output: { postReceive: [handleLcResponse] },
				},
			},
			{
				name: 'Enviar Respuesta Rápida',
				value: 'sendQuickAnswer',
				action: 'Enviar una respuesta rápida',
				description:
					'Envía una respuesta rápida al número destino, reemplazando las variables indicadas en el texto. Si la respuesta rápida tiene archivo adjunto, lo envía además del texto.',
				routing: {
					request: { method: 'POST', url: '/direct/wa/sendQuickAnswer' },
					output: { postReceive: [handleLcResponse] },
				},
			},
			{
				name: 'Verificar Número',
				value: 'checkNumber',
				action: 'Verificar un número',
				description:
					'Verifica, contra el canal WhatsApp QR indicado, si el número destino es un usuario válido de WhatsApp',
				routing: {
					request: { method: 'POST', url: '/direct/wa/checkNumber' },
					output: { postReceive: [handleLcResponse] },
				},
			},
		],
		default: 'sendMessage',
	},
];

export const whatsAppFields: INodeProperties[] = [
	// ----------------------------------
	//         whatsapp: checkNumber
	// ----------------------------------
	{
		displayName: 'ID del Canal',
		name: 'id_canal',
		type: 'options',
		typeOptions: { loadOptionsMethod: 'getChannels' },
		required: true,
		default: '',
		description:
			'ID del canal WhatsApp QR (tabla wa_instances). Elige de la lista o especifica un ID con una expresión.',
		displayOptions: {
			show: {
				resource: ['whatsapp'],
				operation: ['checkNumber'],
			},
		},
		routing: {
			send: { type: 'body', property: 'id_canal' },
		},
	},
	{
		displayName: 'Número de Teléfono',
		name: 'numero',
		type: 'string',
		required: true,
		default: '',
		description: 'Número celular a validar',
		displayOptions: {
			show: {
				resource: ['whatsapp'],
				operation: ['checkNumber'],
			},
		},
		routing: {
			send: { type: 'body', property: 'numero' },
		},
	},

	// ----------------------------------
	//         whatsapp: sendFile
	// ----------------------------------
	{
		displayName: 'ID del Canal',
		name: 'id_canal',
		type: 'options',
		typeOptions: { loadOptionsMethod: 'getChannels' },
		required: true,
		default: '',
		description:
			'ID del canal WhatsApp QR (tabla wa_instances). Elige de la lista o especifica un ID con una expresión.',
		displayOptions: {
			show: {
				resource: ['whatsapp'],
				operation: ['sendFile'],
			},
		},
		routing: {
			send: { type: 'body', property: 'id_canal' },
		},
	},
	{
		displayName: 'Número de Teléfono',
		name: 'numero',
		type: 'string',
		required: true,
		default: '',
		description: 'Número celular destino',
		displayOptions: {
			show: {
				resource: ['whatsapp'],
				operation: ['sendFile'],
			},
		},
		routing: {
			send: { type: 'body', property: 'numero' },
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
				resource: ['whatsapp'],
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
				resource: ['whatsapp'],
				operation: ['sendFile'],
			},
		},
		options: [
			{
				displayName: 'Extensión del Archivo',
				name: 'extension',
				type: 'string',
				default: '',
				description: 'Extensión del archivo (opcional, solo canales EC2)',
				routing: { send: { type: 'body', property: 'extension' } },
			},
			{
				displayName: 'Nombre del Archivo',
				name: 'nombre',
				type: 'string',
				default: '',
				description: 'Caption o nombre del archivo',
				routing: { send: { type: 'body', property: 'nombre' } },
			},
			{
				displayName: 'Responder A',
				name: 'replyTo',
				type: 'string',
				default: '',
				description: 'ID del mensaje al que se responde',
				routing: { send: { type: 'body', property: 'replyTo' } },
			},
		],
	},

	// ----------------------------------
	//         whatsapp: sendMessage
	// ----------------------------------
	{
		displayName: 'ID del Canal',
		name: 'id_canal',
		type: 'options',
		typeOptions: { loadOptionsMethod: 'getChannels' },
		required: true,
		default: '',
		description:
			'ID del canal WhatsApp QR (tabla wa_instances). Elige de la lista o especifica un ID con una expresión.',
		displayOptions: {
			show: {
				resource: ['whatsapp'],
				operation: ['sendMessage'],
			},
		},
		routing: {
			send: { type: 'body', property: 'id_canal' },
		},
	},
	{
		displayName: 'Número de Teléfono',
		name: 'numero',
		type: 'string',
		required: true,
		default: '',
		description: 'Número celular destino',
		displayOptions: {
			show: {
				resource: ['whatsapp'],
				operation: ['sendMessage'],
			},
		},
		routing: {
			send: { type: 'body', property: 'numero' },
		},
	},
	{
		displayName: 'Mensaje',
		name: 'mensaje',
		type: 'string',
		typeOptions: { rows: 3 },
		required: true,
		default: '',
		description: 'Texto del mensaje',
		displayOptions: {
			show: {
				resource: ['whatsapp'],
				operation: ['sendMessage'],
			},
		},
		routing: {
			send: { type: 'body', property: 'mensaje' },
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
				resource: ['whatsapp'],
				operation: ['sendMessage'],
			},
		},
		options: [
			{
				displayName: 'Responder A',
				name: 'replyTo',
				type: 'string',
				default: '',
				description: 'ID del mensaje al que se responde',
				routing: { send: { type: 'body', property: 'replyTo' } },
			},
		],
	},

	// ----------------------------------
	//         whatsapp: sendQuickAnswer
	// ----------------------------------
	{
		displayName: 'ID del Canal',
		name: 'id_canal',
		type: 'options',
		typeOptions: { loadOptionsMethod: 'getChannels' },
		required: true,
		default: '',
		description:
			'ID del canal WhatsApp QR (tabla wa_instances). Elige de la lista o especifica un ID con una expresión.',
		displayOptions: {
			show: {
				resource: ['whatsapp'],
				operation: ['sendQuickAnswer'],
			},
		},
		routing: {
			send: { type: 'body', property: 'id_canal' },
		},
	},
	{
		displayName: 'Número de Teléfono',
		name: 'numero',
		type: 'string',
		required: true,
		default: '',
		description: 'Número celular destino',
		displayOptions: {
			show: {
				resource: ['whatsapp'],
				operation: ['sendQuickAnswer'],
			},
		},
		routing: {
			send: { type: 'body', property: 'numero' },
		},
	},
	{
		displayName: 'ID de la Respuesta Rápida',
		name: 'id_respuesta',
		type: 'number',
		required: true,
		default: 0,
		description: 'ID de la respuesta rápida (tabla lc_respuestasrapidas)',
		displayOptions: {
			show: {
				resource: ['whatsapp'],
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
				resource: ['whatsapp'],
				operation: ['sendQuickAnswer'],
			},
		},
		options: [
			{
				displayName: 'Variables',
				name: 'variables',
				type: 'json',
				default: '{}',
				description: 'Variables a reemplazar en el texto, formato {clave: valor}',
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
];
