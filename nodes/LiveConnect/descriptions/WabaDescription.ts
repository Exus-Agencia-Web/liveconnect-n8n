import type { INodeProperties } from 'n8n-workflow';

import { handleLcResponse } from '../GenericFunctions';

export const wabaOperations: INodeProperties[] = [
	{
		displayName: 'Operación',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['waba'],
			},
		},
		options: [
			{
				name: 'Enviar Plantilla',
				value: 'sendTemplate',
				action: 'Enviar una plantilla',
				description:
					'Envía la plantilla indicada al número destino por el canal seleccionado. El encabezado admite imagen, documento o video (el video se rechaza si supera 16MB o no es mp4/3gp).',
				routing: {
					request: { method: 'POST', url: '/direct/waba/sendTemplate' },
					output: { postReceive: [handleLcResponse] },
				},
			},
			{
				name: 'Enviar Respuesta Rápida',
				value: 'sendQuickAnswer',
				action: 'Enviar una respuesta rápida',
				description:
					'Envía una respuesta rápida (texto y/o archivo adjunto) al número destino, sustituyendo {clave} en el texto por las variables indicadas',
				routing: {
					request: { method: 'POST', url: '/direct/waba/sendwabaQuickAnswer' },
					output: { postReceive: [handleLcResponse] },
				},
			},
			{
				name: 'Obtener Plantilla',
				value: 'getTemplate',
				action: 'Obtener una plantilla',
				description:
					'Busca una plantilla por ID o por nombre. Requiere el ID del canal y, como identificador, el ID de la plantilla en Meta o su nombre alterno.',
				routing: {
					request: { method: 'POST', url: '/direct/waba/getTemplate' },
					output: { postReceive: [handleLcResponse] },
				},
			},
			{
				name: 'Obtener Varias Plantillas',
				value: 'getManyTemplates',
				action: 'Obtener varias plantillas',
				description:
					'Retorna las plantillas de WhatsApp Business API configuradas en el canal, con paginación y filtros opcionales de Meta',
				routing: {
					request: { method: 'POST', url: '/direct/waba/getTemplates' },
					output: { postReceive: [handleLcResponse] },
				},
			},
		],
		default: 'sendTemplate',
	},
];

