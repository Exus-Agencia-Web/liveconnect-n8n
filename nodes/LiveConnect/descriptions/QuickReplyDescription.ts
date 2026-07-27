import type { INodeProperties } from 'n8n-workflow';

import { handleLcResponse } from '../GenericFunctions';

export const quickReplyOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['quickReply'],
			},
		},
		options: [
			{
				name: 'Update',
				value: 'update',
				action: 'Update a quick reply',
				description:
					'Update an existing quick reply for the authenticated account. Rejects the change if the new group/shortcut pair is already used by another quick reply.',
				routing: {
					request: { method: 'POST', url: '/quickAnswers/edtQuickReply' },
					output: { postReceive: [handleLcResponse] },
				},
			},
			{
				name: 'Create',
				value: 'create',
				action: 'Create a quick reply',
				description:
					'Create a quick reply shortcut for the authenticated account. Rejects creation if a shortcut with the same name already exists within the same group.',
				routing: {
					request: { method: 'POST', url: '/quickAnswers/addQuickReply' },
					output: { postReceive: [handleLcResponse] },
				},
			},
		],
		default: 'create',
	},
];

export const quickReplyFields: INodeProperties[] = [
	// ----------------------------------
	//         quickReply: create
	// ----------------------------------
	{
		displayName: 'Group',
		name: 'grupo',
		type: 'string',
		required: true,
		default: '',
		description: 'Group/folder the shortcut belongs to',
		displayOptions: {
			show: {
				resource: ['quickReply'],
				operation: ['create'],
			},
		},
		routing: {
			send: { type: 'body', property: 'grupo' },
		},
	},
	{
		displayName: 'Shortcut',
		name: 'atajo',
		type: 'string',
		required: true,
		default: '',
		description: 'Name of the shortcut (unique per group within the account)',
		displayOptions: {
			show: {
				resource: ['quickReply'],
				operation: ['create'],
			},
		},
		routing: {
			send: { type: 'body', property: 'atajo' },
		},
	},
	{
		displayName: 'Reply',
		name: 'respuesta',
		type: 'string',
		typeOptions: { rows: 3 },
		required: true,
		default: '',
		description: 'Text of the quick reply',
		displayOptions: {
			show: {
				resource: ['quickReply'],
				operation: ['create'],
			},
		},
		routing: {
			send: { type: 'body', property: 'respuesta' },
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
				resource: ['quickReply'],
				operation: ['create'],
			},
		},
		options: [
			{
				displayName: 'File ID',
				name: 'file',
				type: 'number',
				default: 0,
				description: 'ID of the attached file (lc_storage)',
				routing: { send: { type: 'body', property: 'file' } },
			},
			{
				displayName: 'Supervisor Name or ID',
				name: 'idSupervisor',
				type: 'options',
				typeOptions: { loadOptionsMethod: 'getUsers' },
				default: '',
				description:
					'ID of the creating user (saved as id_creador). Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
				routing: { send: { type: 'body', property: 'idSupervisor' } },
			},
			{
				displayName: 'File URL',
				name: 'fileurl',
				type: 'string',
				default: '',
				description: 'URL of the attached file',
				routing: { send: { type: 'body', property: 'fileurl' } },
			},
		],
	},

	// ----------------------------------
	//         quickReply: update
	// ----------------------------------
	{
		displayName: 'Quick Reply ID',
		name: 'id',
		type: 'number',
		required: true,
		default: 0,
		description: 'ID of the quick reply to edit',
		displayOptions: {
			show: {
				resource: ['quickReply'],
				operation: ['update'],
			},
		},
		routing: {
			send: { type: 'body', property: 'id' },
		},
	},
	{
		displayName: 'Update Fields',
		name: 'updateFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				resource: ['quickReply'],
				operation: ['update'],
			},
		},
		options: [
			{
				displayName: 'Shortcut',
				name: 'atajo',
				type: 'string',
				default: '',
				description: 'Name of the shortcut (unique per group within the account)',
				routing: { send: { type: 'body', property: 'atajo' } },
			},
			{
				displayName: 'Group',
				name: 'grupo',
				type: 'string',
				default: '',
				description: 'Group/folder the shortcut belongs to',
				routing: { send: { type: 'body', property: 'grupo' } },
			},
			{
				displayName: 'File ID',
				name: 'file',
				type: 'number',
				default: 0,
				description: 'ID of the attached file (lc_storage)',
				routing: { send: { type: 'body', property: 'file' } },
			},
			{
				displayName: 'Editor Name or ID',
				name: 'id_usuario',
				type: 'options',
				typeOptions: { loadOptionsMethod: 'getUsers' },
				default: '',
				description:
					'ID of the editing user. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
				routing: { send: { type: 'body', property: 'id_usuario' } },
			},
			{
				displayName: 'Reply',
				name: 'respuesta',
				type: 'string',
				typeOptions: { rows: 3 },
				default: '',
				description: 'Text of the quick reply',
				routing: { send: { type: 'body', property: 'respuesta' } },
			},
			{
				displayName: 'File URL',
				name: 'fileurl',
				type: 'string',
				default: '',
				description: 'URL of the attached file',
				routing: { send: { type: 'body', property: 'fileurl' } },
			},
		],
	},
];
