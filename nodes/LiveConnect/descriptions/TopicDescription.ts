import type { INodeProperties } from 'n8n-workflow';

import { handleLcResponse } from '../GenericFunctions';

export const topicOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['topic'],
			},
		},
		options: [
			{
				name: 'Update',
				value: 'update',
				action: 'Update a topic',
				description: 'Update the fields of an existing memory',
				routing: {
					request: { method: 'POST', url: '/assistant/edtTopic' },
					output: { postReceive: [handleLcResponse] },
				},
			},
			{
				name: 'Create',
				value: 'create',
				action: 'Create a topic',
				description: 'Create a topic (memory) associated with an assistant',
				routing: {
					request: { method: 'POST', url: '/assistant/addTopic' },
					output: { postReceive: [handleLcResponse] },
				},
			},
			{
				name: 'Get Many',
				value: 'getMany',
				action: 'Get many topics',
				description: 'List the topics (memories) of the assistants in the account',
				routing: {
					request: { method: 'GET', url: '/assistant/listTopic' },
					output: { postReceive: [handleLcResponse] },
				},
			},
		],
		default: 'getMany',
	},
];

export const topicFields: INodeProperties[] = [
	// ----------------------------------
	//         topic: create
	// ----------------------------------
	{
		displayName: 'Name',
		name: 'nombre',
		type: 'string',
		required: true,
		default: '',
		description: 'Name of the topic',
		displayOptions: {
			show: {
				resource: ['topic'],
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
				resource: ['topic'],
				operation: ['create'],
			},
		},
		options: [
			{
				displayName: 'Details',
				name: 'detalles',
				type: 'string',
				default: '',
				description: 'Content of the memory',
				routing: { send: { type: 'body', property: 'detalles' } },
			},
			{
				displayName: 'Group',
				name: 'grupo',
				type: 'string',
				default: '',
				description: 'Group of the topic',
				routing: { send: { type: 'body', property: 'grupo' } },
			},
			{
				displayName: 'Assistant Name or ID',
				name: 'id_assistant',
				type: 'options',
				typeOptions: { loadOptionsMethod: 'getAssistants' },
				default: '',
				description: 'ID of the assistant that owns the topic. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
				routing: { send: { type: 'body', property: 'id_assistant' } },
			},
		],
	},

	// ----------------------------------
	//         topic: getMany
	// ----------------------------------
	{
		displayName: 'Filters',
		name: 'filters',
		type: 'collection',
		placeholder: 'Add Filter',
		default: {},
		displayOptions: {
			show: {
				resource: ['topic'],
				operation: ['getMany'],
			},
		},
		options: [
			{
				displayName: 'Assistant Name or ID',
				name: 'id_assistant',
				type: 'options',
				typeOptions: { loadOptionsMethod: 'getAssistants' },
				default: '',
				description: 'Filter by the assistant that owns the topic. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
				routing: { send: { type: 'query', property: 'id_assistant' } },
			},
			{
				displayName: 'Topic ID',
				name: 'id',
				type: 'number',
				default: 0,
				description: 'Filter by topic ID',
				routing: { send: { type: 'query', property: 'id' } },
			},
		],
	},

	// ----------------------------------
	//         topic: update
	// ----------------------------------
	{
		displayName: 'Topic ID',
		name: 'id',
		type: 'number',
		required: true,
		default: 0,
		description: 'ID of the topic to edit',
		displayOptions: {
			show: {
				resource: ['topic'],
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
				resource: ['topic'],
				operation: ['update'],
			},
		},
		options: [
			{
				displayName: 'Details',
				name: 'detalles',
				type: 'string',
				default: '',
				description: 'Content of the memory',
				routing: { send: { type: 'body', property: 'detalles' } },
			},
			{
				displayName: 'Group',
				name: 'grupo',
				type: 'string',
				default: '',
				description: 'Group of the topic',
				routing: { send: { type: 'body', property: 'grupo' } },
			},
			{
				displayName: 'Assistant Name or ID',
				name: 'id_assistant',
				type: 'options',
				typeOptions: { loadOptionsMethod: 'getAssistants' },
				default: '',
				description: 'ID of the assistant that owns the topic. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
				routing: { send: { type: 'body', property: 'id_assistant' } },
			},
			{
				displayName: 'Name',
				name: 'nombre',
				type: 'string',
				default: '',
				description: 'Name of the topic',
				routing: { send: { type: 'body', property: 'nombre' } },
			},
		],
	},
];
