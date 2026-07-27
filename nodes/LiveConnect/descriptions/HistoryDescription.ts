import type { INodeProperties } from 'n8n-workflow';

import { handleLcResponse } from '../GenericFunctions';

export const historyOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['history'],
			},
		},
		options: [
			{
				name: 'Get Attachments',
				value: 'getAttachments',
				action: 'Get the attachments of a conversation',
				description: 'Lists the attachments (files) of a conversation',
				routing: {
					request: { method: 'POST', url: '/history/attachments' },
					output: { postReceive: [handleLcResponse] },
				},
			},
			{
				name: 'Get Conversation',
				value: 'getConversation',
				action: 'Get a conversation',
				description: 'Returns a conversation along with its messages, attachments, and participants',
				routing: {
					request: { method: 'POST', url: '/history/conversation' },
					output: { postReceive: [handleLcResponse] },
				},
			},
			{
				name: 'Get Messages',
				value: 'getMessages',
				action: 'Get the messages of a conversation',
				description: 'Lists the messages of a conversation',
				routing: {
					request: { method: 'POST', url: '/history/messages' },
					output: { postReceive: [handleLcResponse] },
				},
			},
			{
				name: 'Get Participants',
				value: 'getParticipants',
				action: 'Get the participants of a conversation',
				description: 'Lists the participants (agents) of a conversation',
				routing: {
					request: { method: 'POST', url: '/history/participants' },
					output: { postReceive: [handleLcResponse] },
				},
			},
			{
				name: 'Get Many Conversations',
				value: 'getManyConversations',
				action: 'Get many conversations',
				description: 'Lists the historical conversations of the account, paginated and with optional filters',
				routing: {
					request: { method: 'POST', url: '/history/conversations' },
					output: { postReceive: [handleLcResponse] },
				},
			},
		],
		default: 'getManyConversations',
	},
];

