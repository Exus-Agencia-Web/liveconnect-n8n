import type { INodeProperties } from 'n8n-workflow';

import { handleLcResponse } from '../GenericFunctions';

export const proxyOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
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
				name: 'Set Webhook',
				value: 'setWebhook',
				action: 'Set a webhook',
				description: 'With status 1, creates (or replaces) the channel webhook in DynamoDB; any other value removes it',
				routing: {
					request: { method: 'POST', url: '/proxy/setWebhook' },
					output: { postReceive: [handleLcResponse] },
				},
			},
			{
				name: 'Get Balance',
				value: 'getBalance',
				action: 'Get the proxy balance',
				description: 'Returns the available balance and the conversation proxy configuration for the authenticated account',
				routing: {
					request: { method: 'GET', url: '/proxy/balance' },
					output: { postReceive: [handleLcResponse] },
				},
			},
			{
				name: 'Get Webhook',
				value: 'getWebhook',
				action: 'Get a webhook',
				description: 'Returns the webhook configuration (DynamoDB) associated with the specified channel, if any',
				routing: {
					request: { method: 'POST', url: '/proxy/getWebhook' },
					output: { postReceive: [handleLcResponse] },
				},
			},
			{
				name: 'Send File',
				value: 'sendFile',
				action: 'Send a file',
				description:
					'Deducts balance from the account proxy and queues the file to the specified conversation. Only allows the extensions jpg, png, gif, pdf, doc, docx, xls, xlsx, ppt, and pptx.',
				routing: {
					request: { method: 'POST', url: '/proxy/sendFile' },
					output: { postReceive: [handleLcResponse] },
				},
			},
			{
				name: 'Send Message',
				value: 'sendMessage',
				action: 'Send a message',
				description: 'Deducts balance from the account proxy and queues the message to the specified conversation',
				routing: {
					request: { method: 'POST', url: '/proxy/sendMessage' },
					output: { postReceive: [handleLcResponse] },
				},
			},
			{
				name: 'Send Quick Reply',
				value: 'sendQuickAnswer',
				action: 'Send a quick reply',
				description: 'Looks up the quick reply by its ID, replaces its variables, and sends it (text and/or attachment) to the specified conversation',
				routing: {
					request: { method: 'POST', url: '/proxy/sendQuickAnswer' },
					output: { postReceive: [handleLcResponse] },
				},
			},
			{
				name: 'Transfer',
				value: 'transfer',
				action: 'Transfer a conversation',
				description:
					'With status 1, marks the conversation as transferred to the proxy (creates the conversation in LiveConnect and, if a message is sent, the first message) and sets the time to live according to the account configuration. Any other value releases the transfer.',
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
		displayName: 'Channel Name or ID',
		name: 'id_canal',
		type: 'options',
		typeOptions: { loadOptionsMethod: 'getChannels' },
		required: true,
		default: '',
		description:
			'ID of the channel for the account. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
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
		displayName: 'Conversation ID',
		name: 'id_conversacion',
		type: 'string',
		required: true,
		default: '',
		description: 'LiveConnect conversation ID',
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
		displayName: 'File URL',
		name: 'url',
		type: 'string',
		required: true,
		default: '',
		description: 'Public URL of the file to send',
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
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				resource: ['proxy'],
				operation: ['sendFile'],
			},
		},
		options: [
			{
				displayName: 'Extension',
				name: 'extension',
				type: 'string',
				default: '',
				description: 'File extension (by default, inferred from the URL)',
				routing: { send: { type: 'body', property: 'extension' } },
			},
			{
				displayName: 'Name',
				name: 'nombre',
				type: 'string',
				default: '',
				description: 'File name/title (by default, the one from the file in the URL)',
				routing: { send: { type: 'body', property: 'nombre' } },
			},
		],
	},

	// ----------------------------------
	//         proxy: sendMessage
	// ----------------------------------
	{
		displayName: 'Conversation ID',
		name: 'id_conversacion',
		type: 'string',
		required: true,
		default: '',
		description: 'LiveConnect conversation ID',
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
		displayName: 'Message',
		name: 'mensaje',
		type: 'string',
		typeOptions: { rows: 3 },
		required: true,
		default: '',
		description: 'Text to send',
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
		displayName: 'Conversation ID',
		name: 'id_conversacion',
		type: 'string',
		required: true,
		default: '',
		description: 'LiveConnect conversation ID',
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
		displayName: 'Quick Reply ID',
		name: 'id_respuesta',
		type: 'number',
		required: true,
		default: 0,
		description: 'ID of the quick reply (lc_respuestasrapidas)',
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
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
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
				description: 'Values to replace the {key} markers in the text',
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
		displayName: 'Channel Name or ID',
		name: 'id_canal',
		type: 'options',
		typeOptions: { loadOptionsMethod: 'getChannels' },
		required: true,
		default: '',
		description:
			'ID of the channel for the account. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
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
		displayName: 'Webhook URL',
		name: 'url',
		type: 'string',
		required: true,
		default: '',
		description: 'URL of the webhook to notify',
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
		displayName: 'Status',
		name: 'estado',
		type: 'options',
		options: [
			{ name: 'No', value: 0 },
			{ name: 'Yes', value: 1 },
		],
		required: true,
		default: 1,
		description: 'Yes sets the webhook; No removes it',
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
		displayName: 'Secret',
		name: 'secret',
		type: 'string',
		typeOptions: { password: true },
		required: true,
		default: '',
		description: 'Secret sent with every webhook notification',
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
		displayName: 'Conversation ID',
		name: 'id_conversacion',
		type: 'string',
		required: true,
		default: '',
		description: 'LiveConnect conversation ID',
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
		displayName: 'Status',
		name: 'estado',
		type: 'options',
		options: [
			{ name: 'No', value: 0 },
			{ name: 'Yes', value: 1 },
		],
		required: true,
		default: 1,
		description: 'Yes transfers the conversation to the proxy; No releases the transfer',
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
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				resource: ['proxy'],
				operation: ['transfer'],
			},
		},
		options: [
			{
				displayName: 'Agent',
				name: 'usuario',
				type: 'json',
				default: '{}',
				description: 'Agent to assign to the conversation (object with ID)',
				routing: {
					send: {
						type: 'body',
						property: 'usuario',
						value: '={{ typeof $value === "object" && $value !== null ? $value : JSON.parse($value || "{}") }}',
					},
				},
			},
			{
				displayName: 'Contact',
				name: 'contacto',
				type: 'json',
				default: '{}',
				description: 'Contact details (name, email, phone number, etc.)',
				routing: {
					send: {
						type: 'body',
						property: 'contacto',
						value: '={{ typeof $value === "object" && $value !== null ? $value : JSON.parse($value || "{}") }}',
					},
				},
			},
			{
				displayName: 'Channel Name or ID',
				name: 'id_canal',
				type: 'options',
				typeOptions: { loadOptionsMethod: 'getChannels' },
				default: '',
				description:
					'ID of the channel (required when transferring the conversation to the proxy). Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
				routing: { send: { type: 'body', property: 'id_canal' } },
			},
			{
				displayName: 'Team Name or ID',
				name: 'id_grupo',
				type: 'options',
				typeOptions: { loadOptionsMethod: 'getGroups' },
				default: '',
				description:
					'ID of the team of agents to assign. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
				routing: { send: { type: 'body', property: 'id_grupo' } },
			},
			{
				displayName: 'Tag IDs',
				name: 'etiquetas',
				type: 'string',
				default: '',
				placeholder: '1,2,3',
				description: 'IDs of the tags to apply to the contact, separated by commas',
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
				displayName: 'Message',
				name: 'mensaje',
				type: 'string',
				typeOptions: { rows: 3 },
				default: '',
				description: 'Initial message to send when creating the conversation',
				routing: { send: { type: 'body', property: 'mensaje' } },
			},
			{
				displayName: 'Source Note',
				name: 'info_mensaje',
				type: 'string',
				default: '',
				description: 'Internal note about the source of the transfer',
				routing: { send: { type: 'body', property: 'info_mensaje' } },
			},
		],
	},
];
