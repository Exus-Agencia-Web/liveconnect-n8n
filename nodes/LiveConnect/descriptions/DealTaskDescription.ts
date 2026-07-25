import type { INodeProperties } from 'n8n-workflow';

import { handleLcResponse } from '../GenericFunctions';

export const dealTaskOperations: INodeProperties[] = [
	{
		displayName: 'Operación',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['dealTask'],
			},
		},
		options: [
			{
				name: 'Actualizar',
				value: 'update',
				action: 'Actualizar una tarea',
				description:
					'Edita el texto y/o la fecha de una tarea. Permite reasignar según el alcance de permisos de quien edita.',
				routing: {
					request: { method: 'POST', url: '/crm/editTask' },
					output: { postReceive: [handleLcResponse] },
				},
			},
			{
				name: 'Crear',
				value: 'create',
				action: 'Crear una tarea',
				description:
					'Crea una nota-tarea y la vincula a la negociación. Si no se envía el ID del Contacto se toma de la negociación; si no se envía el ID del Usuario Asignado se asigna al responsable de la negociación.',
				routing: {
					request: { method: 'POST', url: '/crm/addTask' },
					output: { postReceive: [handleLcResponse] },
				},
			},
			{
				name: 'Eliminar',
				value: 'delete',
				action: 'Eliminar una tarea',
				description:
					'Elimina el vínculo con la negociación y la nota asociada. Solo el asignado o el creador de la tarea pueden eliminarla.',
				routing: {
					request: { method: 'POST', url: '/crm/deleteTask' },
					output: { postReceive: [handleLcResponse] },
				},
			},
		],
		default: 'create',
	},
];

export const dealTaskFields: INodeProperties[] = [
	// ----------------------------------
	//         dealTask: create
	// ----------------------------------
	{
		displayName: 'ID de la Negociación',
		name: 'id_deal',
		type: 'number',
		required: true,
		default: 0,
		description: 'Consecutivo de la negociación a la que se vincula la tarea',
		displayOptions: {
			show: {
				resource: ['dealTask'],
				operation: ['create'],
			},
		},
		routing: {
			send: { type: 'body', property: 'id_deal' },
		},
	},
	{
		displayName: 'Nota',
		name: 'nota',
		type: 'string',
		required: true,
		typeOptions: { rows: 3 },
		default: '',
		description: 'Texto de la tarea',
		displayOptions: {
			show: {
				resource: ['dealTask'],
				operation: ['create'],
			},
		},
		routing: {
			send: { type: 'body', property: 'nota' },
		},
	},
	{
		displayName: 'Fecha',
		name: 'fecha',
		type: 'string',
		required: true,
		default: '',
		placeholder: 'YYYY-MM-DD HH:mm:ss',
		description: 'Fecha y hora de la tarea',
		displayOptions: {
			show: {
				resource: ['dealTask'],
				operation: ['create'],
			},
		},
		routing: {
			send: { type: 'body', property: 'fecha' },
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
				resource: ['dealTask'],
				operation: ['create'],
			},
		},
		options: [
			{
				displayName: 'ID del Contacto',
				name: 'id_contacto',
				type: 'number',
				default: 0,
				description: 'Contacto de la tarea; por defecto el contacto de la negociación',
				routing: { send: { type: 'body', property: 'id_contacto' } },
			},
			{
				displayName: 'ID del Usuario Asignado',
				name: 'id_usuario',
				type: 'options',
				typeOptions: { loadOptionsMethod: 'getUsers' },
				default: '',
				description:
					'Usuario asignado; por defecto el responsable de la negociación. Elige de la lista o especifica un ID con una expresión.',
				routing: { send: { type: 'body', property: 'id_usuario' } },
			},
			{
				displayName: 'ID Interno de la Negociación',
				name: 'id_interno',
				type: 'number',
				default: 0,
				description: 'ID interno de la negociación (alternativa al ID de la Negociación/consecutivo)',
				routing: { send: { type: 'body', property: 'id_interno' } },
			},
		],
	},

	// ----------------------------------
	//         dealTask: delete
	// ----------------------------------
	{
		displayName: 'ID de la Tarea',
		name: 'id',
		type: 'number',
		required: true,
		default: 0,
		description: 'ID de la tarea a eliminar',
		displayOptions: {
			show: {
				resource: ['dealTask'],
				operation: ['delete'],
			},
		},
		routing: {
			send: { type: 'body', property: 'id' },
		},
	},

	// ----------------------------------
	//         dealTask: update
	// ----------------------------------
	{
		displayName: 'ID de la Tarea',
		name: 'id',
		type: 'number',
		required: true,
		default: 0,
		description: 'ID de la tarea (no el consecutivo de la negociación)',
		displayOptions: {
			show: {
				resource: ['dealTask'],
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
				resource: ['dealTask'],
				operation: ['update'],
			},
		},
		options: [
			{
				displayName: 'Fecha',
				name: 'fecha',
				type: 'string',
				default: '',
				placeholder: 'YYYY-MM-DD HH:mm:ss',
				description: 'Fecha y hora de la tarea',
				routing: { send: { type: 'body', property: 'fecha' } },
			},
			{
				displayName: 'ID del Asignado',
				name: 'id_asignado',
				type: 'options',
				typeOptions: { loadOptionsMethod: 'getUsers' },
				default: '',
				description:
					'Alias del ID del Usuario Asignado para reasignar la tarea. Elige de la lista o especifica un ID con una expresión.',
				routing: { send: { type: 'body', property: 'id_asignado' } },
			},
			{
				displayName: 'ID del Usuario Asignado',
				name: 'id_usuario',
				type: 'options',
				typeOptions: { loadOptionsMethod: 'getUsers' },
				default: '',
				description:
					'Reasigna la tarea a este usuario (alias: id_asignado). Elige de la lista o especifica un ID con una expresión.',
				routing: { send: { type: 'body', property: 'id_usuario' } },
			},
			{
				displayName: 'Nota',
				name: 'nota',
				type: 'string',
				typeOptions: { rows: 3 },
				default: '',
				description: 'Texto de la tarea',
				routing: { send: { type: 'body', property: 'nota' } },
			},
		],
	},
];
