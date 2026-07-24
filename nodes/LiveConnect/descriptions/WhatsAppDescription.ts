import type { INodeProperties } from 'n8n-workflow';

import { handleLcResponse } from '../GenericFunctions';

export const whatsAppOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
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
				name: 'Check Number',
				value: 'checkNumber',
				action: 'Check a number',
				description:
					'Verifica, contra el canal WhatsApp QR indicado, si el número destino es un usuario válido de WhatsApp',
				routing: {
					request: { method: 'POST', url: '/direct/wa/checkNumber' },
					output: { postReceive: [handleLcResponse] },
				},
			},
			{
				name: 'Send File',
				value: 'sendFile',
				action: 'Send a file',
				description:
					'Envía un archivo (imagen, documento, etc.) por URL al número destino a través del canal WhatsApp QR indicado',
				routing: {
					request: { method: 'POST', url: '/direct/wa/sendFile' },
					output: { postReceive: [handleLcResponse] },
				},
			},
			{
				name: 'Send Message',
				value: 'sendMessage',
				action: 'Send a message',
				description:
					'Envía un mensaje de texto al número destino a través del canal WhatsApp QR indicado',
				routing: {
					request: { method: 'POST', url: '/direct/wa/sendMessage' },
					output: { postReceive: [handleLcResponse] },
				},
			},
			{
				name: 'Send Quick Reply',
				value: 'sendQuickAnswer',
				action: 'Send a quick reply',
				description:
					'Envía una respuesta rápida al número destino, reemplazando las variables indicadas en el texto. Si la respuesta rápida tiene archivo adjunto, lo envía además del texto.',
				routing: {
					request: { method: 'POST', url: '/direct/wa/sendQuickAnswer' },
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
		displayName: 'Channel ID',
		name: 'id_canal',
		type: 'number',
		required: true,
		default: 0,
		description: 'ID del canal WhatsApp QR (tabla wa_instances)',
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
		displayName: 'Phone Number',
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
		displayName: 'Channel ID',
		name: 'id_canal',
		type: 'number',
		required: true,
		default: 0,
		description: 'ID del canal WhatsApp QR (tabla wa_instances)',
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
		displayName: 'Phone Number',
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
		displayName: 'File URL',
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
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				resource: ['whatsapp'],
				operation: ['sendFile'],
			},
		},
		options: [
			{
				displayName: 'File Extension',
				name: 'extension',
				type: 'string',
				default: '',
				description: 'Extensión del archivo (opcional, solo canales EC2)',
				routing: { send: { type: 'body', property: 'extension' } },
			},
			{
				displayName: 'File Name',
				name: 'nombre',
				type: 'string',
				default: '',
				description: 'Caption o nombre del archivo',
				routing: { send: { type: 'body', property: 'nombre' } },
			},
			{
				displayName: 'Reply To',
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
		displayName: 'Channel ID',
		name: 'id_canal',
		type: 'number',
		required: true,
		default: 0,
		description: 'ID del canal WhatsApp QR (tabla wa_instances)',
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
		displayName: 'Phone Number',
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
		displayName: 'Message',
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
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				resource: ['whatsapp'],
				operation: ['sendMessage'],
			},
		},
		options: [
			{
				displayName: 'Reply To',
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
		displayName: 'Channel ID',
		name: 'id_canal',
		type: 'number',
		required: true,
		default: 0,
		description: 'ID del canal WhatsApp QR (tabla wa_instances)',
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
		displayName: 'Phone Number',
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
		displayName: 'Quick Reply ID',
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
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
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
