import type { INodeProperties } from 'n8n-workflow';

import { handleLcResponse } from '../GenericFunctions';

export const crmOperations: INodeProperties[] = [
	{
		displayName: 'Operación',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['crm'],
			},
		},
		options: [
			{
				name: 'Obtener Canales de Lead',
				value: 'getLeadChannels',
				action: 'Obtener canales de lead',
				description:
					'Catálogo de canales de origen de lead activos de la cuenta autenticada. Sin parámetros.',
				routing: {
					request: { method: 'POST', url: '/crm/getLeadChannels' },
					output: { postReceive: [handleLcResponse] },
				},
			},
			{
				name: 'Obtener Etapas',
				value: 'getStages',
				action: 'Obtener etapas',
				description: 'Etapas activas del pipeline indicado, ordenadas por posición',
				routing: {
					request: { method: 'POST', url: '/crm/getStages' },
					output: { postReceive: [handleLcResponse] },
				},
			},
			{
				name: 'Obtener Orígenes de Lead',
				value: 'getLeadOrigins',
				action: 'Obtener orígenes de lead',
				description:
					'Catálogo de orígenes de lead activos de la cuenta autenticada. Sin parámetros.',
				routing: {
					request: { method: 'POST', url: '/crm/getLeadOrigins' },
					output: { postReceive: [handleLcResponse] },
				},
			},
			{
				name: 'Obtener Pipelines',
				value: 'getPipelines',
				action: 'Obtener pipelines',
				description: 'Catálogo de pipelines activos de la cuenta autenticada. Sin parámetros.',
				routing: {
					request: { method: 'POST', url: '/crm/getPipelines' },
					output: { postReceive: [handleLcResponse] },
				},
			},
		],
		default: 'getPipelines',
	},
];

export const crmFields: INodeProperties[] = [
	// ----------------------------------
	//         crm: getStages
	// ----------------------------------
	{
		displayName: 'ID del Pipeline',
		name: 'id_pipeline',
		type: 'options',
		typeOptions: { loadOptionsMethod: 'getPipelines' },
		required: true,
		default: '',
		description:
			'ID del pipeline del que se listan las etapas. Elige de la lista o especifica un ID con una expresión.',
		displayOptions: {
			show: {
				resource: ['crm'],
				operation: ['getStages'],
			},
		},
		routing: {
			send: { type: 'body', property: 'id_pipeline' },
		},
	},
];