export const historyFields: INodeProperties[] = [
	// ----------------------------------
	//         history: getAttachments
	// ----------------------------------
	{
		displayName: 'Filters',
		name: 'filters',
		type: 'collection',
		placeholder: 'Add Filter',
		default: {},
		description: 'Requires the conversation ID or the Firebase conversation ID',
		displayOptions: {
			show: {
				resource: ['history'],
				operation: ['getAttachments'],
			},
		},
		options: [
			{
				displayName: 'Offset',
				name: 'initFrom',
				type: 'number',
				default: 0,
				description: 'Pagination offset',
				routing: { send: { type: 'body', property: 'initFrom' } },
			},
			{
				displayName: 'Firebase Conversation ID',
				name: 'id_conversacion_fb',
				type: 'string',
				default: '',
				routing: { send: { type: 'body', property: 'id_conversacion_fb' } },
			},
			{
				displayName: 'Conversation ID',
				name: 'id_conversacion',
				type: 'number',
				default: 0,
				routing: { send: { type: 'body', property: 'id_conversacion' } },
			},
			{
				displayName: 'Attachment ID',
				name: 'id',
				type: 'number',
				default: 0,
				description: 'ID of the attachment (returns a single object)',
				routing: { send: { type: 'body', property: 'id' } },
			},
			{
				displayName: 'Limit',
				name: 'limit',
				type: 'number',
				typeOptions: { minValue: 1 },
				default: 50,
				description: 'Max number of results to return',
				routing: { send: { type: 'body', property: 'limit' } },
			},
		],
	},

	// ----------------------------------
	//         history: getConversation
	// ----------------------------------
	{
		displayName: 'Search Fields',
		name: 'searchFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		description: 'Requires the conversation ID or the Firebase conversation ID',
		displayOptions: {
			show: {
				resource: ['history'],
				operation: ['getConversation'],
			},
		},
		options: [
			{
				displayName: 'Firebase Conversation ID',
				name: 'id_conversacion_fb',
				type: 'string',
				default: '',
				routing: { send: { type: 'body', property: 'id_conversacion_fb' } },
			},
			{
				displayName: 'Conversation ID',
				name: 'id',
				type: 'number',
				default: 0,
				routing: { send: { type: 'body', property: 'id' } },
			},
		],
	},

	// ----------------------------------
	//         history: getManyConversations
	// ----------------------------------
	{
		displayName: 'Filters',
		name: 'filters',
		type: 'collection',
		placeholder: 'Add Filter',
		default: {},
		displayOptions: {
			show: {
				resource: ['history'],
				operation: ['getManyConversations'],
			},
		},
		options: [
			{
				displayName: 'Offset',
				name: 'initFrom',
				type: 'number',
				default: 0,
				description: 'Pagination offset',
				routing: { send: { type: 'body', property: 'initFrom' } },
			},
			{
				displayName: 'Firebase Conversation ID',
				name: 'id_conversacion_fb',
				type: 'string',
				default: '',
				description: 'Firebase conversation ID (returns a single object)',
				routing: { send: { type: 'body', property: 'id_conversacion_fb' } },
			},
			{
				displayName: 'Conversation ID',
				name: 'id',
				type: 'number',
				default: 0,
				description: 'Conversation ID (returns a single object)',
				routing: { send: { type: 'body', property: 'id' } },
			},
			{
				displayName: 'Channel Name or ID',
				name: 'id_canal',
				type: 'options',
				typeOptions: { loadOptionsMethod: 'getChannels' },
				default: '',
				description:
					'Filter by channel. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
				routing: { send: { type: 'body', property: 'id_canal' } },
			},
			{
				displayName: 'Contact ID',
				name: 'id_contacto',
				type: 'number',
				default: 0,
				description: 'Filter by contact',
				routing: { send: { type: 'body', property: 'id_contacto' } },
			},
			{
				displayName: 'Team Name or ID',
				name: 'id_grupo',
				type: 'options',
				typeOptions: { loadOptionsMethod: 'getGroups' },
				default: '',
				description:
					'Filter by team. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
				routing: { send: { type: 'body', property: 'id_grupo' } },
			},
			{
				displayName: 'User Name or ID',
				name: 'id_usuario',
				type: 'options',
				typeOptions: { loadOptionsMethod: 'getUsers' },
				default: '',
				description:
					'Filter by assigned agent. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
				routing: { send: { type: 'body', property: 'id_usuario' } },
			},
			{
				displayName: 'Tag IDs',
				name: 'etiquetas',
				type: 'string',
				default: '',
				placeholder: '1,2,3',
				description: 'Filter by associated tag IDs, comma-separated',
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
				displayName: 'Limit',
				name: 'limit',
				type: 'number',
				typeOptions: { minValue: 1 },
				default: 50,
				description: 'Max number of results to return',
				routing: { send: { type: 'body', property: 'limit' } },
			},
		],
	},

	// ----------------------------------
	//         history: getMessages
	// ----------------------------------
	{
		displayName: 'Filters',
		name: 'filters',
		type: 'collection',
		placeholder: 'Add Filter',
		default: {},
		description: 'Requires the conversation ID or the Firebase conversation ID',
		displayOptions: {
			show: {
				resource: ['history'],
				operation: ['getMessages'],
			},
		},
		options: [
			{
				displayName: 'Offset',
				name: 'initFrom',
				type: 'number',
				default: 0,
				description: 'Pagination offset',
				routing: { send: { type: 'body', property: 'initFrom' } },
			},
			{
				displayName: 'Firebase Conversation ID',
				name: 'id_conversacion_fb',
				type: 'string',
				default: '',
				routing: { send: { type: 'body', property: 'id_conversacion_fb' } },
			},
			{
				displayName: 'Conversation ID',
				name: 'id_conversacion',
				type: 'number',
				default: 0,
				routing: { send: { type: 'body', property: 'id_conversacion' } },
			},
			{
				displayName: 'Message ID',
				name: 'id',
				type: 'number',
				default: 0,
				description: 'ID of the message (returns a single object)',
				routing: { send: { type: 'body', property: 'id' } },
			},
			{
				displayName: 'Limit',
				name: 'limit',
				type: 'number',
				typeOptions: { minValue: 1 },
				default: 50,
				description: 'Max number of results to return',
				routing: { send: { type: 'body', property: 'limit' } },
			},
		],
	},

	// ----------------------------------
	//         history: getParticipants
	// ----------------------------------
	{
		displayName: 'Filters',
		name: 'filters',
		type: 'collection',
		placeholder: 'Add Filter',
		default: {},
		description: 'Requires the conversation ID or the Firebase conversation ID',
		displayOptions: {
			show: {
				resource: ['history'],
				operation: ['getParticipants'],
			},
		},
		options: [
			{
				displayName: 'Offset',
				name: 'initFrom',
				type: 'number',
				default: 0,
				description: 'Pagination offset',
				routing: { send: { type: 'body', property: 'initFrom' } },
			},
			{
				displayName: 'Firebase Conversation ID',
				name: 'id_conversacion_fb',
				type: 'string',
				default: '',
				routing: { send: { type: 'body', property: 'id_conversacion_fb' } },
			},
			{
				displayName: 'Conversation ID',
				name: 'id_conversacion',
				type: 'number',
				default: 0,
				routing: { send: { type: 'body', property: 'id_conversacion' } },
			},
			{
				displayName: 'Participant ID',
				name: 'id',
				type: 'number',
				default: 0,
				description: 'ID of the participant (returns a single object)',
				routing: { send: { type: 'body', property: 'id' } },
			},
			{
				displayName: 'Limit',
				name: 'limit',
				type: 'number',
				typeOptions: { minValue: 1 },
				default: 50,
				description: 'Max number of results to return',
				routing: { send: { type: 'body', property: 'limit' } },
			},
		],
	},
];
