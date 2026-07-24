import type { INodeProperties } from 'n8n-workflow';

import { handleLcResponse } from '../GenericFunctions';

export const groupOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['group'],
			},
		},
		options: [
			{
				name: 'Get Many',
				value: 'getMany',
				action: 'Get many groups',
				description: 'Lista los grupos de agentes configurados en la cuenta, con filtros opcionales',
				routing: {
					request: { method: 'GET', url: '/groups/list' },
					output: { postReceive: [handleLcResponse] },
				},
			},
		],
		default: 'getMany',
	},
];

export const groupFields: INodeProperties[] = [
	// ----------------------------------
	//         group: getMany
	// ----------------------------------
	{
		displayName: 'Filters',
		name: 'filters',
		type: 'collection',
		placeholder: 'Add Filter',
		default: {},
		displayOptions: {
			show: {
				resource: ['group'],
				operation: ['getMany'],
			},
		},
		options: [
			{
				displayName: 'Archived',
				name: 'archivado',
				type: 'options',
				options: [
					{ name: 'No', value: 0 },
					{ name: 'Yes', value: 1 },
				],
				default: 0,
				description: 'Filtra por grupos archivados',
				routing: { send: { type: 'query', property: 'archivado' } },
			},
			{
				displayName: 'Group ID',
				name: 'id',
				type: 'number',
				default: 0,
				description: 'Filtra por ID de grupo',
				routing: { send: { type: 'query', property: 'id' } },
			},
			{
				displayName: 'Public',
				name: 'publico',
				type: 'options',
				options: [
					{ name: 'No', value: 0 },
					{ name: 'Yes', value: 1 },
				],
				default: 1,
				description: 'Filtra por grupos públicos',
				routing: { send: { type: 'query', property: 'publico' } },
			},
		],
	},
];
