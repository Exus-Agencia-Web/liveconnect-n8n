import type { INodeProperties } from 'n8n-workflow';

import { handleLcResponse } from '../GenericFunctions';

export const wabaOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
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
				name: 'Get Many Templates',
				value: 'getManyTemplates',
				action: 'Get many templates',
				description:
					'Retorna las plantillas de WhatsApp Business API configuradas en el canal, con paginación y filtros opcionales de Meta',
				routing: {
					request: { method: 'POST', url: '/direct/waba/getTemplates' },
					output: { postReceive: [handleLcResponse] },
				},
			},
			{
				name: 'Get Template',
				value: 'getTemplate',
				action: 'Get a template',
				description:
					'Busca una plantilla por ID o por nombre. Requiere el ID del canal y, como identificador, el ID de la plantilla en Meta o su nombre alterno.',
				routing: {
					request: { method: 'POST', url: '/direct/waba/getTemplate' },
					output: { postReceive: [handleLcResponse] },
				},
			},
			{
				name: 'Send Quick Reply',
				value: 'sendQuickAnswer',
				action: 'Send a quick reply',
				description:
					'Envía una respuesta rápida (texto y/o archivo adjunto) al número destino, sustituyendo {clave} en el texto por las variables indicadas',
				routing: {
					request: { method: 'POST', url: '/direct/waba/sendwabaQuickAnswer' },
					output: { postReceive: [handleLcResponse] },
				},
			},
			{
				name: 'Send Template',
				value: 'sendTemplate',
				action: 'Send a template',
				description:
					'Envía la plantilla indicada al número destino por el canal seleccionado. El encabezado admite imagen, documento o video (el video se rechaza si supera 16MB o no es mp4/3gp).',
				routing: {
					request: { method: 'POST', url: '/direct/waba/sendTemplate' },
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
		displayName: 'Channel ID',
		name: 'id_canal',
		type: 'number',
		required: true,
		default: 0,
		description: 'ID del canal WABA de la cuenta',
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
		displayName: 'Filters',
		name: 'filters',
		type: 'collection',
		placeholder: 'Add Filter',
		default: {},
		displayOptions: {
			show: {
				resource: ['waba'],
				operation: ['getManyTemplates'],
			},
		},
		options: [
			{
				displayName: 'Approved Only',
				name: 'approved',
				type: 'boolean',
				default: false,
				description: 'Whether to return only templates with APPROVED status',
				routing: { send: { type: 'body', property: 'approved' } },
			},
			{
				displayName: 'Category',
				name: 'category',
				type: 'options',
				options: [
					{ name: 'Authentication', value: 'AUTHENTICATION' },
					{ name: 'Marketing', value: 'MARKETING' },
					{ name: 'Utility', value: 'UTILITY' },
				],
				default: 'MARKETING',
				description: 'Filtra por categoría de Meta',
				routing: { send: { type: 'body', property: 'category' } },
			},
			{
				displayName: 'Limit',
				name: 'limit',
				type: 'number',
				typeOptions: { minValue: 1 },
				default: 50,
				description: 'Max number of results to return',
				routing: { send: { type: 'body', property: 'limit' } },
			},
			{
				displayName: 'Name',
				name: 'name',
				type: 'string',
				default: '',
				description: 'Filtra por nombre de la plantilla',
				routing: { send: { type: 'body', property: 'name' } },
			},
			{
				displayName: 'Paging Cursor',
				name: 'paging',
				type: 'string',
				default: '',
				description: 'Cursor de paginación devuelto por una llamada previa',
				routing: { send: { type: 'body', property: 'paging' } },
			},
		],
	},

	// ----------------------------------
	//         waba: getTemplate
	// ----------------------------------
	{
		displayName: 'Channel ID',
		name: 'id_canal',
		type: 'number',
		required: true,
		default: 0,
		description: 'ID del canal WABA de la cuenta',
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
		displayName: 'Search Fields',
		name: 'searchFields',
		type: 'collection',
		placeholder: 'Add Field',
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
				displayName: 'Template ID',
				name: 'id',
				type: 'string',
				default: '',
				description: 'ID de la plantilla en Meta',
				routing: { send: { type: 'body', property: 'id' } },
			},
			{
				displayName: 'Template Name',
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
		displayName: 'Channel ID',
		name: 'id_canal',
		type: 'number',
		required: true,
		default: 0,
		description: 'ID del canal WABA de la cuenta',
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
		displayName: 'Phone Number',
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
		displayName: 'Quick Reply ID',
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
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
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
		displayName: 'Channel ID',
		name: 'id_canal',
		type: 'number',
		required: true,
		default: 0,
		description: 'ID del canal WABA de la cuenta',
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
		displayName: 'Phone Number',
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
		displayName: 'Template ID',
		name: 'id_plantilla',
		type: 'string',
		required: true,
		default: '',
		description: 'ID o nombre de la plantilla a enviar',
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
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				resource: ['waba'],
				operation: ['sendTemplate'],
			},
		},
		options: [
			{
				displayName: 'Additional Message',
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
				displayName: 'Body Variables',
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
				displayName: 'Buttons',
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
				displayName: 'Delegate Team ID',
				name: 'id_to_delegate',
				type: 'number',
				default: 0,
				description: 'ID del equipo al que delegar el seguimiento de la plantilla enviada',
				routing: { send: { type: 'body', property: 'id_to_delegate' } },
			},
			{
				displayName: 'Header Document URL',
				name: 'url_documento_encabezado',
				type: 'string',
				default: '',
				description: 'URL de documento para el encabezado',
				routing: { send: { type: 'body', property: 'url_documento_encabezado' } },
			},
			{
				displayName: 'Header Image URL',
				name: 'url_imagen_encabezado',
				type: 'string',
				default: '',
				description: 'URL de imagen para el encabezado',
				routing: { send: { type: 'body', property: 'url_imagen_encabezado' } },
			},
			{
				displayName: 'Header Variables',
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
			{
				displayName: 'Header Video URL',
				name: 'url_video_encabezado',
				type: 'string',
				default: '',
				description: 'URL de video (mp4/3gp, máx. 16MB) para el encabezado.',
				routing: { send: { type: 'body', property: 'url_video_encabezado' } },
			},
		],
	},
];
