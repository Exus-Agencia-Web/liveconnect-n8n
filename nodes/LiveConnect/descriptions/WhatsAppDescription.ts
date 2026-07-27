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
				name: 'Send File',
				value: 'sendFile',
				action: 'Send a file',
				description:
					'Sends a file (image, document, etc.) by URL to the destination number through the specified WhatsApp QR channel',
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
					'Sends a text message to the destination number through the specified WhatsApp QR channel',
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
					'Sends a quick reply to the destination number, replacing the specified variables in the text. If the quick reply has an attached file, it is sent along with the text.',
				routing: {
					request: { method: 'POST', url: '/direct/wa/sendQuickAnswer' },
					output: { postReceive: [handleLcResponse] },
				},
			},
			{
				name: 'Check Number',
				value: 'checkNumber',
				action: 'Check a number',
				description:
					'Checks, against the specified WhatsApp QR channel, whether the destination number is a valid WhatsApp user',
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
		displayName: 'Channel Name or ID',
		name: 'id_canal',
		type: 'options',
		typeOptions: { loadOptionsMethod: 'getWhatsAppChannels' },
		required: true,
		default: '',
		description:
			'WhatsApp QR channel ID (table wa_instances). Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
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
		description: 'Phone number to validate',
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
		displayName: 'Channel Name or ID',
		name: 'id_canal',
		type: 'options',
		typeOptions: { loadOptionsMethod: 'getWhatsAppChannels' },
		required: true,
		default: '',
		description:
			'WhatsApp QR channel ID (table wa_instances). Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
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
		description: 'Destination phone number',
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
		description: 'Public URL of the file to send',
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
				description: 'File extension (optional, EC2 channels only)',
				routing: { send: { type: 'body', property: 'extension' } },
			},
			{
				displayName: 'File Name',
				name: 'nombre',
				type: 'string',
				default: '',
				description: 'Caption or file name',
				routing: { send: { type: 'body', property: 'nombre' } },
			},
			{
				displayName: 'Reply To',
				name: 'replyTo',
				type: 'string',
				default: '',
				description: 'ID of the message being replied to',
				routing: { send: { type: 'body', property: 'replyTo' } },
			},
		],
	},

	// ----------------------------------
	//         whatsapp: sendMessage
	// ----------------------------------
	{
		displayName: 'Channel Name or ID',
		name: 'id_canal',
		type: 'options',
		typeOptions: { loadOptionsMethod: 'getWhatsAppChannels' },
		required: true,
		default: '',
		description:
			'WhatsApp QR channel ID (table wa_instances). Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
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
		description: 'Destination phone number',
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
		description: 'Message text',
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
				description: 'ID of the message being replied to',
				routing: { send: { type: 'body', property: 'replyTo' } },
			},
		],
	},

	// ----------------------------------
	//         whatsapp: sendQuickAnswer
	// ----------------------------------
	{
		displayName: 'Channel Name or ID',
		name: 'id_canal',
		type: 'options',
		typeOptions: { loadOptionsMethod: 'getWhatsAppChannels' },
		required: true,
		default: '',
		description:
			'WhatsApp QR channel ID (table wa_instances). Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
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
		description: 'Destination phone number',
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
		description: 'ID of the quick reply (table lc_respuestasrapidas)',
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
				description: 'Variables to replace in the text, format {key: value}',
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
