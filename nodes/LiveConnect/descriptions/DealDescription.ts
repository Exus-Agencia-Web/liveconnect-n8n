import type { INodeProperties } from 'n8n-workflow';

import { handleLcResponse } from '../GenericFunctions';

export const dealOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['deal'],
			},
		},
		options: [
			{
				name: 'Update',
				value: 'update',
				action: 'Update a deal',
				description:
					'Updates only the fields present (partial patch). Custom fields are merged with the existing values.',
				routing: {
					request: { method: 'POST', url: '/crm/editDeal' },
					output: { postReceive: [handleLcResponse] },
				},
			},
			{
				name: 'Archive',
				value: 'archive',
				action: 'Archive a deal',
				description: 'Marks the deal as archived (soft delete)',
				routing: {
					request: { method: 'POST', url: '/crm/archiveDeal' },
					output: { postReceive: [handleLcResponse] },
				},
			},
			{
				name: 'Create',
				value: 'create',
				action: 'Create a deal',
				description:
					'Creates a deal in the specified pipeline and stage. Validates that the stage belongs to the pipeline and that the user has access to the pipeline.',
				routing: {
					request: { method: 'POST', url: '/crm/addDeal' },
					output: { postReceive: [handleLcResponse] },
				},
			},
		],
		default: 'create',
	},
];

