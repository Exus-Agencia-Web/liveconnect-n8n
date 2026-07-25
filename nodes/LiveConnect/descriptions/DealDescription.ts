import type { INodeProperties } from 'n8n-workflow';

import { handleLcResponse } from '../GenericFunctions';

export const dealOperations: INodeProperties[] = [
	{
		displayName: 'Operación',
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
				name: 'Actualizar',
				value: 'update',
				action: 'Actualizar una negociación',
				description:
					'Actualiza solo los campos presentes (patch parcial). Los campos personalizados se fusionan con los valores existentes.',
				routing: {
					request: { method: 'POST', url: '/crm/editDeal' },
					output: { postReceive: [handleLcResponse] },
				},
			},
			{
				name: 'Archivar',
				value: 'archive',
				action: 'Archivar una negociación',
				description: 'Marca la negociación como archivada (eliminación lógica)',
				routing: {
					request: { method: 'POST', url: '/crm/archiveDeal' },
					output: { postReceive: [handleLcResponse] },
				},
			},
			{
				name: 'Crear',
				value: 'create',
				action: 'Crear una negociación',
				description:
					'Crea una negociación en el pipeline y etapa indicados. Valida que la etapa pertenezca al pipeline y que el usuario tenga acceso al pipeline.',
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
		displayName: 'ID de la Negociación',
		name: 'id',
		type: 'number',
		required: true,
		default: 0,
		description: 'Consecutivo de la negociación a archivar',
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
		displayName: 'Campos Adicionales',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Agregar Campo',
		default: {},
		displayOptions: {
			show: {
				resource: ['deal'],
				operation: ['archive'],
			},
		},
		options: [
			{
				displayName: 'ID Interno de la Negociación',
				name: 'id_interno',
				type: 'number',
				default: 0,
				description: 'ID interno de la negociación (alternativa a ID de la Negociación/consecutivo)',
				routing: { send: { type: 'body', property: 'id_interno' } },
			},
		],
	},

	// ----------------------------------
	//         deal: create
	// ----------------------------------
	{
		displayName: 'Nombre',
		name: 'nombre',
		type: 'string',
		required: true,
		default: '',
		description: 'Nombre de la negociación',
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
		displayName: 'ID del Pipeline',
		name: 'id_pipeline',
		type: 'options',
		typeOptions: { loadOptionsMethod: 'getPipelines' },
		required: true,
		default: '',
		description:
			'ID del pipeline donde se crea la negociación. Elige de la lista o especifica un ID con una expresión.',
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
		displayName: 'ID de la Etapa del Pipeline',
		name: 'id_etapa_pipeline',
		type: 'options',
		typeOptions: { loadOptionsMethod: 'getStages' },
		required: true,
		default: '',
		description:
			'ID de la etapa del pipeline. Debe pertenecer al pipeline indicado. Elige de la lista o especifica un ID con una expresión.',
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
		displayName: 'ID del Responsable',
		name: 'id_responsable',
		type: 'options',
		typeOptions: { loadOptionsMethod: 'getUsers' },
		required: true,
		default: '',
		description:
			'ID del usuario responsable (owner) de la negociación. Elige de la lista o especifica un ID con una expresión.',
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
		displayName: 'Valor',
		name: 'valor',
		type: 'number',
		required: true,
		default: 0,
		description: 'Valor monetario de la negociación',
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
		displayName: 'Moneda',
		name: 'moneda',
		type: 'string',
		required: true,
		default: '',
		description: 'Moneda de la negociación (por ejemplo COP, USD)',
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
		displayName: 'ID del Origen de Lead',
		name: 'origen_lead',
		type: 'options',
		typeOptions: { loadOptionsMethod: 'getLeadOrigins' },
		required: true,
		default: '',
		description:
			'ID del origen del lead. Elige de la lista o especifica un ID con una expresión.',
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
		displayName: 'Descripción',
		name: 'descripcion',
		type: 'string',
		required: true,
		typeOptions: { rows: 3 },
		default: '',
		description: 'Descripción de la negociación',
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
		displayName: 'Campos Adicionales',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Agregar Campo',
		default: {},
		displayOptions: {
			show: {
				resource: ['deal'],
				operation: ['create'],
			},
		},
		options: [
			{
				displayName: 'Campaña',
				name: 'campana',
				type: 'string',
				default: '',
				description: 'Campaña asociada a la negociación',
				routing: { send: { type: 'body', property: 'campana' } },
			},
			{
				displayName: 'Campos Personalizados',
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
				displayName: 'Competidor',
				name: 'competidor',
				type: 'string',
				default: '',
				description: 'Competidor asociado a la negociación',
				routing: { send: { type: 'body', property: 'competidor' } },
			},
			{
				displayName: 'Fecha Estimada de Cierre',
				name: 'fecha_cierre_estimada',
				type: 'string',
				default: '',
				placeholder: 'YYYY-MM-DD',
				description: 'Fecha estimada de cierre de la negociación',
				routing: { send: { type: 'body', property: 'fecha_cierre_estimada' } },
			},
			{
				displayName: 'ID de la Empresa',
				name: 'id_empresa',
				type: 'number',
				default: 0,
				description: 'ID de la empresa asociada a la negociación',
				routing: { send: { type: 'body', property: 'id_empresa' } },
			},
			{
				displayName: 'ID del Canal de Lead',
				name: 'canal_origen',
				type: 'options',
				typeOptions: { loadOptionsMethod: 'getLeadChannels' },
				default: '',
				description:
					'ID del canal de origen del lead. Elige de la lista o especifica un ID con una expresión.',
				routing: { send: { type: 'body', property: 'canal_origen' } },
			},
			{
				displayName: 'ID del Contacto',
				name: 'id_contacto',
				type: 'number',
				default: 0,
				description: 'ID del contacto asociado a la negociación',
				routing: { send: { type: 'body', property: 'id_contacto' } },
			},
			{
				displayName: 'Probabilidad',
				name: 'probabilidad',
				type: 'number',
				default: 0,
				description: 'Probabilidad de cierre (%)',
				routing: { send: { type: 'body', property: 'probabilidad' } },
			},
			{
				displayName: 'Producto de Interés',
				name: 'producto_interes',
				type: 'string',
				default: '',
				description: 'Producto de interés de la negociación',
				routing: { send: { type: 'body', property: 'producto_interes' } },
			},
			{
				displayName: 'Temperatura',
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
				displayName: 'Tipo de Negocio',
				name: 'tipo_negocio',
				type: 'options',
				options: [
					{ name: 'Nuevo', value: 'nuevo' },
					{ name: 'Renovación', value: 'renovacion' },
					{ name: 'Upsell', value: 'upsell' },
				],
				default: 'nuevo',
				description: 'Tipo de negocio de la negociación',
				routing: { send: { type: 'body', property: 'tipo_negocio' } },
			},
		],
	},

	// ----------------------------------
	//         deal: update
	// ----------------------------------
	{
		displayName: 'ID de la Negociación',
		name: 'id',
		type: 'number',
		required: true,
		default: 0,
		description: 'Consecutivo de la negociación a editar',
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
		displayName: 'ID del Responsable',
		name: 'id_responsable',
		type: 'options',
		typeOptions: { loadOptionsMethod: 'getUsers' },
		required: true,
		default: '',
		description:
			'ID del usuario responsable (owner) de la negociación. Elige de la lista o especifica un ID con una expresión.',
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
		displayName: 'Campos a Actualizar',
		name: 'updateFields',
		type: 'collection',
		placeholder: 'Agregar Campo',
		default: {},
		displayOptions: {
			show: {
				resource: ['deal'],
				operation: ['update'],
			},
		},
		options: [
			{
				displayName: 'Campaña',
				name: 'campana',
				type: 'string',
				default: '',
				description: 'Campaña asociada a la negociación',
				routing: { send: { type: 'body', property: 'campana' } },
			},
			{
				displayName: 'Campos Personalizados',
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
				displayName: 'Competidor',
				name: 'competidor',
				type: 'string',
				default: '',
				description: 'Competidor asociado a la negociación',
				routing: { send: { type: 'body', property: 'competidor' } },
			},
			{
				displayName: 'Descripción',
				name: 'descripcion',
				type: 'string',
				typeOptions: { rows: 3 },
				default: '',
				description: 'Descripción de la negociación',
				routing: { send: { type: 'body', property: 'descripcion' } },
			},
			{
				displayName: 'Fecha Estimada de Cierre',
				name: 'fecha_cierre_estimada',
				type: 'string',
				default: '',
				placeholder: 'YYYY-MM-DD',
				description: 'Fecha estimada de cierre de la negociación',
				routing: { send: { type: 'body', property: 'fecha_cierre_estimada' } },
			},
			{
				displayName: 'ID de la Empresa',
				name: 'id_empresa',
				type: 'number',
				default: 0,
				description: 'ID de la empresa asociada a la negociación',
				routing: { send: { type: 'body', property: 'id_empresa' } },
			},
			{
				displayName: 'ID de la Etapa del Pipeline',
				name: 'id_etapa_pipeline',
				type: 'options',
				typeOptions: { loadOptionsMethod: 'getStages' },
				default: '',
				description:
					'ID de la etapa del pipeline. Si cambia a una etapa de pérdida, requiere ID del Motivo de Pérdida. Elige de la lista o especifica un ID con una expresión.',
				routing: { send: { type: 'body', property: 'id_etapa_pipeline' } },
			},
			{
				displayName: 'ID del Canal de Lead',
				name: 'canal_origen',
				type: 'options',
				typeOptions: { loadOptionsMethod: 'getLeadChannels' },
				default: '',
				description:
					'ID del canal de origen del lead. Elige de la lista o especifica un ID con una expresión.',
				routing: { send: { type: 'body', property: 'canal_origen' } },
			},
			{
				displayName: 'ID del Contacto',
				name: 'id_contacto',
				type: 'number',
				default: 0,
				description: 'ID del contacto asociado a la negociación',
				routing: { send: { type: 'body', property: 'id_contacto' } },
			},
			{
				displayName: 'ID del Motivo de Pérdida',
				name: 'id_motivo_perdida',
				type: 'number',
				default: 0,
				description: 'Requerido si la nueva etapa es de pérdida',
				routing: { send: { type: 'body', property: 'id_motivo_perdida' } },
			},
			{
				displayName: 'ID del Origen de Lead',
				name: 'origen_lead',
				type: 'options',
				typeOptions: { loadOptionsMethod: 'getLeadOrigins' },
				default: '',
				description:
					'ID del origen del lead. Elige de la lista o especifica un ID con una expresión.',
				routing: { send: { type: 'body', property: 'origen_lead' } },
			},
			{
				displayName: 'ID del Pipeline',
				name: 'id_pipeline',
				type: 'options',
				typeOptions: { loadOptionsMethod: 'getPipelines' },
				default: '',
				description:
					'ID del pipeline de la negociación. Elige de la lista o especifica un ID con una expresión.',
				routing: { send: { type: 'body', property: 'id_pipeline' } },
			},
			{
				displayName: 'ID Interno de la Negociación',
				name: 'id_interno',
				type: 'number',
				default: 0,
				description: 'ID interno de la negociación (alternativa a ID de la Negociación/consecutivo)',
				routing: { send: { type: 'body', property: 'id_interno' } },
			},
			{
				displayName: 'Moneda',
				name: 'moneda',
				type: 'string',
				default: '',
				description: 'Moneda de la negociación (por ejemplo COP, USD)',
				routing: { send: { type: 'body', property: 'moneda' } },
			},
			{
				displayName: 'Nombre',
				name: 'nombre',
				type: 'string',
				default: '',
				description: 'Nombre de la negociación',
				routing: { send: { type: 'body', property: 'nombre' } },
			},
			{
				displayName: 'Notas de Pérdida',
				name: 'notas_perdida',
				type: 'string',
				default: '',
				description: 'Notas de la pérdida de la negociación',
				routing: { send: { type: 'body', property: 'notas_perdida' } },
			},
			{
				displayName: 'Probabilidad',
				name: 'probabilidad',
				type: 'number',
				default: 0,
				description: 'Probabilidad de cierre (%)',
				routing: { send: { type: 'body', property: 'probabilidad' } },
			},
			{
				displayName: 'Producto de Interés',
				name: 'producto_interes',
				type: 'string',
				default: '',
				description: 'Producto de interés de la negociación',
				routing: { send: { type: 'body', property: 'producto_interes' } },
			},
			{
				displayName: 'Próxima Actividad',
				name: 'proxima_actividad',
				type: 'string',
				default: '',
				description: 'Próxima actividad de la negociación',
				routing: { send: { type: 'body', property: 'proxima_actividad' } },
			},
			{
				displayName: 'Puntaje del Lead',
				name: 'score_lead',
				type: 'number',
				default: 0,
				routing: { send: { type: 'body', property: 'score_lead' } },
			},
			{
				displayName: 'Temperatura',
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
				displayName: 'Tipo de Negocio',
				name: 'tipo_negocio',
				type: 'options',
				options: [
					{ name: 'Nuevo', value: 'nuevo' },
					{ name: 'Renovación', value: 'renovacion' },
					{ name: 'Upsell', value: 'upsell' },
				],
				default: 'nuevo',
				description: 'Tipo de negocio de la negociación',
				routing: { send: { type: 'body', property: 'tipo_negocio' } },
			},
			{
				displayName: 'Valor',
				name: 'valor',
				type: 'number',
				default: 0,
				description: 'Valor monetario de la negociación',
				routing: { send: { type: 'body', property: 'valor' } },
			},
		],
	},
];
