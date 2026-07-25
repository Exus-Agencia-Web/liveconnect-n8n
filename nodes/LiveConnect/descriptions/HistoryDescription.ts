import type { INodeProperties } from 'n8n-workflow';

import { handleLcResponse } from '../GenericFunctions';

export const historyOperations: INodeProperties[] = [
	{
		displayName: 'Operación',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['history'],
			},
		},
		options: [
			{
				name: 'Obtener Anexos',
				value: 'getAttachments',
				action: 'Obtener los anexos de una conversaci n',
				description: 'Lista los anexos (archivos) de una conversación',
				routing: {
					request: { method: 'POST', url: '/history/attachments' },
					output: { postReceive: [handleLcResponse] },
				},
			},
			{
				name: 'Obtener Conversación',
				value: 'getConversation',
				action: 'Obtener una conversaci n',
				description: 'Retorna una conversación junto con sus mensajes, anexos y participantes',
				routing: {
					request: { method: 'POST', url: '/history/conversation' },
					output: { postReceive: [handleLcResponse] },
				},
			},
			{
				name: 'Obtener Mensajes',
				value: 'getMessages',
				action: 'Obtener los mensajes de una conversaci n',
				description: 'Lista los mensajes de una conversación',
				routing: {
					request: { method: 'POST', url: '/history/messages' },
					output: { postReceive: [handleLcResponse] },
				},
			},
			{
				name: 'Obtener Participantes',
				value: 'getParticipants',
				action: 'Obtener los participantes de una conversaci n',
				description: 'Lista los participantes (agentes) de una conversación',
				routing: {
					request: { method: 'POST', url: '/history/participants' },
					output: { postReceive: [handleLcResponse] },
				},
			},
			{
				name: 'Obtener Varias Conversaciones',
				value: 'getManyConversations',
				action: 'Obtener varias conversaciones',
				description: 'Lista las conversaciones históricas de la cuenta, paginadas y con filtros opcionales',
				routing: {
					request: { method: 'POST', url: '/history/conversations' },
					output: { postReceive: [handleLcResponse] },
				},
			},
		],
		default: 'getManyConversations',
	},
];

