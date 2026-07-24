import type { INodeProperties } from 'n8n-workflow';

import { handleLcResponse } from '../GenericFunctions';

export const automationOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
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
				name: 'Create',
				value: 'create',
				action: 'Create an automation',
				description:
					'Programa una automatización pendiente para un contacto. Si es de tipo mensaje requiere Phone Number, Channel ID y Message (o Template ID en canales WABA); si es de tipo correo requiere Email Data.',
				routing: {
					request: { method: 'POST', url: '/crm/addAutomation' },
					output: { postReceive: [handleLcResponse] },
				},
			},
			{
				name: 'Delete',
				value: 'delete',
				action: 'Delete an automation',
				description: 'Solo permite cancelar automatizaciones en estado pendiente',
				routing: {
					request: { method: 'POST', url: '/crm/deleteAutomation' },
					output: { postReceive: [handleLcResponse] },
				},
			},
			{
				name: 'Update',
				value: 'update',
				action: 'Update an automation',
				description:
					'Solo permite editar automatizaciones en estado pendiente. Para tipo mensaje edita el texto, la fecha, el canal, la plantilla o los adjuntos; para tipo correo edita Email Data y/o la fecha.',
				routing: {
					request: { method: 'POST', url: '/crm/editAutomation' },
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
		displayName: 'Type',
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
		displayName: 'Contact ID',
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
		displayName: 'Scheduled Date',
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
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				resource: ['automation'],
				operation: ['create'],
			},
		},
		options: [
			{
				displayName: 'Channel ID',
				name: 'id_canal',
				type: 'number',
				default: 0,
				description: 'Requerido si Type es mensaje',
				routing: { send: { type: 'body', property: 'id_canal' } },
			},
			{
				displayName: 'Deal ID',
				name: 'id_deal',
				type: 'number',
				default: 0,
				description: 'Opcional; consecutivo del deal donde registrar la actividad',
				routing: { send: { type: 'body', property: 'id_deal' } },
			},
			{
				displayName: 'Email Data',
				name: 'data',
				type: 'json',
				default: '{}',
				description:
					'Requerido si Type es correo. Objeto con email_destino, asunto y cuerpo_html.',
				routing: {
					send: {
						type: 'body',
						property: 'data',
						value: '={{ typeof $value === "object" && $value !== null ? $value : JSON.parse($value || "{}") }}',
					},
				},
			},
			{
				displayName: 'Files',
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
				displayName: 'Internal Deal ID',
				name: 'id_interno',
				type: 'number',
				default: 0,
				description: 'ID interno del deal (alternativa a Deal ID/consecutivo)',
				routing: { send: { type: 'body', property: 'id_interno' } },
			},
			{
				displayName: 'Message',
				name: 'mensaje',
				type: 'string',
				typeOptions: { rows: 3 },
				default: '',
				description: 'Requerido si Type es mensaje y el canal es WhatsApp (QR/Cloud)',
				routing: { send: { type: 'body', property: 'mensaje' } },
			},
			{
				displayName: 'Phone Number',
				name: 'numero',
				type: 'string',
				default: '',
				description: 'Requerido si Type es mensaje; teléfono o destino del contacto',
				routing: { send: { type: 'body', property: 'numero' } },
			},
			{
				displayName: 'Template ID',
				name: 'id_plantilla',
				type: 'string',
				default: '',
				description: 'Requerido si Type es mensaje y el canal es WABA/WABA Meta',
				routing: { send: { type: 'body', property: 'id_plantilla' } },
			},
			{
				displayName: 'Template Variables',
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
		displayName: 'Automation ID',
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
		displayName: 'Automation ID',
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
		displayName: 'Update Fields',
		name: 'updateFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				resource: ['automation'],
				operation: ['update'],
			},
		},
		options: [
			{
				displayName: 'Channel ID',
				name: 'id_canal',
				type: 'number',
				default: 0,
				description: 'Solo aplica si Type es mensaje',
				routing: { send: { type: 'body', property: 'id_canal' } },
			},
			{
				displayName: 'Email Data',
				name: 'data',
				type: 'json',
				default: '{}',
				description: 'Payload del correo (solo Type correo)',
				routing: {
					send: {
						type: 'body',
						property: 'data',
						value: '={{ typeof $value === "object" && $value !== null ? $value : JSON.parse($value || "{}") }}',
					},
				},
			},
			{
				displayName: 'Files',
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
				displayName: 'Message',
				name: 'mensaje',
				type: 'string',
				typeOptions: { rows: 3 },
				default: '',
				description: 'Nuevo texto (solo Type mensaje, canal WhatsApp)',
				routing: { send: { type: 'body', property: 'mensaje' } },
			},
			{
				displayName: 'Scheduled Date',
				name: 'fecha_programada',
				type: 'string',
				default: '',
				placeholder: 'YYYY-MM-DD HH:mm:ss',
				description: 'Nueva fecha y hora programada',
				routing: { send: { type: 'body', property: 'fecha_programada' } },
			},
			{
				displayName: 'Template ID',
				name: 'id_plantilla',
				type: 'string',
				default: '',
				description: 'Solo aplica si Type es mensaje y el canal es WABA/WABA Meta',
				routing: { send: { type: 'body', property: 'id_plantilla' } },
			},
			{
				displayName: 'Template Variables',
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
