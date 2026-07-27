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
					'Catalog of active lead source channels for the authenticated account. No parameters.',
				routing: {
					request: { method: 'POST', url: '/crm/getLeadChannels' },
					output: { postReceive: [handleLcResponse] },
				},
			},
			{
				name: 'Get Stages',
				value: 'getStages',
				action: 'Get stages',
				description: 'Active stages of the specified pipeline, ordered by position',
				routing: {
					request: { method: 'POST', url: '/crm/getStages' },
					output: { postReceive: [handleLcResponse] },
				},
			},
			{
				name: 'Get Lead Origins',
				value: 'getLeadOrigins',
				action: 'Get lead origins',
				description:
					'Catalog of active lead origins for the authenticated account. No parameters.',
				routing: {
					request: { method: 'POST', url: '/crm/getLeadOrigins' },
					output: { postReceive: [handleLcResponse] },
				},
			},
			{
				name: 'Get Pipelines',
				value: 'getPipelines',
				action: 'Get pipelines',
				description: 'Catalog of active pipelines for the authenticated account. No parameters.',
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
		displayName: 'Pipeline Name or ID',
		name: 'id_pipeline',
		type: 'options',
		typeOptions: { loadOptionsMethod: 'getPipelines' },
		required: true,
		default: '',
		description:
			'ID of the pipeline whose stages are listed. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
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
