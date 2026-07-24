import type { INodeProperties } from 'n8n-workflow';

import { handleLcResponse } from '../GenericFunctions';

export const crmOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
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
				name: 'Get Lead Channels',
				value: 'getLeadChannels',
				action: 'Get lead channels',
				description:
					'Catálogo de canales de origen de lead activos de la cuenta autenticada. Sin parámetros.',
				routing: {
					request: { method: 'POST', url: '/crm/getLeadChannels' },
					output: { postReceive: [handleLcResponse] },
				},
			},
			{
				name: 'Get Lead Origins',
				value: 'getLeadOrigins',
				action: 'Get lead origins',
				description:
					'Catálogo de orígenes de lead activos de la cuenta autenticada. Sin parámetros.',
				routing: {
					request: { method: 'POST', url: '/crm/getLeadOrigins' },
					output: { postReceive: [handleLcResponse] },
				},
			},
			{
				name: 'Get Pipelines',
				value: 'getPipelines',
				action: 'Get pipelines',
				description: 'Catálogo de pipelines activos de la cuenta autenticada. Sin parámetros.',
				routing: {
					request: { method: 'POST', url: '/crm/getPipelines' },
					output: { postReceive: [handleLcResponse] },
				},
			},
			{
				name: 'Get Stages',
				value: 'getStages',
				action: 'Get stages',
				description: 'Etapas activas del pipeline indicado, ordenadas por posición',
				routing: {
					request: { method: 'POST', url: '/crm/getStages' },
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
		displayName: 'Pipeline ID',
		name: 'id_pipeline',
		type: 'number',
		required: true,
		default: 0,
		description: 'ID del pipeline del que se listan las etapas',
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
