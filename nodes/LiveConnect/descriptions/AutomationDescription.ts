import type { INodeProperties } from 'n8n-workflow';

import { handleLcResponse } from '../GenericFunctions';

export const automationOperations: INodeProperties[] = [
	{
		displayName: 'Operación',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['automation'],
			},
		},
		options: [
			{
				name: 'Actualizar',
				value: 'update',
				action: 'Actualizar una automatización',
				description:
					'Solo permite editar automatizaciones en estado pendiente. Para tipo mensaje edita el texto, la fecha, el canal, la plantilla o los adjuntos; para tipo correo edita Datos del Correo Electrónico y/o la fecha.',
				routing: {
					request: { method: 'POST', url: '/crm/editAutomation' },
					output: { postReceive: [handleLcResponse] },
				},
			},
			{
				name: 'Crear',
				value: 'create',
				action: 'Crear una automatización',
				description:
					'Programa una automatización pendiente para un contacto. Si es de tipo mensaje requiere Número de Teléfono, ID del Canal y Mensaje (o ID de la Plantilla en canales WABA); si es de tipo correo requiere Datos del Correo Electrónico.',
				routing: {
					request: { method: 'POST', url: '/crm/addAutomation' },
					output: { postReceive: [handleLcResponse] },
				},
			},
			{
				name: 'Eliminar',
				value: 'delete',
				action: 'Eliminar una automatización',
				description: 'Solo permite cancelar automatizaciones en estado pendiente',
				routing: {
					request: { method: 'POST', url: '/crm/deleteAutomation' },
					output: { postReceive: [handleLcResponse] },
				},
			},
		],
		default: 'create',
	},
];

