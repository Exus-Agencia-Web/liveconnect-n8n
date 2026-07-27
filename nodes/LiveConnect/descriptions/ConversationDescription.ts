import type { INodeProperties } from 'n8n-workflow';

import { handleLcResponse } from '../GenericFunctions';

export const conversationOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['conversation'],
			},
		},
		options: [
			{
				name: 'Create',
				value: 'create',
				action: 'Create a conversation',
				description:
					'Open a conversation in the specified channel. If an active conversation with the contact already exists, it is not duplicated: the existing one is returned and the user is added as a participant.',
				routing: {
					request: { method: 'POST', url: '/conversation/create' },
					output: { postReceive: [handleLcResponse] },
				},
			},
		],
		default: 'create',
	},
];

export const conversationFields: INodeProperties[] = [
	// ----------------------------------
	//         conversation: create
	// ----------------------------------
	{
		displayName: 'Channel Name or ID',
		name: 'id_canal',
		type: 'options',
		typeOptions: { loadOptionsMethod: 'getChannels' },
		required: true,
		default: '',
		description:
			'ID of the account channel through which the conversation is started. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
		displayOptions: {
			show: {
				resource: ['conversation'],
				operation: ['create'],
			},
		},
		routing: {
			send: { type: 'body', property: 'id_canal' },
		},
	},
	{
		displayName: 'Contact',
		name: 'contacto',
		type: 'json',
		required: true,
		default: '{}',
		description:
			'Identify the contact by at least one of these fields: celular, username or numero',
		displayOptions: {
			show: {
				resource: ['conversation'],
				operation: ['create'],
			},
		},
		routing: {
			send: {
				type: 'body',
				property: 'contacto',
				value: '={{ typeof $value === "object" && $value !== null ? $value : JSON.parse($value || "{}") }}',
			},
		},
	},
	{
		displayName: 'User',
		name: 'usuario',
		type: 'json',
		required: true,
		default: '{}',
		description: 'Agent who starts the conversation. Requires id_equipo, or ID + nombre. If id_equipo is sent without ID, the conversation is left without an assigned agent (team only).',
		displayOptions: {
			show: {
				resource: ['conversation'],
				operation: ['create'],
			},
		},
		routing: {
			send: {
				type: 'body',
				property: 'usuario',
				value: '={{ typeof $value === "object" && $value !== null ? $value : JSON.parse($value || "{}") }}',
			},
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
				resource: ['conversation'],
				operation: ['create'],
			},
		},
		options: [
			{
				displayName: 'Template',
				name: 'template',
				type: 'json',
				default: '{}',
				description: 'Template to send (WABA), instead of text',
				routing: {
					send: {
						type: 'body',
						property: 'template',
						value: '={{ typeof $value === "object" && $value !== null ? $value : JSON.parse($value || "{}") }}',
					},
				},
			},
			{
				displayName: 'Text',
				name: 'texto',
				type: 'string',
				typeOptions: { rows: 3 },
				default: '',
				description: 'Initial message (optional)',
				routing: { send: { type: 'body', property: 'texto' } },
			},
		],
	},
];