export const wabaFields: INodeProperties[] = [
	// ----------------------------------
	//         waba: getManyTemplates
	// ----------------------------------
	{
		displayName: 'ID del Canal',
		name: 'id_canal',
		type: 'options',
		typeOptions: { loadOptionsMethod: 'getChannels' },
		required: true,
		default: '',
		description:
			'ID del canal WABA de la cuenta. Elige de la lista o especifica un ID con una expresión.',
		displayOptions: {
			show: {
				resource: ['waba'],
				operation: ['getManyTemplates'],
			},
		},
		routing: {
			send: { type: 'body', property: 'id_canal' },
		},
	},
	{
		displayName: 'Filtros',
		name: 'filters',
		type: 'collection',
		placeholder: 'Agregar Filtro',
		default: {},
		displayOptions: {
			show: {
				resource: ['waba'],
				operation: ['getManyTemplates'],
			},
		},
		options: [
			{
				displayName: 'Categoría',
				name: 'category',
				type: 'options',
				options: [
					{ name: 'Autenticación', value: 'AUTHENTICATION' },
					{ name: 'Marketing', value: 'MARKETING' },
					{ name: 'Utilidad', value: 'UTILITY' },
				],
				default: 'MARKETING',
				description: 'Filtra por categoría de Meta',
				routing: { send: { type: 'body', property: 'category' } },
			},
			{
				displayName: 'Cursor de Paginación',
				name: 'paging',
				type: 'string',
				default: '',
				description: 'Cursor de paginación devuelto por una llamada previa',
				routing: { send: { type: 'body', property: 'paging' } },
			},
			{
				displayName: 'Límite',
				name: 'limit',
				type: 'number',
				typeOptions: { minValue: 1 },
				default: 50,
				description: 'Cantidad máxima de resultados a devolver',
				routing: { send: { type: 'body', property: 'limit' } },
			},
			{
				displayName: 'Nombre',
				name: 'name',
				type: 'string',
				default: '',
				description: 'Filtra por nombre de la plantilla',
				routing: { send: { type: 'body', property: 'name' } },
			},
			{
				displayName: 'Solo Aprobadas',
				name: 'approved',
				type: 'boolean',
				default: false,
				description: 'Si se activa, devuelve solo las plantillas con estado APPROVED',
				routing: { send: { type: 'body', property: 'approved' } },
			},
		],
	},

	// ----------------------------------
	//         waba: getTemplate
	// ----------------------------------
	{
		displayName: 'ID del Canal',
		name: 'id_canal',
		type: 'options',
		typeOptions: { loadOptionsMethod: 'getChannels' },
		required: true,
		default: '',
		description:
			'ID del canal WABA de la cuenta. Elige de la lista o especifica un ID con una expresión.',
		displayOptions: {
			show: {
				resource: ['waba'],
				operation: ['getTemplate'],
			},
		},
		routing: {
			send: { type: 'body', property: 'id_canal' },
		},
	},
	{
		displayName: 'Campos de Búsqueda',
		name: 'searchFields',
		type: 'collection',
		placeholder: 'Agregar Campo',
		default: {},
		description: 'Envía el ID de la plantilla en Meta o su nombre alterno para identificarla',
		displayOptions: {
			show: {
				resource: ['waba'],
				operation: ['getTemplate'],
			},
		},
		options: [
			{
				displayName: 'ID de la Plantilla',
				name: 'id',
				type: 'string',
				default: '',
				description: 'ID de la plantilla en Meta',
				routing: { send: { type: 'body', property: 'id' } },
			},
			{
				displayName: 'Nombre de la Plantilla',
				name: 'id_template',
				type: 'string',
				default: '',
				description: 'Nombre o ID alterno de la plantilla',
				routing: { send: { type: 'body', property: 'id_template' } },
			},
		],
	},

	// ----------------------------------
	//         waba: sendQuickAnswer
	// ----------------------------------
	{
		displayName: 'ID del Canal',
		name: 'id_canal',
		type: 'options',
		typeOptions: { loadOptionsMethod: 'getChannels' },
		required: true,
		default: '',
		description:
			'ID del canal WABA de la cuenta. Elige de la lista o especifica un ID con una expresión.',
		displayOptions: {
			show: {
				resource: ['waba'],
				operation: ['sendQuickAnswer'],
			},
		},
		routing: {
			send: { type: 'body', property: 'id_canal' },
		},
	},
	{
		displayName: 'Número de Teléfono',
		name: 'numero',
		type: 'string',
		required: true,
		default: '',
		description: 'Celular destino',
		displayOptions: {
			show: {
				resource: ['waba'],
				operation: ['sendQuickAnswer'],
			},
		},
		routing: {
			send: { type: 'body', property: 'numero' },
		},
	},
	{
		displayName: 'ID de la Respuesta Rápida',
		name: 'id_respuesta',
		type: 'number',
		required: true,
		default: 0,
		description: 'ID de la respuesta rápida (lc_respuestasrapidas)',
		displayOptions: {
			show: {
				resource: ['waba'],
				operation: ['sendQuickAnswer'],
			},
		},
		routing: {
			send: { type: 'body', property: 'id_respuesta' },
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
				resource: ['waba'],
				operation: ['sendQuickAnswer'],
			},
		},
		options: [
			{
				displayName: 'Variables',
				name: 'variables',
				type: 'json',
				default: '{}',
				description: 'Pares clave-valor para sustituir {clave} en el texto de la respuesta',
				routing: {
					send: {
						type: 'body',
						property: 'variables',
						value: '={{ typeof $value === "object" && $value !== null ? $value : JSON.parse($value || "{}") }}',
					},
				},
			},
		],
	},

	// ----------------------------------
	//         waba: sendTemplate
	// ----------------------------------
	{
		displayName: 'ID del Canal',
		name: 'id_canal',
		type: 'options',
		typeOptions: { loadOptionsMethod: 'getChannels' },
		required: true,
		default: '',
		description:
			'ID del canal WABA de la cuenta. Elige de la lista o especifica un ID con una expresión.',
		displayOptions: {
			show: {
				resource: ['waba'],
				operation: ['sendTemplate'],
			},
		},
		routing: {
			send: { type: 'body', property: 'id_canal' },
		},
	},
	{
		displayName: 'Número de Teléfono',
		name: 'numero',
		type: 'string',
		required: true,
		default: '',
		description: 'Celular destino',
		displayOptions: {
			show: {
				resource: ['waba'],
				operation: ['sendTemplate'],
			},
		},
		routing: {
			send: { type: 'body', property: 'numero' },
		},
	},
	{
		displayName: 'ID de la Plantilla',
		name: 'id_plantilla',
		type: 'options',
		typeOptions: { loadOptionsMethod: 'getWabaTemplates' },
		required: true,
		default: '',
		description:
			'ID o nombre de la plantilla a enviar. Elige de la lista o especifica un ID con una expresión.',
		displayOptions: {
			show: {
				resource: ['waba'],
				operation: ['sendTemplate'],
			},
		},
		routing: {
			send: { type: 'body', property: 'id_plantilla' },
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
				resource: ['waba'],
				operation: ['sendTemplate'],
			},
		},
		options: [
			{
				displayName: 'Botones',
				name: 'buttons',
				type: 'json',
				default: '[]',
				description: 'Botones dinámicos de la plantilla (arreglo de objetos)',
				routing: {
					send: {
						type: 'body',
						property: 'buttons',
						value: '={{ typeof $value === "object" && $value !== null ? $value : JSON.parse($value || "[]") }}',
					},
				},
			},
			{
				displayName: 'ID del Equipo a Delegar',
				name: 'id_to_delegate',
				type: 'options',
				typeOptions: { loadOptionsMethod: 'getGroups' },
				default: '',
				description:
					'ID del equipo al que delegar el seguimiento de la plantilla enviada. Elige de la lista o especifica un ID con una expresión.',
				routing: { send: { type: 'body', property: 'id_to_delegate' } },
			},
			{
				displayName: 'Mensaje Adicional',
				name: 'message',
				type: 'json',
				default: '{}',
				description: 'Mensaje adicional para acompañar la plantilla',
				routing: {
					send: {
						type: 'body',
						property: 'message',
						value: '={{ typeof $value === "object" && $value !== null ? $value : JSON.parse($value || "{}") }}',
					},
				},
			},
			{
				displayName: 'URL de la Imagen del Encabezado',
				name: 'url_imagen_encabezado',
				type: 'string',
				default: '',
				description: 'URL de imagen para el encabezado',
				routing: { send: { type: 'body', property: 'url_imagen_encabezado' } },
			},
			{
				displayName: 'URL del Documento del Encabezado',
				name: 'url_documento_encabezado',
				type: 'string',
				default: '',
				description: 'URL de documento para el encabezado',
				routing: { send: { type: 'body', property: 'url_documento_encabezado' } },
			},
			{
				displayName: 'URL del Video del Encabezado',
				name: 'url_video_encabezado',
				type: 'string',
				default: '',
				description: 'URL de video (mp4/3gp, máx. 16MB) para el encabezado.',
				routing: { send: { type: 'body', property: 'url_video_encabezado' } },
			},
			{
				displayName: 'Variables del Cuerpo',
				name: 'variables',
				type: 'string',
				default: '',
				placeholder: 'value1,value2',
				description: 'Variables del cuerpo de la plantilla, separadas por comas',
				routing: {
					send: {
						type: 'body',
						property: 'variables',
						value:
							'={{ $value.toString().split(",").map((v) => v.trim()).filter((v) => v !== "") }}',
					},
				},
			},
			{
				displayName: 'Variables del Encabezado',
				name: 'variables_encabezado',
				type: 'string',
				default: '',
				placeholder: 'value1,value2',
				description: 'Variables del encabezado de texto, separadas por comas',
				routing: {
					send: {
						type: 'body',
						property: 'variables_encabezado',
						value:
							'={{ $value.toString().split(",").map((v) => v.trim()).filter((v) => v !== "") }}',
					},
				},
			},
		],
	},
];
