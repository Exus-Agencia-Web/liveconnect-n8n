import type { INodeProperties } from 'n8n-workflow';

import { handleLcResponse } from '../GenericFunctions';

export const dealTaskOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
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
				name: 'Create',
				value: 'create',
				action: 'Create a task',
				description:
					'Crea una nota-tarea y la vincula al deal. Si no se envía Contact ID se toma del deal; si no se envía Assigned User ID se asigna al responsable del deal.',
				routing: {
					request: { method: 'POST', url: '/crm/addTask' },
					output: { postReceive: [handleLcResponse] },
				},
			},
			{
				name: 'Delete',
				value: 'delete',
				action: 'Delete a task',
				description:
					'Elimina el vínculo con el deal y la nota asociada. Solo el asignado o el creador de la tarea pueden eliminarla.',
				routing: {
					request: { method: 'POST', url: '/crm/deleteTask' },
					output: { postReceive: [handleLcResponse] },
				},
			},
			{
				name: 'Update',
				value: 'update',
				action: 'Update a task',
				description:
					'Edita el texto y/o la fecha de una tarea. Permite reasignar según el alcance de permisos de quien edita.',
				routing: {
					request: { method: 'POST', url: '/crm/editTask' },
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
		displayName: 'Deal ID',
		name: 'id_deal',
		type: 'number',
		required: true,
		default: 0,
		description: 'Consecutivo del deal al que se vincula la tarea',
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
		displayName: 'Note',
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
		displayName: 'Date',
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
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				resource: ['dealTask'],
				operation: ['create'],
			},
		},
		options: [
			{
				displayName: 'Assigned User ID',
				name: 'id_usuario',
				type: 'number',
				default: 0,
				description: 'Usuario asignado; por defecto el responsable del deal',
				routing: { send: { type: 'body', property: 'id_usuario' } },
			},
			{
				displayName: 'Contact ID',
				name: 'id_contacto',
				type: 'number',
				default: 0,
				description: 'Contacto de la tarea; por defecto el contacto del deal',
				routing: { send: { type: 'body', property: 'id_contacto' } },
			},
			{
				displayName: 'Internal Deal ID',
				name: 'id_interno',
				type: 'number',
				default: 0,
				description: 'ID interno del deal (alternativa a Deal ID/consecutivo)',
				routing: { send: { type: 'body', property: 'id_interno' } },
			},
		],
	},

	// ----------------------------------
	//         dealTask: delete
	// ----------------------------------
	{
		displayName: 'Task ID',
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
		displayName: 'Task ID',
		name: 'id',
		type: 'number',
		required: true,
		default: 0,
		description: 'ID de la tarea (no el consecutivo del deal)',
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
		displayName: 'Update Fields',
		name: 'updateFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				resource: ['dealTask'],
				operation: ['update'],
			},
		},
		options: [
			{
				displayName: 'Assigned User ID',
				name: 'id_usuario',
				type: 'number',
				default: 0,
				description: 'Reasigna la tarea a este usuario (alias: id_asignado)',
				routing: { send: { type: 'body', property: 'id_usuario' } },
			},
			{
				displayName: 'Assignee ID',
				name: 'id_asignado',
				type: 'number',
				default: 0,
				description: 'Alias de Assigned User ID para reasignar la tarea',
				routing: { send: { type: 'body', property: 'id_asignado' } },
			},
			{
				displayName: 'Date',
				name: 'fecha',
				type: 'string',
				default: '',
				placeholder: 'YYYY-MM-DD HH:mm:ss',
				description: 'Fecha y hora de la tarea',
				routing: { send: { type: 'body', property: 'fecha' } },
			},
			{
				displayName: 'Note',
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