export const automationFields: INodeProperties[] = [
	// ----------------------------------
	//         automation: create
	// ----------------------------------
	{
		displayName: 'Tipo',
		name: 'tipo',
		type: 'options',
		required: true,
		options: [
			{ name: 'Correo', value: 'correo' },
			{ name: 'Mensaje', value: 'mensaje' },
		],
		default: 'mensaje',
		description: 'Tipo de automatización a programar',
		displayOptions: {
			show: {
				resource: ['automation'],
				operation: ['create'],
			},
		},
		routing: {
			send: { type: 'body', property: 'tipo' },
		},
	},
	{
		displayName: 'ID del Contacto',
		name: 'id_contacto',
		type: 'number',
		required: true,
		default: 0,
		description: 'ID del contacto de la automatización',
		displayOptions: {
			show: {
				resource: ['automation'],
				operation: ['create'],
			},
		},
		routing: {
			send: { type: 'body', property: 'id_contacto' },
		},
	},
	{
		displayName: 'Fecha Programada',
		name: 'fecha_programada',
		type: 'string',
		required: true,
		default: '',
		placeholder: 'YYYY-MM-DD HH:mm:ss',
		description: 'Fecha y hora programada de la automatización',
		displayOptions: {
			show: {
				resource: ['automation'],
				operation: ['create'],
			},
		},
		routing: {
			send: { type: 'body', property: 'fecha_programada' },
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
				resource: ['automation'],
				operation: ['create'],
			},
		},
		options: [
			{
				displayName: 'Archivos',
				name: 'archivos',
				type: 'json',
				default: '[]',
				description: 'Adjuntos; solo canales WhatsApp (no soportado en WABA). Arreglo de objetos con URL, nombre y extension.',
				routing: {
					send: {
						type: 'body',
						property: 'archivos',
						value: '={{ typeof $value === "object" && $value !== null ? $value : JSON.parse($value || "[]") }}',
					},
				},
			},
			{
				displayName: 'Datos del Correo Electrónico',
				name: 'data',
				type: 'json',
				default: '{}',
				description:
					'Requerido si Tipo es correo. Objeto con email_destino, asunto y cuerpo_html.',
				routing: {
					send: {
						type: 'body',
						property: 'data',
						value: '={{ typeof $value === "object" && $value !== null ? $value : JSON.parse($value || "{}") }}',
					},
				},
			},
			{
				displayName: 'ID de la Negociación',
				name: 'id_deal',
				type: 'number',
				default: 0,
				description: 'Opcional; consecutivo de la negociación donde registrar la actividad',
				routing: { send: { type: 'body', property: 'id_deal' } },
			},
			{
				displayName: 'ID de la Plantilla',
				name: 'id_plantilla',
				type: 'options',
				typeOptions: { loadOptionsMethod: 'getWabaTemplates', loadOptionsDependsOn: ['&id_canal'] },
				default: '',
				description:
					'Requerido si Tipo es mensaje y el canal es WABA/WABA Meta. Elige de la lista o especifica un ID con una expresión.',
				routing: { send: { type: 'body', property: 'id_plantilla' } },
			},
			{
				displayName: 'ID del Canal',
				name: 'id_canal',
				type: 'options',
				typeOptions: { loadOptionsMethod: 'getChannels' },
				default: '',
				description:
					'Requerido si Tipo es mensaje. Elige de la lista o especifica un ID con una expresión.',
				routing: { send: { type: 'body', property: 'id_canal' } },
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
				displayName: 'Mensaje',
				name: 'mensaje',
				type: 'string',
				typeOptions: { rows: 3 },
				default: '',
				description: 'Requerido si Tipo es mensaje y el canal es WhatsApp (QR/Cloud)',
				routing: { send: { type: 'body', property: 'mensaje' } },
			},
			{
				displayName: 'Número de Teléfono',
				name: 'numero',
				type: 'string',
				default: '',
				description: 'Requerido si Tipo es mensaje; teléfono o destino del contacto',
				routing: { send: { type: 'body', property: 'numero' } },
			},
			{
				displayName: 'Variables de la Plantilla',
				name: 'variables',
				type: 'json',
				default: '[]',
				description: 'Parámetros de la plantilla WABA (arreglo de textos)',
				routing: {
					send: {
						type: 'body',
						property: 'variables',
						value: '={{ typeof $value === "object" && $value !== null ? $value : JSON.parse($value || "[]") }}',
					},
				},
			},
		],
	},

	// ----------------------------------
	//         automation: delete
	// ----------------------------------
	{
		displayName: 'ID de la Automatización',
		name: 'id',
		type: 'number',
		required: true,
		default: 0,
		description: 'ID de la automatización a cancelar',
		displayOptions: {
			show: {
				resource: ['automation'],
				operation: ['delete'],
			},
		},
		routing: {
			send: { type: 'body', property: 'id' },
		},
	},

	// ----------------------------------
	//         automation: update
	// ----------------------------------
	{
		displayName: 'ID de la Automatización',
		name: 'id',
		type: 'number',
		required: true,
		default: 0,
		description: 'ID de la automatización a editar',
		displayOptions: {
			show: {
				resource: ['automation'],
				operation: ['update'],
			},
		},
		routing: {
			send: { type: 'body', property: 'id' },
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
				resource: ['automation'],
				operation: ['update'],
			},
		},
		options: [
			{
				displayName: 'Archivos',
				name: 'archivos',
				type: 'json',
				default: '[]',
				description: 'Adjuntos; solo canales WhatsApp (arreglo de objetos con URL, nombre y extension)',
				routing: {
					send: {
						type: 'body',
						property: 'archivos',
						value: '={{ typeof $value === "object" && $value !== null ? $value : JSON.parse($value || "[]") }}',
					},
				},
			},
			{
				displayName: 'Datos del Correo Electrónico',
				name: 'data',
				type: 'json',
				default: '{}',
				description: 'Payload del correo (solo Tipo correo)',
				routing: {
					send: {
						type: 'body',
						property: 'data',
						value: '={{ typeof $value === "object" && $value !== null ? $value : JSON.parse($value || "{}") }}',
					},
				},
			},
			{
				displayName: 'Fecha Programada',
				name: 'fecha_programada',
				type: 'string',
				default: '',
				placeholder: 'YYYY-MM-DD HH:mm:ss',
				description: 'Nueva fecha y hora programada',
				routing: { send: { type: 'body', property: 'fecha_programada' } },
			},
			{
				displayName: 'ID de la Plantilla',
				name: 'id_plantilla',
				type: 'options',
				typeOptions: { loadOptionsMethod: 'getWabaTemplates', loadOptionsDependsOn: ['&id_canal'] },
				default: '',
				description:
					'Solo aplica si Tipo es mensaje y el canal es WABA/WABA Meta. Elige de la lista o especifica un ID con una expresión.',
				routing: { send: { type: 'body', property: 'id_plantilla' } },
			},
			{
				displayName: 'ID del Canal',
				name: 'id_canal',
				type: 'options',
				typeOptions: { loadOptionsMethod: 'getChannels' },
				default: '',
				description:
					'Solo aplica si Tipo es mensaje. Elige de la lista o especifica un ID con una expresión.',
				routing: { send: { type: 'body', property: 'id_canal' } },
			},
			{
				displayName: 'Mensaje',
				name: 'mensaje',
				type: 'string',
				typeOptions: { rows: 3 },
				default: '',
				description: 'Nuevo texto (solo Tipo mensaje, canal WhatsApp)',
				routing: { send: { type: 'body', property: 'mensaje' } },
			},
			{
				displayName: 'Variables de la Plantilla',
				name: 'variables',
				type: 'json',
				default: '[]',
				description: 'Parámetros de la plantilla WABA (arreglo de textos)',
				routing: {
					send: {
						type: 'body',
						property: 'variables',
						value: '={{ typeof $value === "object" && $value !== null ? $value : JSON.parse($value || "[]") }}',
					},
				},
			},
		],
	},
];
