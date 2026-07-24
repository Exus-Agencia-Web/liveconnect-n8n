import type { INodeProperties } from 'n8n-workflow';

import { handleLcResponse } from '../GenericFunctions';

export const quickReplyOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
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
				name: 'Create',
				value: 'create',
				action: 'Create a quick reply',
				description:
					'Crea un atajo de respuesta rápida en la cuenta autenticada. Rechaza el alta si ya existe un atajo con el mismo nombre dentro del mismo grupo.',
				routing: {
					request: { method: 'POST', url: '/quickAnswers/addQuickReply' },
					output: { postReceive: [handleLcResponse] },
				},
			},
			{
				name: 'Update',
				value: 'update',
				action: 'Update a quick reply',
				description:
					'Actualiza una respuesta rápida existente de la cuenta autenticada. Rechaza el cambio si el nuevo par grupo/atajo ya está en uso por otra respuesta rápida.',
				routing: {
					request: { method: 'POST', url: '/quickAnswers/edtQuickReply' },
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
		displayName: 'Group',
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
		displayName: 'Shortcut',
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
		displayName: 'Response',
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
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				resource: ['quickReply'],
				operation: ['create'],
			},
		},
		options: [
			{
				displayName: 'File ID',
				name: 'file',
				type: 'number',
				default: 0,
				description: 'ID del archivo adjunto (lc_storage)',
				routing: { send: { type: 'body', property: 'file' } },
			},
			{
				displayName: 'File URL',
				name: 'fileurl',
				type: 'string',
				default: '',
				description: 'URL del archivo adjunto',
				routing: { send: { type: 'body', property: 'fileurl' } },
			},
			{
				displayName: 'Supervisor ID',
				name: 'idSupervisor',
				type: 'number',
				default: 0,
				description: 'ID del usuario creador (se guarda como id_creador)',
				routing: { send: { type: 'body', property: 'idSupervisor' } },
			},
		],
	},

	// ----------------------------------
	//         quickReply: update
	// ----------------------------------
	{
		displayName: 'Quick Reply ID',
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
		displayName: 'Update Fields',
		name: 'updateFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				resource: ['quickReply'],
				operation: ['update'],
			},
		},
		options: [
			{
				displayName: 'Editor ID',
				name: 'id_usuario',
				type: 'number',
				default: 0,
				description: 'ID del usuario que edita',
				routing: { send: { type: 'body', property: 'id_usuario' } },
			},
			{
				displayName: 'File ID',
				name: 'file',
				type: 'number',
				default: 0,
				description: 'ID del archivo adjunto (lc_storage)',
				routing: { send: { type: 'body', property: 'file' } },
			},
			{
				displayName: 'File URL',
				name: 'fileurl',
				type: 'string',
				default: '',
				description: 'URL del archivo adjunto',
				routing: { send: { type: 'body', property: 'fileurl' } },
			},
			{
				displayName: 'Group',
				name: 'grupo',
				type: 'string',
				default: '',
				description: 'Grupo/carpeta al que pertenece el atajo',
				routing: { send: { type: 'body', property: 'grupo' } },
			},
			{
				displayName: 'Response',
				name: 'respuesta',
				type: 'string',
				typeOptions: { rows: 3 },
				default: '',
				description: 'Texto de la respuesta rápida',
				routing: { send: { type: 'body', property: 'respuesta' } },
			},
			{
				displayName: 'Shortcut',
				name: 'atajo',
				type: 'string',
				default: '',
				description: 'Nombre del atajo (único por grupo dentro de la cuenta)',
				routing: { send: { type: 'body', property: 'atajo' } },
			},
		],
	},
];
