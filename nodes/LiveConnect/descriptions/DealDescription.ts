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
				name: 'Archive',
				value: 'archive',
				action: 'Archive a deal',
				description: 'Marca el deal como archivado (eliminación lógica)',
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
					'Crea un deal en el pipeline y etapa indicados. Valida que la etapa pertenezca al pipeline y que el usuario tenga acceso al pipeline.',
				routing: {
					request: { method: 'POST', url: '/crm/addDeal' },
					output: { postReceive: [handleLcResponse] },
				},
			},
			{
				name: 'Update',
				value: 'update',
				action: 'Update a deal',
				description:
					'Actualiza solo los campos presentes (patch parcial). Los campos personalizados se fusionan con los valores existentes.',
				routing: {
					request: { method: 'POST', url: '/crm/editDeal' },
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
		description: 'Consecutivo del deal a archivar',
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
				description: 'ID interno del deal (alternativa a Deal ID/consecutivo)',
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
		description: 'Nombre del deal',
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
		displayName: 'Pipeline ID',
		name: 'id_pipeline',
		type: 'number',
		required: true,
		default: 0,
		description: 'ID del pipeline donde se crea el deal',
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
		displayName: 'Pipeline Stage ID',
		name: 'id_etapa_pipeline',
		type: 'number',
		required: true,
		default: 0,
		description: 'ID de la etapa del pipeline. Debe pertenecer al pipeline indicado.',
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
		displayName: 'Owner ID',
		name: 'id_responsable',
		type: 'number',
		required: true,
		default: 0,
		description: 'ID del usuario responsable (owner) del deal',
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
		description: 'Valor monetario del deal',
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
		description: 'Moneda del deal (por ejemplo COP, USD)',
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
		displayName: 'Lead Origin ID',
		name: 'origen_lead',
		type: 'number',
		required: true,
		default: 0,
		description: 'ID del origen del lead',
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
		description: 'Descripción del deal',
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
				displayName: 'Business Type',
				name: 'tipo_negocio',
				type: 'options',
				options: [
					{ name: 'Nuevo', value: 'nuevo' },
					{ name: 'Renovación', value: 'renovacion' },
					{ name: 'Upsell', value: 'upsell' },
				],
				default: 'nuevo',
				description: 'Tipo de negocio del deal',
				routing: { send: { type: 'body', property: 'tipo_negocio' } },
			},
			{
				displayName: 'Campaign',
				name: 'campana',
				type: 'string',
				default: '',
				description: 'Campaña asociada al deal',
				routing: { send: { type: 'body', property: 'campana' } },
			},
			{
				displayName: 'Company ID',
				name: 'id_empresa',
				type: 'number',
				default: 0,
				description: 'ID de la empresa asociada al deal',
				routing: { send: { type: 'body', property: 'id_empresa' } },
			},
			{
				displayName: 'Competitor',
				name: 'competidor',
				type: 'string',
				default: '',
				description: 'Competidor asociado al deal',
				routing: { send: { type: 'body', property: 'competidor' } },
			},
			{
				displayName: 'Contact ID',
				name: 'id_contacto',
				type: 'number',
				default: 0,
				description: 'ID del contacto asociado al deal',
				routing: { send: { type: 'body', property: 'id_contacto' } },
			},
			{
				displayName: 'Custom Fields',
				name: 'custom_fields',
				type: 'json',
				default: '{}',
				description: 'Valores de campos personalizados (clave = slug)',
				routing: {
					send: {
						type: 'body',
						property: 'custom_fields',
						value: '={{ typeof $value === "object" && $value !== null ? $value : JSON.parse($value || "{}") }}',
					},
				},
			},
			{
				displayName: 'Estimated Close Date',
				name: 'fecha_cierre_estimada',
				type: 'string',
				default: '',
				placeholder: 'YYYY-MM-DD',
				description: 'Fecha estimada de cierre del deal',
				routing: { send: { type: 'body', property: 'fecha_cierre_estimada' } },
			},
			{
				displayName: 'Lead Channel ID',
				name: 'canal_origen',
				type: 'number',
				default: 0,
				description: 'ID del canal de origen del lead',
				routing: { send: { type: 'body', property: 'canal_origen' } },
			},
			{
				displayName: 'Probability',
				name: 'probabilidad',
				type: 'number',
				default: 0,
				description: 'Probabilidad de cierre (%)',
				routing: { send: { type: 'body', property: 'probabilidad' } },
			},
			{
				displayName: 'Product of Interest',
				name: 'producto_interes',
				type: 'string',
				default: '',
				description: 'Producto de interés del deal',
				routing: { send: { type: 'body', property: 'producto_interes' } },
			},
			{
				displayName: 'Temperature',
				name: 'temperatura',
				type: 'options',
				options: [
					{ name: 'Caliente', value: 'caliente' },
					{ name: 'Frío', value: 'frio' },
					{ name: 'Tibio', value: 'tibio' },
				],
				default: 'frio',
				description: 'Temperatura del lead',
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
		description: 'Consecutivo del deal a editar',
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
		displayName: 'Owner ID',
		name: 'id_responsable',
		type: 'number',
		required: true,
		default: 0,
		description: 'ID del usuario responsable (owner) del deal',
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
				displayName: 'Business Type',
				name: 'tipo_negocio',
				type: 'options',
				options: [
					{ name: 'Nuevo', value: 'nuevo' },
					{ name: 'Renovación', value: 'renovacion' },
					{ name: 'Upsell', value: 'upsell' },
				],
				default: 'nuevo',
				description: 'Tipo de negocio del deal',
				routing: { send: { type: 'body', property: 'tipo_negocio' } },
			},
			{
				displayName: 'Campaign',
				name: 'campana',
				type: 'string',
				default: '',
				description: 'Campaña asociada al deal',
				routing: { send: { type: 'body', property: 'campana' } },
			},
			{
				displayName: 'Company ID',
				name: 'id_empresa',
				type: 'number',
				default: 0,
				description: 'ID de la empresa asociada al deal',
				routing: { send: { type: 'body', property: 'id_empresa' } },
			},
			{
				displayName: 'Competitor',
				name: 'competidor',
				type: 'string',
				default: '',
				description: 'Competidor asociado al deal',
				routing: { send: { type: 'body', property: 'competidor' } },
			},
			{
				displayName: 'Contact ID',
				name: 'id_contacto',
				type: 'number',
				default: 0,
				description: 'ID del contacto asociado al deal',
				routing: { send: { type: 'body', property: 'id_contacto' } },
			},
			{
				displayName: 'Currency',
				name: 'moneda',
				type: 'string',
				default: '',
				description: 'Moneda del deal (por ejemplo COP, USD)',
				routing: { send: { type: 'body', property: 'moneda' } },
			},
			{
				displayName: 'Custom Fields',
				name: 'custom_fields',
				type: 'json',
				default: '{}',
				description: 'Valores a fusionar con los campos personalizados existentes',
				routing: {
					send: {
						type: 'body',
						property: 'custom_fields',
						value: '={{ typeof $value === "object" && $value !== null ? $value : JSON.parse($value || "{}") }}',
					},
				},
			},
			{
				displayName: 'Description',
				name: 'descripcion',
				type: 'string',
				typeOptions: { rows: 3 },
				default: '',
				description: 'Descripción del deal',
				routing: { send: { type: 'body', property: 'descripcion' } },
			},
			{
				displayName: 'Estimated Close Date',
				name: 'fecha_cierre_estimada',
				type: 'string',
				default: '',
				placeholder: 'YYYY-MM-DD',
				description: 'Fecha estimada de cierre del deal',
				routing: { send: { type: 'body', property: 'fecha_cierre_estimada' } },
			},
			{
				displayName: 'Internal Deal ID',
				name: 'id_interno',
				type: 'number',
				default: 0,
				description: 'ID interno del deal (alternativa a Deal ID/consecutivo)',
				routing: { send: { type: 'body', property: 'id_interno' } },
			},
			{
				displayName: 'Lead Channel ID',
				name: 'canal_origen',
				type: 'number',
				default: 0,
				description: 'ID del canal de origen del lead',
				routing: { send: { type: 'body', property: 'canal_origen' } },
			},
			{
				displayName: 'Lead Origin ID',
				name: 'origen_lead',
				type: 'number',
				default: 0,
				description: 'ID del origen del lead',
				routing: { send: { type: 'body', property: 'origen_lead' } },
			},
			{
				displayName: 'Lead Score',
				name: 'score_lead',
				type: 'number',
				default: 0,
				description: 'Puntaje del lead',
				routing: { send: { type: 'body', property: 'score_lead' } },
			},
			{
				displayName: 'Loss Notes',
				name: 'notas_perdida',
				type: 'string',
				default: '',
				description: 'Notas de la pérdida del deal',
				routing: { send: { type: 'body', property: 'notas_perdida' } },
			},
			{
				displayName: 'Loss Reason ID',
				name: 'id_motivo_perdida',
				type: 'number',
				default: 0,
				description: 'Requerido si la nueva etapa es de pérdida',
				routing: { send: { type: 'body', property: 'id_motivo_perdida' } },
			},
			{
				displayName: 'Name',
				name: 'nombre',
				type: 'string',
				default: '',
				description: 'Nombre del deal',
				routing: { send: { type: 'body', property: 'nombre' } },
			},
			{
				displayName: 'Next Activity',
				name: 'proxima_actividad',
				type: 'string',
				default: '',
				description: 'Próxima actividad del deal',
				routing: { send: { type: 'body', property: 'proxima_actividad' } },
			},
			{
				displayName: 'Pipeline ID',
				name: 'id_pipeline',
				type: 'number',
				default: 0,
				description: 'ID del pipeline del deal',
				routing: { send: { type: 'body', property: 'id_pipeline' } },
			},
			{
				displayName: 'Pipeline Stage ID',
				name: 'id_etapa_pipeline',
				type: 'number',
				default: 0,
				description: 'ID de la etapa del pipeline. Si cambia a una etapa de pérdida, requiere Loss Reason ID.',
				routing: { send: { type: 'body', property: 'id_etapa_pipeline' } },
			},
			{
				displayName: 'Probability',
				name: 'probabilidad',
				type: 'number',
				default: 0,
				description: 'Probabilidad de cierre (%)',
				routing: { send: { type: 'body', property: 'probabilidad' } },
			},
			{
				displayName: 'Product of Interest',
				name: 'producto_interes',
				type: 'string',
				default: '',
				description: 'Producto de interés del deal',
				routing: { send: { type: 'body', property: 'producto_interes' } },
			},
			{
				displayName: 'Temperature',
				name: 'temperatura',
				type: 'options',
				options: [
					{ name: 'Caliente', value: 'caliente' },
					{ name: 'Frío', value: 'frio' },
					{ name: 'Tibio', value: 'tibio' },
				],
				default: 'frio',
				description: 'Temperatura del lead',
				routing: { send: { type: 'body', property: 'temperatura' } },
			},
			{
				displayName: 'Value',
				name: 'valor',
				type: 'number',
				default: 0,
				description: 'Valor monetario del deal',
				routing: { send: { type: 'body', property: 'valor' } },
			},
		],
	},
];
