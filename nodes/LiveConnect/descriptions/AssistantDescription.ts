import type { INodeProperties } from 'n8n-workflow';

import { handleLcResponse } from '../GenericFunctions';

export const assistantOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['assistant'],
			},
		},
		options: [
			{
				name: 'Update',
				value: 'update',
				action: 'Update an assistant',
				description: 'Update the name and/or rules of an existing assistant',
				routing: {
					request: { method: 'POST', url: '/assistant/edtAssistant' },
					output: { postReceive: [handleLcResponse] },
				},
			},
			{
				name: 'Create',
				value: 'create',
				action: 'Create an assistant',
				description: 'Create an AI assistant in the account',
				routing: {
					request: { method: 'POST', url: '/assistant/addAssistant' },
					output: { postReceive: [handleLcResponse] },
				},
			},
			{
				name: 'Get Many',
				value: 'getMany',
				action: 'Get many assistants',
				description: 'List the AI assistants in the account, optionally filtered by ID',
				routing: {
					request: { method: 'GET', url: '/assistant/listAssistant' },
					output: { postReceive: [handleLcResponse] },
				},
			},
		],
		default: 'getMany',
	},
];

export const assistantFields: INodeProperties[] = [
	// ----------------------------------
	//         assistant: create
	// ----------------------------------
	{
		displayName: 'Name',
		name: 'nombre',
		type: 'string',
		required: true,
		default: '',
		description: 'Name of the assistant',
		displayOptions: {
			show: {
				resource: ['assistant'],
				operation: ['create'],
			},
		},
		routing: {
			send: { type: 'body', property: 'nombre' },
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
				resource: ['assistant'],
				operation: ['create'],
			},
		},
		options: [
			{
				displayName: 'Brain Template ID',
				name: 'brainSelected',
				type: 'number',
				default: 0,
				description: 'ID of the brain template to apply as initial rules',
				routing: { send: { type: 'body', property: 'brainSelected' } },
			},
			{
				displayName: 'Memory',
				name: 'memory',
				type: 'json',
				default: '{}',
				description: 'Initial memory to assign (ignored when Type is Skip Initial Memory)',
				routing: {
					send: {
						type: 'body',
						property: 'memory',
						value: '={{ typeof $value === "object" && $value !== null ? $value : JSON.parse($value || "{}") }}',
					},
				},
			},
			{
				displayName: 'Type',
				name: 'type',
				type: 'options',
				options: [
					{ name: 'Standard', value: 0 },
					{ name: 'Skip Initial Memory', value: 1 },
				],
				default: 0,
				description:
					'Creation type of the assistant. Skip Initial Memory forces creation without assigning initial memories.',
				routing: { send: { type: 'body', property: 'type' } },
			},
		],
	},

	// ----------------------------------
	//         assistant: getMany
	// ----------------------------------
	{
		displayName: 'Filters',
		name: 'filters',
		type: 'collection',
		placeholder: 'Add Filter',
		default: {},
		displayOptions: {
			show: {
				resource: ['assistant'],
				operation: ['getMany'],
			},
		},
		options: [
			{
				displayName: 'Assistant ID',
				name: 'id',
				type: 'number',
				default: 0,
				description: 'Filter by assistant ID',
				routing: { send: { type: 'query', property: 'id' } },
			},
		],
	},

	// ----------------------------------
	//         assistant: update
	// ----------------------------------
	{
		displayName: 'Assistant ID',
		name: 'id',
		type: 'number',
		required: true,
		default: 0,
		description: 'ID of the assistant to edit',
		displayOptions: {
			show: {
				resource: ['assistant'],
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
				resource: ['assistant'],
				operation: ['update'],
			},
		},
		options: [
			{
				displayName: 'Name',
				name: 'nombre',
				type: 'string',
				default: '',
				description: 'Name of the assistant',
				routing: { send: { type: 'body', property: 'nombre' } },
			},
			{
				displayName: 'Rules',
				name: 'reglas',
				type: 'json',
				default: '{}',
				description: 'Configuration/rules of the assistant',
				routing: {
					send: {
						type: 'body',
						property: 'reglas',
						value: '={{ typeof $value === "object" && $value !== null ? $value : JSON.parse($value || "{}") }}',
					},
				},
			},
		],
	},
];
