import type { INodeProperties } from 'n8n-workflow';

import { handleLcResponse } from '../GenericFunctions';

export const dealTaskOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['dealTask'],
			},
		},
		options: [
			{
				name: 'Update',
				value: 'update',
				action: 'Update a task',
				description:
					'Edit the text and/or date of a task. Allows reassignment based on the permissions of the user making the edit.',
				routing: {
					request: { method: 'POST', url: '/crm/editTask' },
					output: { postReceive: [handleLcResponse] },
				},
			},
			{
				name: 'Create',
				value: 'create',
				action: 'Create a task',
				description:
					'Create a task note and link it to the deal. If the Contact ID is not sent, it is taken from the deal; if the Assigned User ID is not sent, it is assigned to the deal owner.',
				routing: {
					request: { method: 'POST', url: '/crm/addTask' },
					output: { postReceive: [handleLcResponse] },
				},
			},
			{
				name: 'Delete',
				value: 'delete',
				action: 'Delete a task',
				description:
					'Delete the link with the deal and the associated note. Only the assignee or the task creator can delete it.',
				routing: {
					request: { method: 'POST', url: '/crm/deleteTask' },
					output: { postReceive: [handleLcResponse] },
				},
			},
		],
		default: 'create',
	},
];

export const dealTaskFields: INodeProperties[] = [
	// ----------------------------------
	//         dealTask: create
	// ----------------------------------
	{
		displayName: 'Deal ID',
		name: 'id_deal',
		type: 'number',
		required: true,
		default: 0,
		description: 'Sequential number of the deal the task is linked to',
		displayOptions: {
			show: {
				resource: ['dealTask'],
				operation: ['create'],
			},
		},
		routing: {
			send: { type: 'body', property: 'id_deal' },
		},
	},
	{
		displayName: 'Note',
		name: 'nota',
		type: 'string',
		required: true,
		typeOptions: { rows: 3 },
		default: '',
		description: 'Text of the task',
		displayOptions: {
			show: {
				resource: ['dealTask'],
				operation: ['create'],
			},
		},
		routing: {
			send: { type: 'body', property: 'nota' },
		},
	},
	{
		displayName: 'Date',
		name: 'fecha',
		type: 'string',
		required: true,
		default: '',
		placeholder: 'YYYY-MM-DD HH:mm:ss',
		description: 'Date and time of the task',
		displayOptions: {
			show: {
				resource: ['dealTask'],
				operation: ['create'],
			},
		},
		routing: {
			send: { type: 'body', property: 'fecha' },
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
				resource: ['dealTask'],
				operation: ['create'],
			},
		},
		options: [
			{
				displayName: 'Contact ID',
				name: 'id_contacto',
				type: 'number',
				default: 0,
				description: 'Contact for the task; defaults to the deal contact',
				routing: { send: { type: 'body', property: 'id_contacto' } },
			},
			{
				displayName: 'Assigned User Name or ID',
				name: 'id_usuario',
				type: 'options',
				typeOptions: { loadOptionsMethod: 'getUsers' },
				default: '',
				description:
					'Assigned user; defaults to the deal owner. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
				routing: { send: { type: 'body', property: 'id_usuario' } },
			},
			{
				displayName: 'Internal Deal ID',
				name: 'id_interno',
				type: 'number',
				default: 0,
				description: 'Internal ID of the deal (alternative to Deal ID/sequential number)',
				routing: { send: { type: 'body', property: 'id_interno' } },
			},
		],
	},

	// ----------------------------------
	//         dealTask: delete
	// ----------------------------------
	{
		displayName: 'Task ID',
		name: 'id',
		type: 'number',
		required: true,
		default: 0,
		description: 'ID of the task to delete',
		displayOptions: {
			show: {
				resource: ['dealTask'],
				operation: ['delete'],
			},
		},
		routing: {
			send: { type: 'body', property: 'id' },
		},
	},

	// ----------------------------------
	//         dealTask: update
	// ----------------------------------
	{
		displayName: 'Task ID',
		name: 'id',
		type: 'number',
		required: true,
		default: 0,
		description: 'ID of the task, not the sequential number of the deal',
		displayOptions: {
			show: {
				resource: ['dealTask'],
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
				resource: ['dealTask'],
				operation: ['update'],
			},
		},
		options: [
			{
				displayName: 'Date',
				name: 'fecha',
				type: 'string',
				default: '',
				placeholder: 'YYYY-MM-DD HH:mm:ss',
				description: 'Date and time of the task',
				routing: { send: { type: 'body', property: 'fecha' } },
			},
			{
				displayName: 'Assignee Name or ID',
				name: 'id_asignado',
				type: 'options',
				typeOptions: { loadOptionsMethod: 'getUsers' },
				default: '',
				description:
					'Alias of Assigned User ID to reassign the task. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
				routing: { send: { type: 'body', property: 'id_asignado' } },
			},
			{
				displayName: 'Assigned User Name or ID',
				name: 'id_usuario',
				type: 'options',
				typeOptions: { loadOptionsMethod: 'getUsers' },
				default: '',
				description:
					'Reassigns the task to this user (alias: id_asignado). Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
				routing: { send: { type: 'body', property: 'id_usuario' } },
			},
			{
				displayName: 'Note',
				name: 'nota',
				type: 'string',
				typeOptions: { rows: 3 },
				default: '',
				description: 'Text of the task',
				routing: { send: { type: 'body', property: 'nota' } },
			},
		],
	},
];