export const dealFields: INodeProperties[] = [
	// ----------------------------------
	//         deal: archive
	// ----------------------------------
	{
		displayName: 'Deal ID',
		name: 'id',
		type: 'number',
		required: true,
		default: 0,
		description: 'Sequential number of the deal to archive',
		displayOptions: {
			show: {
				resource: ['deal'],
				operation: ['archive'],
			},
		},
		routing: {
			send: { type: 'body', property: 'id' },
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
				resource: ['deal'],
				operation: ['archive'],
			},
		},
		options: [
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
	//         deal: create
	// ----------------------------------
	{
		displayName: 'Name',
		name: 'nombre',
		type: 'string',
		required: true,
		default: '',
		description: 'Deal name',
		displayOptions: {
			show: {
				resource: ['deal'],
				operation: ['create'],
			},
		},
		routing: {
			send: { type: 'body', property: 'nombre' },
		},
	},
	{
		displayName: 'Pipeline Name or ID',
		name: 'id_pipeline',
		type: 'options',
		typeOptions: { loadOptionsMethod: 'getPipelines' },
		required: true,
		default: '',
		description:
			'The ID of the pipeline where the deal is created. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
		displayOptions: {
			show: {
				resource: ['deal'],
				operation: ['create'],
			},
		},
		routing: {
			send: { type: 'body', property: 'id_pipeline' },
		},
	},
	{
		displayName: 'Pipeline Stage Name or ID',
		name: 'id_etapa_pipeline',
		type: 'options',
		typeOptions: { loadOptionsMethod: 'getStages', loadOptionsDependsOn: ['&id_pipeline'] },
		required: true,
		default: '',
		description:
			'The ID of the pipeline stage. Must belong to the specified pipeline. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
		displayOptions: {
			show: {
				resource: ['deal'],
				operation: ['create'],
			},
		},
		routing: {
			send: { type: 'body', property: 'id_etapa_pipeline' },
		},
	},
	{
		displayName: 'Owner Name or ID',
		name: 'id_responsable',
		type: 'options',
		typeOptions: { loadOptionsMethod: 'getUsers' },
		required: true,
		default: '',
		description:
			'The ID of the user responsible (owner) for the deal. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
		displayOptions: {
			show: {
				resource: ['deal'],
				operation: ['create'],
			},
		},
		routing: {
			send: { type: 'body', property: 'id_responsable' },
		},
	},
	{
		displayName: 'Value',
		name: 'valor',
		type: 'number',
		required: true,
		default: 0,
		description: 'Monetary value of the deal',
		displayOptions: {
			show: {
				resource: ['deal'],
				operation: ['create'],
			},
		},
		routing: {
			send: { type: 'body', property: 'valor' },
		},
	},
	{
		displayName: 'Currency',
		name: 'moneda',
		type: 'string',
		required: true,
		default: '',
		description: 'Currency of the deal (for example COP, USD)',
		displayOptions: {
			show: {
				resource: ['deal'],
				operation: ['create'],
			},
		},
		routing: {
			send: { type: 'body', property: 'moneda' },
		},
	},
	{
		displayName: 'Lead Origin Name or ID',
		name: 'origen_lead',
		type: 'options',
		typeOptions: { loadOptionsMethod: 'getLeadOrigins' },
		required: true,
		default: '',
		description:
			'The ID of the lead origin. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
		displayOptions: {
			show: {
				resource: ['deal'],
				operation: ['create'],
			},
		},
		routing: {
			send: { type: 'body', property: 'origen_lead' },
		},
	},
	{
		displayName: 'Description',
		name: 'descripcion',
		type: 'string',
		required: true,
		typeOptions: { rows: 3 },
		default: '',
		description: 'Description of the deal',
		displayOptions: {
			show: {
				resource: ['deal'],
				operation: ['create'],
			},
		},
		routing: {
			send: { type: 'body', property: 'descripcion' },
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
				resource: ['deal'],
				operation: ['create'],
			},
		},
		options: [
			{
				displayName: 'Campaign',
				name: 'campana',
				type: 'string',
				default: '',
				description: 'Campaign associated with the deal',
				routing: { send: { type: 'body', property: 'campana' } },
			},
			{
				displayName: 'Company ID',
				name: 'id_empresa',
				type: 'number',
				default: 0,
				description: 'ID of the company associated with the deal',
				routing: { send: { type: 'body', property: 'id_empresa' } },
			},
			{
				displayName: 'Competitor',
				name: 'competidor',
				type: 'string',
				default: '',
				description: 'Competitor associated with the deal',
				routing: { send: { type: 'body', property: 'competidor' } },
			},
			{
				displayName: 'Contact ID',
				name: 'id_contacto',
				type: 'number',
				default: 0,
				description: 'ID of the contact associated with the deal',
				routing: { send: { type: 'body', property: 'id_contacto' } },
			},
			{
				displayName: 'Custom Fields',
				name: 'custom_fields',
				type: 'json',
				default: '{}',
				description: 'Values of custom fields (key = slug)',
				routing: {
					send: {
						type: 'body',
						property: 'custom_fields',
						value: '={{ typeof $value === "object" && $value !== null ? $value : JSON.parse($value || "{}") }}',
					},
				},
			},
			{
				displayName: 'Deal Type',
				name: 'tipo_negocio',
				type: 'options',
				options: [
					{ name: 'New', value: 'nuevo' },
					{ name: 'Renewal', value: 'renovacion' },
					{ name: 'Upsell', value: 'upsell' },
				],
				default: 'nuevo',
				description: 'Type of deal',
				routing: { send: { type: 'body', property: 'tipo_negocio' } },
			},
			{
				displayName: 'Estimated Close Date',
				name: 'fecha_cierre_estimada',
				type: 'string',
				default: '',
				placeholder: 'YYYY-MM-DD',
				description: 'Estimated close date of the deal',
				routing: { send: { type: 'body', property: 'fecha_cierre_estimada' } },
			},
			{
				displayName: 'Lead Channel Name or ID',
				name: 'canal_origen',
				type: 'options',
				typeOptions: { loadOptionsMethod: 'getLeadChannels' },
				default: '',
				description:
					'The ID of the channel where the lead originated. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
				routing: { send: { type: 'body', property: 'canal_origen' } },
			},
			{
				displayName: 'Probability',
				name: 'probabilidad',
				type: 'number',
				default: 0,
				description: 'Probability of closing (%)',
				routing: { send: { type: 'body', property: 'probabilidad' } },
			},
			{
				displayName: 'Product of Interest',
				name: 'producto_interes',
				type: 'string',
				default: '',
				description: 'Product of interest for the deal',
				routing: { send: { type: 'body', property: 'producto_interes' } },
			},
			{
				displayName: 'Temperature',
				name: 'temperatura',
				type: 'options',
				options: [
					{ name: 'Hot', value: 'caliente' },
					{ name: 'Cold', value: 'frio' },
					{ name: 'Warm', value: 'tibio' },
				],
				default: 'frio',
				description: 'Lead temperature',
				routing: { send: { type: 'body', property: 'temperatura' } },
			},
		],
	},

	// ----------------------------------
	//         deal: update
	// ----------------------------------
	{
		displayName: 'Deal ID',
		name: 'id',
		type: 'number',
		required: true,
		default: 0,
		description: 'Sequential number of the deal to edit',
		displayOptions: {
			show: {
				resource: ['deal'],
				operation: ['update'],
			},
		},
		routing: {
			send: { type: 'body', property: 'id' },
		},
	},
	{
		displayName: 'Owner Name or ID',
		name: 'id_responsable',
		type: 'options',
		typeOptions: { loadOptionsMethod: 'getUsers' },
		required: true,
		default: '',
		description:
			'The ID of the user responsible (owner) for the deal. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
		displayOptions: {
			show: {
				resource: ['deal'],
				operation: ['update'],
			},
		},
		routing: {
			send: { type: 'body', property: 'id_responsable' },
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
				resource: ['deal'],
				operation: ['update'],
			},
		},
		options: [
			{
				displayName: 'Campaign',
				name: 'campana',
				type: 'string',
				default: '',
				description: 'Campaign associated with the deal',
				routing: { send: { type: 'body', property: 'campana' } },
			},
			{
				displayName: 'Company ID',
				name: 'id_empresa',
				type: 'number',
				default: 0,
				description: 'ID of the company associated with the deal',
				routing: { send: { type: 'body', property: 'id_empresa' } },
			},
			{
				displayName: 'Competitor',
				name: 'competidor',
				type: 'string',
				default: '',
				description: 'Competitor associated with the deal',
				routing: { send: { type: 'body', property: 'competidor' } },
			},
			{
				displayName: 'Contact ID',
				name: 'id_contacto',
				type: 'number',
				default: 0,
				description: 'ID of the contact associated with the deal',
				routing: { send: { type: 'body', property: 'id_contacto' } },
			},
			{
				displayName: 'Currency',
				name: 'moneda',
				type: 'string',
				default: '',
				description: 'Currency of the deal (for example COP, USD)',
				routing: { send: { type: 'body', property: 'moneda' } },
			},
			{
				displayName: 'Custom Fields',
				name: 'custom_fields',
				type: 'json',
				default: '{}',
				description: 'Values to merge with the existing custom fields',
				routing: {
					send: {
						type: 'body',
						property: 'custom_fields',
						value: '={{ typeof $value === "object" && $value !== null ? $value : JSON.parse($value || "{}") }}',
					},
				},
			},
			{
				displayName: 'Deal Type',
				name: 'tipo_negocio',
				type: 'options',
				options: [
					{ name: 'New', value: 'nuevo' },
					{ name: 'Renewal', value: 'renovacion' },
					{ name: 'Upsell', value: 'upsell' },
				],
				default: 'nuevo',
				description: 'Type of deal',
				routing: { send: { type: 'body', property: 'tipo_negocio' } },
			},
			{
				displayName: 'Description',
				name: 'descripcion',
				type: 'string',
				typeOptions: { rows: 3 },
				default: '',
				description: 'Description of the deal',
				routing: { send: { type: 'body', property: 'descripcion' } },
			},
			{
				displayName: 'Estimated Close Date',
				name: 'fecha_cierre_estimada',
				type: 'string',
				default: '',
				placeholder: 'YYYY-MM-DD',
				description: 'Estimated close date of the deal',
				routing: { send: { type: 'body', property: 'fecha_cierre_estimada' } },
			},
			{
				displayName: 'Internal Deal ID',
				name: 'id_interno',
				type: 'number',
				default: 0,
				description: 'Internal ID of the deal (alternative to Deal ID/sequential number)',
				routing: { send: { type: 'body', property: 'id_interno' } },
			},
			{
				displayName: 'Lead Channel Name or ID',
				name: 'canal_origen',
				type: 'options',
				typeOptions: { loadOptionsMethod: 'getLeadChannels' },
				default: '',
				description:
					'The ID of the channel where the lead originated. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
				routing: { send: { type: 'body', property: 'canal_origen' } },
			},
			{
				displayName: 'Lead Origin Name or ID',
				name: 'origen_lead',
				type: 'options',
				typeOptions: { loadOptionsMethod: 'getLeadOrigins' },
				default: '',
				description:
					'The ID of the lead origin. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
				routing: { send: { type: 'body', property: 'origen_lead' } },
			},
			{
				displayName: 'Lead Score',
				name: 'score_lead',
				type: 'number',
				default: 0,
				routing: { send: { type: 'body', property: 'score_lead' } },
			},
			{
				displayName: 'Loss Notes',
				name: 'notas_perdida',
				type: 'string',
				default: '',
				description: 'Notes about the loss of the deal',
				routing: { send: { type: 'body', property: 'notas_perdida' } },
			},
			{
				displayName: 'Loss Reason ID',
				name: 'id_motivo_perdida',
				type: 'number',
				default: 0,
				description: 'Required if the new stage is a loss stage',
				routing: { send: { type: 'body', property: 'id_motivo_perdida' } },
			},
			{
				displayName: 'Name',
				name: 'nombre',
				type: 'string',
				default: '',
				description: 'Deal name',
				routing: { send: { type: 'body', property: 'nombre' } },
			},
			{
				displayName: 'Next Activity',
				name: 'proxima_actividad',
				type: 'string',
				default: '',
				description: 'Next activity for the deal',
				routing: { send: { type: 'body', property: 'proxima_actividad' } },
			},
			{
				displayName: 'Pipeline Name or ID',
				name: 'id_pipeline',
				type: 'options',
				typeOptions: { loadOptionsMethod: 'getPipelines' },
				default: '',
				description:
					'The ID of the pipeline for the deal. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
				routing: { send: { type: 'body', property: 'id_pipeline' } },
			},
			{
				displayName: 'Pipeline Stage Name or ID',
				name: 'id_etapa_pipeline',
				type: 'options',
				typeOptions: { loadOptionsMethod: 'getStages', loadOptionsDependsOn: ['&id_pipeline'] },
				default: '',
				description:
					'The ID of the pipeline stage. If it changes to a loss stage, requires Loss Reason ID. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
				routing: { send: { type: 'body', property: 'id_etapa_pipeline' } },
			},
			{
				displayName: 'Probability',
				name: 'probabilidad',
				type: 'number',
				default: 0,
				description: 'Probability of closing (%)',
				routing: { send: { type: 'body', property: 'probabilidad' } },
			},
			{
				displayName: 'Product of Interest',
				name: 'producto_interes',
				type: 'string',
				default: '',
				description: 'Product of interest for the deal',
				routing: { send: { type: 'body', property: 'producto_interes' } },
			},
			{
				displayName: 'Temperature',
				name: 'temperatura',
				type: 'options',
				options: [
					{ name: 'Hot', value: 'caliente' },
					{ name: 'Cold', value: 'frio' },
					{ name: 'Warm', value: 'tibio' },
				],
				default: 'frio',
				description: 'Lead temperature',
				routing: { send: { type: 'body', property: 'temperatura' } },
			},
			{
				displayName: 'Value',
				name: 'valor',
				type: 'number',
				default: 0,
				description: 'Monetary value of the deal',
				routing: { send: { type: 'body', property: 'valor' } },
			},
		],
	},
];
