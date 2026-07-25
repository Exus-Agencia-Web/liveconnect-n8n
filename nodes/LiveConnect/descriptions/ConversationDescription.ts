import type { INodeProperties } from 'n8n-workflow';

import { handleLcResponse } from '../GenericFunctions';

export const conversationOperations: INodeProperties[] = [
	{
		displayName: 'Operación',
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
				name: 'Crear',
				value: 'create',
				action: 'Crear una conversaci n',
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
		displayName: 'ID del Canal',
		name: 'id_canal',
		type: 'options',
		typeOptions: { loadOptionsMethod: 'getChannels' },
		required: true,
		default: '',
		description:
			'ID del canal de la cuenta por el que se inicia la conversación. Elige de la lista o especifica un ID con una expresión.',
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
		displayName: 'Contacto',
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
		displayName: 'Usuario',
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
		displayName: 'Campos Adicionales',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Agregar Campo',
		default: {},
		displayOptions: {
			show: {
				resource: ['conversation'],
				operation: ['create'],
			},
		},
		options: [
			{
				displayName: 'Plantilla',
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
				displayName: 'Texto',
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
