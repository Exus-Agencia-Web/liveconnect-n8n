import type { INodeProperties } from 'n8n-workflow';

import { handleLcResponse } from '../GenericFunctions';

export const quickReplyOperations: INodeProperties[] = [
	{
		displayName: 'Operación',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['quickReply'],
			},
		},
		options: [
			{
				name: 'Actualizar',
				value: 'update',
				action: 'Actualizar una respuesta r pida',
				description:
					'Actualiza una respuesta rápida existente de la cuenta autenticada. Rechaza el cambio si el nuevo par grupo/atajo ya está en uso por otra respuesta rápida.',
				routing: {
					request: { method: 'POST', url: '/quickAnswers/edtQuickReply' },
					output: { postReceive: [handleLcResponse] },
				},
			},
			{
				name: 'Crear',
				value: 'create',
				action: 'Crear una respuesta r pida',
				description:
					'Crea un atajo de respuesta rápida en la cuenta autenticada. Rechaza el alta si ya existe un atajo con el mismo nombre dentro del mismo grupo.',
				routing: {
					request: { method: 'POST', url: '/quickAnswers/addQuickReply' },
					output: { postReceive: [handleLcResponse] },
				},
			},
		],
		default: 'create',
	},
];

export const quickReplyFields: INodeProperties[] = [
	// ----------------------------------
	//         quickReply: create
	// ----------------------------------
	{
		displayName: 'Grupo',
		name: 'grupo',
		type: 'string',
		required: true,
		default: '',
		description: 'Grupo/carpeta al que pertenece el atajo',
		displayOptions: {
			show: {
				resource: ['quickReply'],
				operation: ['create'],
			},
		},
		routing: {
			send: { type: 'body', property: 'grupo' },
		},
	},
	{
		displayName: 'Atajo',
		name: 'atajo',
		type: 'string',
		required: true,
		default: '',
		description: 'Nombre del atajo (único por grupo dentro de la cuenta)',
		displayOptions: {
			show: {
				resource: ['quickReply'],
				operation: ['create'],
			},
		},
		routing: {
			send: { type: 'body', property: 'atajo' },
		},
	},
	{
		displayName: 'Respuesta',
		name: 'respuesta',
		type: 'string',
		typeOptions: { rows: 3 },
		required: true,
		default: '',
		description: 'Texto de la respuesta rápida',
		displayOptions: {
			show: {
				resource: ['quickReply'],
				operation: ['create'],
			},
		},
		routing: {
			send: { type: 'body', property: 'respuesta' },
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
				resource: ['quickReply'],
				operation: ['create'],
			},
		},
		options: [
			{
				displayName: 'ID del Archivo',
				name: 'file',
				type: 'number',
				default: 0,
				description: 'ID del archivo adjunto (lc_storage)',
				routing: { send: { type: 'body', property: 'file' } },
			},
			{
				displayName: 'ID del Supervisor',
				name: 'idSupervisor',
				type: 'number',
				default: 0,
				description: 'ID del usuario creador (se guarda como id_creador)',
				routing: { send: { type: 'body', property: 'idSupervisor' } },
			},
			{
				displayName: 'URL del Archivo',
				name: 'fileurl',
				type: 'string',
				default: '',
				description: 'URL del archivo adjunto',
				routing: { send: { type: 'body', property: 'fileurl' } },
			},
		],
	},

	// ----------------------------------
	//         quickReply: update
	// ----------------------------------
	{
		displayName: 'ID de la Respuesta Rápida',
		name: 'id',
		type: 'number',
		required: true,
		default: 0,
		description: 'ID de la respuesta rápida a editar',
		displayOptions: {
			show: {
				resource: ['quickReply'],
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
				resource: ['quickReply'],
				operation: ['update'],
			},
		},
		options: [
			{
				displayName: 'Atajo',
				name: 'atajo',
				type: 'string',
				default: '',
				description: 'Nombre del atajo (único por grupo dentro de la cuenta)',
				routing: { send: { type: 'body', property: 'atajo' } },
			},
			{
				displayName: 'Grupo',
				name: 'grupo',
				type: 'string',
				default: '',
				description: 'Grupo/carpeta al que pertenece el atajo',
				routing: { send: { type: 'body', property: 'grupo' } },
			},
			{
				displayName: 'ID del Archivo',
				name: 'file',
				type: 'number',
				default: 0,
				description: 'ID del archivo adjunto (lc_storage)',
				routing: { send: { type: 'body', property: 'file' } },
			},
			{
				displayName: 'ID del Editor',
				name: 'id_usuario',
				type: 'number',
				default: 0,
				description: 'ID del usuario que edita',
				routing: { send: { type: 'body', property: 'id_usuario' } },
			},
			{
				displayName: 'Respuesta',
				name: 'respuesta',
				type: 'string',
				typeOptions: { rows: 3 },
				default: '',
				description: 'Texto de la respuesta rápida',
				routing: { send: { type: 'body', property: 'respuesta' } },
			},
			{
				displayName: 'URL del Archivo',
				name: 'fileurl',
				type: 'string',
				default: '',
				description: 'URL del archivo adjunto',
				routing: { send: { type: 'body', property: 'fileurl' } },
			},
		],
	},
];
