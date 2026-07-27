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
				name: 'Update',
				value: 'update',
				action: 'Update an automation',
				description:
					'Only allows editing automations in pending status. When Type is Message, it edits the text, date, channel, template, or attachments; when Type is Email, it edits Email Data and/or the date.',
				routing: {
					request: { method: 'POST', url: '/crm/editAutomation' },
					output: { postReceive: [handleLcResponse] },
				},
			},
			{
				name: 'Create',
				value: 'create',
				action: 'Create an automation',
				description:
					'Schedules a pending automation for a contact. If Type is Message, it requires Phone Number, Channel ID, and Message (or Template ID on WABA channels); if Type is Email, it requires Email Data.',
				routing: {
					request: { method: 'POST', url: '/crm/addAutomation' },
					output: { postReceive: [handleLcResponse] },
				},
			},
			{
				name: 'Delete',
				value: 'delete',
				action: 'Delete an automation',
				description: 'Only allows canceling automations in pending status',
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
		displayName: 'Type',
		name: 'tipo',
		type: 'options',
		required: true,
		options: [
			{ name: 'Email', value: 'correo' },
			{ name: 'Message', value: 'mensaje' },
		],
		default: 'mensaje',
		description: 'Type of automation to schedule',
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
		description: 'ID of the automation contact',
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
		description: 'Scheduled date and time of the automation',
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
				displayName: 'Attachments',
				name: 'archivos',
				type: 'json',
				default: '[]',
				description: 'Attachments; WhatsApp channels only (not supported on WABA). Array of objects with URL, nombre, and extension.',
				routing: {
					send: {
						type: 'body',
						property: 'archivos',
						value: '={{ typeof $value === "object" && $value !== null ? $value : JSON.parse($value || "[]") }}',
					},
				},
			},
			{
				displayName: 'Channel Name or ID',
				name: 'id_canal',
				type: 'options',
				typeOptions: { loadOptionsMethod: 'getChannels' },
				default: '',
				description: 'Required if Type is Message. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
				routing: { send: { type: 'body', property: 'id_canal' } },
			},
			{
				displayName: 'Deal ID',
				name: 'id_deal',
				type: 'number',
				default: 0,
				description: 'Optional; consecutive number of the deal where the activity is logged',
				routing: { send: { type: 'body', property: 'id_deal' } },
			},
			{
				displayName: 'Email Data',
				name: 'data',
				type: 'json',
				default: '{}',
				description:
					'Required if Type is Email. Object with email_destino, asunto, and cuerpo_html.',
				routing: {
					send: {
						type: 'body',
						property: 'data',
						value: '={{ typeof $value === "object" && $value !== null ? $value : JSON.parse($value || "{}") }}',
					},
				},
			},
			{
				displayName: 'Internal Deal ID',
				name: 'id_interno',
				type: 'number',
				default: 0,
				description: 'Internal deal ID (alternative to Deal ID/consecutive number)',
				routing: { send: { type: 'body', property: 'id_interno' } },
			},
			{
				displayName: 'Message',
				name: 'mensaje',
				type: 'string',
				typeOptions: { rows: 3 },
				default: '',
				description: 'Required if Type is Message and the channel is WhatsApp (QR/Cloud)',
				routing: { send: { type: 'body', property: 'mensaje' } },
			},
			{
				displayName: 'Phone Number',
				name: 'numero',
				type: 'string',
				default: '',
				description: 'Required if Type is Message; phone number or destination of the contact',
				routing: { send: { type: 'body', property: 'numero' } },
			},
			{
				displayName: 'Template Name or ID',
				name: 'id_plantilla',
				type: 'options',
				typeOptions: { loadOptionsMethod: 'getWabaTemplates', loadOptionsDependsOn: ['&id_canal'] },
				default: '',
				description: 'Required if Type is Message and the channel is WABA/WABA Meta. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
				routing: { send: { type: 'body', property: 'id_plantilla' } },
			},
			{
				displayName: 'Template Variables',
				name: 'variables',
				type: 'json',
				default: '[]',
				description: 'Parameters of the WABA template (array of strings)',
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
		description: 'ID of the automation to cancel',
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
		description: 'ID of the automation to edit',
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
				displayName: 'Attachments',
				name: 'archivos',
				type: 'json',
				default: '[]',
				description: 'Attachments; WhatsApp channels only (array of objects with URL, nombre, and extension)',
				routing: {
					send: {
						type: 'body',
						property: 'archivos',
						value: '={{ typeof $value === "object" && $value !== null ? $value : JSON.parse($value || "[]") }}',
					},
				},
			},
			{
				displayName: 'Channel Name or ID',
				name: 'id_canal',
				type: 'options',
				typeOptions: { loadOptionsMethod: 'getChannels' },
				default: '',
				description: 'Only applies if Type is Message. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
				routing: { send: { type: 'body', property: 'id_canal' } },
			},
			{
				displayName: 'Email Data',
				name: 'data',
				type: 'json',
				default: '{}',
				description: 'Email payload (only if Type is Email)',
				routing: {
					send: {
						type: 'body',
						property: 'data',
						value: '={{ typeof $value === "object" && $value !== null ? $value : JSON.parse($value || "{}") }}',
					},
				},
			},
			{
				displayName: 'Message',
				name: 'mensaje',
				type: 'string',
				typeOptions: { rows: 3 },
				default: '',
				description: 'New text (Type Message only, WhatsApp channel)',
				routing: { send: { type: 'body', property: 'mensaje' } },
			},
			{
				displayName: 'Scheduled Date',
				name: 'fecha_programada',
				type: 'string',
				default: '',
				placeholder: 'YYYY-MM-DD HH:mm:ss',
				description: 'New scheduled date and time',
				routing: { send: { type: 'body', property: 'fecha_programada' } },
			},
			{
				displayName: 'Template Name or ID',
				name: 'id_plantilla',
				type: 'options',
				typeOptions: { loadOptionsMethod: 'getWabaTemplates', loadOptionsDependsOn: ['&id_canal'] },
				default: '',
				description: 'Only applies if Type is Message and the channel is WABA/WABA Meta. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
				routing: { send: { type: 'body', property: 'id_plantilla' } },
			},
			{
				displayName: 'Template Variables',
				name: 'variables',
				type: 'json',
				default: '[]',
				description: 'Parameters of the WABA template (array of strings)',
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
