import type { INodeProperties } from 'n8n-workflow';

import { handleLcResponse } from '../GenericFunctions';

export const conversationOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['conversation'],
			},
		},
		options: [
			{
				name: 'Create',
				value: 'create',
				action: 'Create a conversation',
				description:
					'Abre una conversación en el canal indicado. Si ya existe una conversación activa con el contacto, no la duplica: devuelve la existente y agrega al usuario como participante.',
				routing: {
					request: { method: 'POST', url: '/conversation/create' },
					output: { postReceive: [handleLcResponse] },
				},
			},
		],
		default: 'create',
	},
];

export const conversationFields: INodeProperties[] = [
	// ----------------------------------
	//         conversation: create
	// ----------------------------------
	{
		displayName: 'Channel ID',
		name: 'id_canal',
		type: 'number',
		required: true,
		default: 0,
		description: 'ID del canal de la cuenta por el que se inicia la conversación',
		displayOptions: {
			show: {
				resource: ['conversation'],
				operation: ['create'],
			},
		},
		routing: {
			send: { type: 'body', property: 'id_canal' },
		},
	},
	{
		displayName: 'Contact',
		name: 'contacto',
		type: 'json',
		required: true,
		default: '{}',
		description:
			'Identifica al contacto por al menos uno de estos campos: celular, username o numero',
		displayOptions: {
			show: {
				resource: ['conversation'],
				operation: ['create'],
			},
		},
		routing: {
			send: {
				type: 'body',
				property: 'contacto',
				value: '={{ typeof $value === "object" && $value !== null ? $value : JSON.parse($value || "{}") }}',
			},
		},
	},
	{
		displayName: 'User',
		name: 'usuario',
		type: 'json',
		required: true,
		default: '{}',
		description: 'Agente que inicia la conversación. Requiere id_equipo, o ID + nombre. Si se envía id_equipo sin ID, la conversación queda sin agente asignado (solo equipo).',
		displayOptions: {
			show: {
				resource: ['conversation'],
				operation: ['create'],
			},
		},
		routing: {
			send: {
				type: 'body',
				property: 'usuario',
				value: '={{ typeof $value === "object" && $value !== null ? $value : JSON.parse($value || "{}") }}',
			},
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
				resource: ['conversation'],
				operation: ['create'],
			},
		},
		options: [
			{
				displayName: 'Template',
				name: 'template',
				type: 'json',
				default: '{}',
				description: 'Plantilla a enviar (WABA), en vez de texto',
				routing: {
					send: {
						type: 'body',
						property: 'template',
						value: '={{ typeof $value === "object" && $value !== null ? $value : JSON.parse($value || "{}") }}',
					},
				},
			},
			{
				displayName: 'Text',
				name: 'texto',
				type: 'string',
				typeOptions: { rows: 3 },
				default: '',
				description: 'Mensaje inicial (opcional)',
				routing: { send: { type: 'body', property: 'texto' } },
			},
		],
	},
];
