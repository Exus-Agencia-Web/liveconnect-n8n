import type { INodeProperties } from 'n8n-workflow';

import { handleLcResponse } from '../GenericFunctions';

export const groupOperations: INodeProperties[] = [
	{
		displayName: 'Operación',
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
				name: 'Obtener Varios',
				value: 'getMany',
				action: 'Obtener varios grupos',
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
		displayName: 'Filtros',
		name: 'filters',
		type: 'collection',
		placeholder: 'Agregar Filtro',
		default: {},
		displayOptions: {
			show: {
				resource: ['group'],
				operation: ['getMany'],
			},
		},
		options: [
			{
				displayName: 'Archivado',
				name: 'archivado',
				type: 'options',
				options: [
					{ name: 'No', value: 0 },
					{ name: 'Sí', value: 1 },
				],
				default: 0,
				description: 'Filtra por grupos archivados',
				routing: { send: { type: 'query', property: 'archivado' } },
			},
			{
				displayName: 'ID del Grupo',
				name: 'id',
				type: 'number',
				default: 0,
				description: 'Filtra por ID de grupo',
				routing: { send: { type: 'query', property: 'id' } },
			},
			{
				displayName: 'Público',
				name: 'publico',
				type: 'options',
				options: [
					{ name: 'No', value: 0 },
					{ name: 'Sí', value: 1 },
				],
				default: 1,
				description: 'Filtra por grupos públicos',
				routing: { send: { type: 'query', property: 'publico' } },
			},
		],
	},
];