export const historyFields: INodeProperties[] = [
	// ----------------------------------
	//         history: getAttachments
	// ----------------------------------
	{
		displayName: 'Filtros',
		name: 'filters',
		type: 'collection',
		placeholder: 'Agregar Filtro',
		default: {},
		description: 'Requiere el ID de la conversación o el ID de conversación en Firebase',
		displayOptions: {
			show: {
				resource: ['history'],
				operation: ['getAttachments'],
			},
		},
		options: [
			{
				displayName: 'Desplazamiento',
				name: 'initFrom',
				type: 'number',
				default: 0,
				description: 'Desplazamiento de paginación',
				routing: { send: { type: 'body', property: 'initFrom' } },
			},
			{
				displayName: 'ID de Conversación en Firebase',
				name: 'id_conversacion_fb',
				type: 'string',
				default: '',
				routing: { send: { type: 'body', property: 'id_conversacion_fb' } },
			},
			{
				displayName: 'ID de la Conversación',
				name: 'id_conversacion',
				type: 'number',
				default: 0,
				routing: { send: { type: 'body', property: 'id_conversacion' } },
			},
			{
				displayName: 'ID del Anexo',
				name: 'id',
				type: 'number',
				default: 0,
				description: 'ID del anexo (retorna un único objeto)',
				routing: { send: { type: 'body', property: 'id' } },
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
		],
	},

	// ----------------------------------
	//         history: getConversation
	// ----------------------------------
	{
		displayName: 'Campos de Búsqueda',
		name: 'searchFields',
		type: 'collection',
		placeholder: 'Agregar Campo',
		default: {},
		description: 'Requiere el ID de la conversación o el ID de conversación en Firebase',
		displayOptions: {
			show: {
				resource: ['history'],
				operation: ['getConversation'],
			},
		},
		options: [
			{
				displayName: 'ID de Conversación en Firebase',
				name: 'id_conversacion_fb',
				type: 'string',
				default: '',
				routing: { send: { type: 'body', property: 'id_conversacion_fb' } },
			},
			{
				displayName: 'ID de la Conversación',
				name: 'id',
				type: 'number',
				default: 0,
				routing: { send: { type: 'body', property: 'id' } },
			},
		],
	},

	// ----------------------------------
	//         history: getManyConversations
	// ----------------------------------
	{
		displayName: 'Filtros',
		name: 'filters',
		type: 'collection',
		placeholder: 'Agregar Filtro',
		default: {},
		displayOptions: {
			show: {
				resource: ['history'],
				operation: ['getManyConversations'],
			},
		},
		options: [
			{
				displayName: 'Desplazamiento',
				name: 'initFrom',
				type: 'number',
				default: 0,
				description: 'Desplazamiento de paginación',
				routing: { send: { type: 'body', property: 'initFrom' } },
			},
			{
				displayName: 'ID de Conversación en Firebase',
				name: 'id_conversacion_fb',
				type: 'string',
				default: '',
				description: 'ID de conversación en Firebase (retorna un único objeto)',
				routing: { send: { type: 'body', property: 'id_conversacion_fb' } },
			},
			{
				displayName: 'ID de la Conversación',
				name: 'id',
				type: 'number',
				default: 0,
				description: 'ID de la conversación (retorna un único objeto)',
				routing: { send: { type: 'body', property: 'id' } },
			},
			{
				displayName: 'ID del Canal',
				name: 'id_canal',
				type: 'options',
				typeOptions: { loadOptionsMethod: 'getChannels' },
				default: '',
				description:
					'Filtra por canal. Elige de la lista o especifica un ID con una expresión.',
				routing: { send: { type: 'body', property: 'id_canal' } },
			},
			{
				displayName: 'ID del Contacto',
				name: 'id_contacto',
				type: 'number',
				default: 0,
				description: 'Filtra por contacto',
				routing: { send: { type: 'body', property: 'id_contacto' } },
			},
			{
				displayName: 'ID del Grupo',
				name: 'id_grupo',
				type: 'options',
				typeOptions: { loadOptionsMethod: 'getGroups' },
				default: '',
				description:
					'Filtra por equipo/grupo. Elige de la lista o especifica un ID con una expresión.',
				routing: { send: { type: 'body', property: 'id_grupo' } },
			},
			{
				displayName: 'ID del Usuario',
				name: 'id_usuario',
				type: 'options',
				typeOptions: { loadOptionsMethod: 'getUsers' },
				default: '',
				description:
					'Filtra por agente asignado. Elige de la lista o especifica un ID con una expresión.',
				routing: { send: { type: 'body', property: 'id_usuario' } },
			},
			{
				displayName: 'IDs de Etiquetas',
				name: 'etiquetas',
				type: 'string',
				default: '',
				placeholder: '1,2,3',
				description: 'Filtra por IDs de etiquetas asociadas, separados por comas',
				routing: {
					send: {
						type: 'body',
						property: 'etiquetas',
						value:
							'={{ $value.toString().split(",").map((v) => v.trim()).filter((v) => v !== "").map((v) => Number(v)).filter((v) => !isNaN(v)) }}',
					},
				},
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
		],
	},

	// ----------------------------------
	//         history: getMessages
	// ----------------------------------
	{
		displayName: 'Filtros',
		name: 'filters',
		type: 'collection',
		placeholder: 'Agregar Filtro',
		default: {},
		description: 'Requiere el ID de la conversación o el ID de conversación en Firebase',
		displayOptions: {
			show: {
				resource: ['history'],
				operation: ['getMessages'],
			},
		},
		options: [
			{
				displayName: 'Desplazamiento',
				name: 'initFrom',
				type: 'number',
				default: 0,
				description: 'Desplazamiento de paginación',
				routing: { send: { type: 'body', property: 'initFrom' } },
			},
			{
				displayName: 'ID de Conversación en Firebase',
				name: 'id_conversacion_fb',
				type: 'string',
				default: '',
				routing: { send: { type: 'body', property: 'id_conversacion_fb' } },
			},
			{
				displayName: 'ID de la Conversación',
				name: 'id_conversacion',
				type: 'number',
				default: 0,
				routing: { send: { type: 'body', property: 'id_conversacion' } },
			},
			{
				displayName: 'ID del Mensaje',
				name: 'id',
				type: 'number',
				default: 0,
				description: 'ID del mensaje (retorna un único objeto)',
				routing: { send: { type: 'body', property: 'id' } },
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
		],
	},

	// ----------------------------------
	//         history: getParticipants
	// ----------------------------------
	{
		displayName: 'Filtros',
		name: 'filters',
		type: 'collection',
		placeholder: 'Agregar Filtro',
		default: {},
		description: 'Requiere el ID de la conversación o el ID de conversación en Firebase',
		displayOptions: {
			show: {
				resource: ['history'],
				operation: ['getParticipants'],
			},
		},
		options: [
			{
				displayName: 'Desplazamiento',
				name: 'initFrom',
				type: 'number',
				default: 0,
				description: 'Desplazamiento de paginación',
				routing: { send: { type: 'body', property: 'initFrom' } },
			},
			{
				displayName: 'ID de Conversación en Firebase',
				name: 'id_conversacion_fb',
				type: 'string',
				default: '',
				routing: { send: { type: 'body', property: 'id_conversacion_fb' } },
			},
			{
				displayName: 'ID de la Conversación',
				name: 'id_conversacion',
				type: 'number',
				default: 0,
				routing: { send: { type: 'body', property: 'id_conversacion' } },
			},
			{
				displayName: 'ID del Participante',
				name: 'id',
				type: 'number',
				default: 0,
				description: 'ID del participante (retorna un único objeto)',
				routing: { send: { type: 'body', property: 'id' } },
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
		],
	},
];
