import type { INodeProperties } from 'n8n-workflow';

import { handleLcResponse } from '../GenericFunctions';

export const userOperations: INodeProperties[] = [
	{
		displayName: 'Operación',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['user'],
			},
		},
		options: [
			{
				name: 'Cambiar Estado',
				value: 'setState',
				action: 'Cambiar el estado de un usuario',
				description: 'Actualiza en tiempo real el estado de disponibilidad de un agente de la cuenta',
				routing: {
					request: { method: 'POST', url: '/users/setState' },
					output: { postReceive: [handleLcResponse] },
				},
			},
			{
				name: 'Obtener',
				value: 'get',
				action: 'Obtener un usuario',
				description: 'Obtiene un usuario de la cuenta por ID interno o por ID en PageGear',
				routing: {
					request: { method: 'POST', url: '/users/get' },
					output: { postReceive: [handleLcResponse] },
				},
			},
			{
				name: 'Obtener Varios',
				value: 'getMany',
				action: 'Obtener varios usuarios',
				description: 'Lista los usuarios de la cuenta, paginados y con filtros opcionales',
				routing: {
					request: { method: 'GET', url: '/users/list' },
					output: { postReceive: [handleLcResponse] },
				},
			},
		],
		default: 'getMany',
	},
];

export const userFields: INodeProperties[] = [
	// ----------------------------------
	//         user: get
	// ----------------------------------
	{
		displayName: 'Campos de Búsqueda',
		name: 'searchFields',
		type: 'collection',
		placeholder: 'Agregar Campo',
		default: {},
		description: 'Identifica al usuario por su ID interno o por su ID en PageGear',
		displayOptions: {
			show: {
				resource: ['user'],
				operation: ['get'],
			},
		},
		options: [
			{
				displayName: 'ID del Usuario',
				name: 'id',
				type: 'string',
				default: '',
				description: 'ID interno del usuario (tabla lc_usuarios)',
				routing: { send: { type: 'body', property: 'id' } },
			},
			{
				displayName: 'ID del Usuario en PageGear',
				name: 'id_en_pge',
				type: 'string',
				default: '',
				routing: { send: { type: 'body', property: 'id_en_pge' } },
			},
		],
	},

	// ----------------------------------
	//         user: getMany
	// ----------------------------------
	{
		displayName: 'Filtros',
		name: 'filters',
		type: 'collection',
		placeholder: 'Agregar Filtro',
		default: {},
		displayOptions: {
			show: {
				resource: ['user'],
				operation: ['getMany'],
			},
		},
		options: [
			{
				displayName: 'Búsqueda',
				name: 'palabras',
				type: 'string',
				default: '',
				description: 'Búsqueda por nombre, celular o email (palabras separadas por espacio o coma)',
				routing: { send: { type: 'query', property: 'palabras' } },
			},
			{
				displayName: 'Creado Desde',
				name: 'desde',
				type: 'string',
				default: '',
				placeholder: 'YYYY-MM-DD',
				description: 'Fecha de alta, desde (filtra fecha_add)',
				routing: { send: { type: 'query', property: 'desde' } },
			},
			{
				displayName: 'Creado Hasta',
				name: 'hasta',
				type: 'string',
				default: '',
				placeholder: 'YYYY-MM-DD',
				description: 'Fecha de alta, hasta (filtra fecha_add)',
				routing: { send: { type: 'query', property: 'hasta' } },
			},
			{
				displayName: 'Desplazamiento',
				name: 'initFrom',
				type: 'number',
				default: 0,
				description: 'Offset de paginación',
				routing: { send: { type: 'query', property: 'initFrom' } },
			},
			{
				displayName: 'Estado',
				name: 'estado',
				type: 'string',
				default: '',
				description: 'Filtra por estado del usuario',
				routing: { send: { type: 'query', property: 'estado' } },
			},
			{
				displayName: 'Límite',
				name: 'limit',
				type: 'number',
				typeOptions: { minValue: 1 },
				default: 50,
				description: 'Cantidad máxima de resultados a devolver',
				routing: { send: { type: 'query', property: 'limit' } },
			},
			{
				displayName: 'Tipo',
				name: 'tipo',
				type: 'number',
				default: 0,
				description: 'Filtra por tipo de usuario',
				routing: { send: { type: 'query', property: 'tipo' } },
			},
		],
	},

	// ----------------------------------
	//         user: setState
	// ----------------------------------
	{
		displayName: 'ID del Usuario',
		name: 'id',
		type: 'string',
		required: true,
		default: '',
		description: 'ID del usuario/agente (tabla lc_usuarios)',
		displayOptions: {
			show: {
				resource: ['user'],
				operation: ['setState'],
			},
		},
		routing: {
			send: { type: 'body', property: 'id' },
		},
	},
	{
		displayName: 'Estado',
		name: 'state',
		type: 'options',
		required: true,
		options: [
			{ name: 'Ausente', value: 'absent' },
			{ name: 'Automático', value: 'automatic' },
			{ name: 'Conectado', value: 'connected' },
			{ name: 'Desconectado', value: 'disconnected' },
			{ name: 'Desconectado (Heredado)', value: 'desconnected' },
			{ name: 'No Molestar', value: 'not_disturb' },
		],
		default: 'connected',
		description: 'Estado deseado del agente',
		displayOptions: {
			show: {
				resource: ['user'],
				operation: ['setState'],
			},
		},
		routing: {
			send: { type: 'body', property: 'state' },
		},
	},
];
