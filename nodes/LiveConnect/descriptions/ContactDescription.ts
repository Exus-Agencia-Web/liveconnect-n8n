import type { INodeProperties } from 'n8n-workflow';

import { handleLcResponse } from '../GenericFunctions';

export const contactOperations: INodeProperties[] = [
	{
		displayName: 'Operación',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['contact'],
			},
		},
		options: [
			{
				name: 'Actualizar',
				value: 'update',
				action: 'Actualizar un contacto',
				description: 'Actualiza solo los campos presentes (patch parcial)',
				routing: {
					request: { method: 'POST', url: '/contacts/edt' },
					output: { postReceive: [handleLcResponse] },
				},
			},
			{
				name: 'Crear',
				value: 'create',
				action: 'Crear un contacto',
				description:
					'Crea un contacto en la cuenta. Rechaza el alta si ya existe un contacto activo con el mismo celular.',
				routing: {
					request: { method: 'POST', url: '/contacts/add' },
					output: { postReceive: [handleLcResponse] },
				},
			},
			{
				name: 'Eliminar Etiquetas',
				value: 'removeTags',
				action: 'Eliminar etiquetas de un contacto',
				description: 'Elimina las etiquetas indicadas del contacto',
				routing: {
					request: { method: 'POST', url: '/contacts/delEtiquetas' },
					output: { postReceive: [handleLcResponse] },
				},
			},
			{
				name: 'Obtener',
				value: 'get',
				action: 'Obtener un contacto',
				description: 'Busca un único contacto por ID o por identificador de canal',
				routing: {
					request: { method: 'POST', url: '/contacts/get' },
					output: { postReceive: [handleLcResponse] },
				},
			},
			{
				name: 'Obtener Varios',
				value: 'getMany',
				action: 'Obtener varios contactos',
				description: 'Lista los contactos de la cuenta, paginados y con filtros opcionales',
				routing: {
					request: { method: 'GET', url: '/contacts/list' },
					output: { postReceive: [handleLcResponse] },
				},
			},
		],
		default: 'getMany',
	},
];

export const contactFields: INodeProperties[] = [
	// ----------------------------------
	//         contact: create
	// ----------------------------------
	{
		displayName: 'Nombre',
		name: 'nombre',
		type: 'string',
		required: true,
		default: '',
		description: 'Nombre del contacto',
		displayOptions: {
			show: {
				resource: ['contact'],
				operation: ['create'],
			},
		},
		routing: {
			send: { type: 'body', property: 'nombre' },
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
				resource: ['contact'],
				operation: ['create'],
			},
		},
		options: [
			{
				displayName: 'Apellidos',
				name: 'apellidos',
				type: 'string',
				default: '',
				description: 'Apellidos del contacto',
				routing: { send: { type: 'body', property: 'apellidos' } },
			},
			{
				displayName: 'Campos Dinámicos',
				name: 'dinamicos',
				type: 'json',
				default: '{}',
				description: 'Campos dinámicos del contacto (objeto clave-valor)',
				routing: {
					send: {
						type: 'body',
						property: 'dinamicos',
						value: '={{ typeof $value === "object" && $value !== null ? $value : JSON.parse($value || "{}") }}',
					},
				},
			},
			{
				displayName: 'Celular',
				name: 'celular',
				type: 'string',
				default: '',
				description: 'Celular del contacto',
				routing: { send: { type: 'body', property: 'celular' } },
			},
			{
				displayName: 'Ciudad',
				name: 'ciudad',
				type: 'string',
				default: '',
				description: 'Ciudad del contacto',
				routing: { send: { type: 'body', property: 'ciudad' } },
			},
			{
				displayName: 'Correo Alternativo',
				name: 'correo',
				type: 'string',
				default: '',
				description: 'Correo electrónico alternativo',
				routing: { send: { type: 'body', property: 'correo' } },
			},
			{
				displayName: 'Correo Electrónico',
				name: 'email',
				type: 'string',
				placeholder: 'name@email.com',
				default: '',
				description: 'Correo electrónico del contacto',
				routing: { send: { type: 'body', property: 'email' } },
			},
			{
				displayName: 'Dirección',
				name: 'direccion',
				type: 'string',
				default: '',
				description: 'Dirección del contacto',
				routing: { send: { type: 'body', property: 'direccion' } },
			},
			{
				displayName: 'ID de Contacto del CRM',
				name: 'crm_contacto',
				type: 'number',
				default: 0,
				description: 'ID del contacto enlazado en el CRM',
				routing: { send: { type: 'body', property: 'crm_contacto' } },
			},
			{
				displayName: 'ID de Empresa del CRM',
				name: 'crm_tercero',
				type: 'number',
				default: 0,
				description: 'ID del tercero enlazado en el CRM',
				routing: { send: { type: 'body', property: 'crm_tercero' } },
			},
			{
				displayName: 'ID del Canal',
				name: 'id_en_canal',
				type: 'string',
				default: '',
				description: 'Identificador del contacto en el canal',
				routing: { send: { type: 'body', property: 'id_en_canal' } },
			},
			{
				displayName: 'País',
				name: 'pais',
				type: 'string',
				default: '',
				description: 'País del contacto',
				routing: { send: { type: 'body', property: 'pais' } },
			},
		],
	},

	// ----------------------------------
	//         contact: get
	// ----------------------------------
	{
		displayName: 'Campos de Búsqueda',
		name: 'searchFields',
		type: 'collection',
		placeholder: 'Agregar Campo',
		default: {},
		description:
			'Si se envía ID busca por ese ID; si no, busca por el primer identificador de canal presente',
		displayOptions: {
			show: {
				resource: ['contact'],
				operation: ['get'],
			},
		},
		options: [
			{
				displayName: 'Celular',
				name: 'celular',
				type: 'string',
				default: '',
				description: 'Celular del contacto',
				routing: { send: { type: 'body', property: 'celular' } },
			},
			{
				displayName: 'Correo Electrónico',
				name: 'email',
				type: 'string',
				placeholder: 'name@email.com',
				default: '',
				description: 'Correo electrónico del contacto',
				routing: { send: { type: 'body', property: 'email' } },
			},
			{
				displayName: 'ID de Facebook',
				name: 'id_facebook',
				type: 'string',
				default: '',
				description: 'Identificador de Facebook',
				routing: { send: { type: 'body', property: 'id_facebook' } },
			},
			{
				displayName: 'ID de Instagram',
				name: 'id_instagram',
				type: 'string',
				default: '',
				description: 'Identificador de Instagram',
				routing: { send: { type: 'body', property: 'id_instagram' } },
			},
			{
				displayName: 'ID de Telegram',
				name: 'id_telegram',
				type: 'string',
				default: '',
				description: 'Identificador de Telegram',
				routing: { send: { type: 'body', property: 'id_telegram' } },
			},
			{
				displayName: 'ID de WhatsApp',
				name: 'id_wapi',
				type: 'string',
				default: '',
				description: 'Identificador de WhatsApp QR',
				routing: { send: { type: 'body', property: 'id_wapi' } },
			},
			{
				displayName: 'ID de WhatsApp Business',
				name: 'id_wabags',
				type: 'string',
				default: '',
				description: 'Identificador de WhatsApp Business (WABA)',
				routing: { send: { type: 'body', property: 'id_wabags' } },
			},
			{
				displayName: 'ID del Canal',
				name: 'id_en_canal',
				type: 'string',
				default: '',
				description: 'Identificador del contacto en el canal',
				routing: { send: { type: 'body', property: 'id_en_canal' } },
			},
			{
				displayName: 'ID del Contacto',
				name: 'id',
				type: 'number',
				default: 0,
				routing: { send: { type: 'body', property: 'id' } },
			},
		],
	},

	// ----------------------------------
	//         contact: getMany
	// ----------------------------------
	{
		displayName: 'Filtros',
		name: 'filters',
		type: 'collection',
		placeholder: 'Agregar Filtro',
		default: {},
		displayOptions: {
			show: {
				resource: ['contact'],
				operation: ['getMany'],
			},
		},
		options: [
			{
				displayName: 'Archivado',
				name: 'archivado',
				type: 'options',
				options: [
					{ name: 'No', value: 0 },
					{ name: 'Sí', value: 1 },
				],
				default: 0,
				description: 'Filtra por contactos archivados',
				routing: { send: { type: 'query', property: 'archivado' } },
			},
			{
				displayName: 'Búsqueda',
				name: 'q',
				type: 'string',
				default: '',
				description: 'Búsqueda libre en nombre, apellidos, correo o celular',
				routing: { send: { type: 'query', property: 'q' } },
			},
			{
				displayName: 'Creado Desde',
				name: 'desde',
				type: 'string',
				default: '',
				placeholder: 'YYYY-MM-DD',
				description: 'Fecha de alta, desde (fecha_add)',
				routing: { send: { type: 'query', property: 'desde' } },
			},
			{
				displayName: 'Creado Hasta',
				name: 'hasta',
				type: 'string',
				default: '',
				placeholder: 'YYYY-MM-DD',
				description: 'Fecha de alta, hasta (fecha_add)',
				routing: { send: { type: 'query', property: 'hasta' } },
			},
			{
				displayName: 'Desplazamiento',
				name: 'initFrom',
				type: 'number',
				default: 0,
				description: 'Desplazamiento de paginación',
				routing: { send: { type: 'query', property: 'initFrom' } },
			},
			{
				displayName: 'Extra 1',
				name: 'extra1',
				type: 'string',
				default: '',
				description: 'Filtra por el campo libre extra1',
				routing: { send: { type: 'query', property: 'extra1' } },
			},
			{
				displayName: 'Extra 2',
				name: 'extra2',
				type: 'string',
				default: '',
				description: 'Filtra por el campo libre extra2',
				routing: { send: { type: 'query', property: 'extra2' } },
			},
			{
				displayName: 'ID del Contacto',
				name: 'id',
				type: 'number',
				default: 0,
				description: 'Filtra por ID de contacto',
				routing: { send: { type: 'query', property: 'id' } },
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
				displayName: 'Público',
				name: 'publico',
				type: 'options',
				options: [
					{ name: 'No', value: 0 },
					{ name: 'Sí', value: 1 },
				],
				default: 1,
				description: 'Filtra por contactos públicos',
				routing: { send: { type: 'query', property: 'publico' } },
			},
		],
	},

	// ----------------------------------
	//         contact: removeTags
	// ----------------------------------
	{
		displayName: 'ID del Contacto',
		name: 'id_contacto',
		type: 'number',
		required: true,
		default: 0,
		displayOptions: {
			show: {
				resource: ['contact'],
				operation: ['removeTags'],
			},
		},
		routing: {
			send: { type: 'body', property: 'id_contacto' },
		},
	},
	{
		displayName: 'IDs de Etiquetas',
		name: 'etiquetas',
		type: 'string',
		required: true,
		default: '',
		placeholder: '1,2,3',
		description: 'IDs de etiquetas a eliminar, separados por comas',
		displayOptions: {
			show: {
				resource: ['contact'],
				operation: ['removeTags'],
			},
		},
		routing: {
			send: {
				type: 'body',
				property: 'etiquetas',
				value:
					'={{ $value.toString().split(",").map((v) => v.trim()).filter((v) => v !== "").map((v) => Number(v)).filter((v) => !isNaN(v)) }}',
			},
		},
	},

	// ----------------------------------
	//         contact: update
	// ----------------------------------
	{
		displayName: 'ID del Contacto',
		name: 'id',
		type: 'number',
		required: true,
		default: 0,
		description: 'ID del contacto a editar',
		displayOptions: {
			show: {
				resource: ['contact'],
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
				resource: ['contact'],
				operation: ['update'],
			},
		},
		options: [
			{
				displayName: 'Apellidos',
				name: 'apellidos',
				type: 'string',
				default: '',
				description: 'Apellidos del contacto',
				routing: { send: { type: 'body', property: 'apellidos' } },
			},
			{
				displayName: 'Campos Dinámicos',
				name: 'dinamicos',
				type: 'json',
				default: '{}',
				description: 'Campos dinámicos a fusionar con los existentes',
				routing: {
					send: {
						type: 'body',
						property: 'dinamicos',
						value: '={{ typeof $value === "object" && $value !== null ? $value : JSON.parse($value || "{}") }}',
					},
				},
			},
			{
				displayName: 'Celular',
				name: 'celular',
				type: 'string',
				default: '',
				description:
					'Celular. Rechaza el cambio si ya existe otro contacto activo con ese número.',
				routing: { send: { type: 'body', property: 'celular' } },
			},
			{
				displayName: 'Ciudad',
				name: 'ciudad',
				type: 'string',
				default: '',
				description: 'Ciudad del contacto',
				routing: { send: { type: 'body', property: 'ciudad' } },
			},
			{
				displayName: 'Correo Electrónico',
				name: 'email',
				type: 'string',
				placeholder: 'name@email.com',
				default: '',
				description: 'Correo electrónico del contacto',
				routing: { send: { type: 'body', property: 'email' } },
			},
			{
				displayName: 'Dirección',
				name: 'direccion',
				type: 'string',
				default: '',
				description: 'Dirección del contacto',
				routing: { send: { type: 'body', property: 'direccion' } },
			},
			{
				displayName: 'Extra 1',
				name: 'extra1',
				type: 'string',
				default: '',
				description: 'Campo libre extra1',
				routing: { send: { type: 'body', property: 'extra1' } },
			},
			{
				displayName: 'Extra 2',
				name: 'extra2',
				type: 'string',
				default: '',
				description: 'Campo libre extra2',
				routing: { send: { type: 'body', property: 'extra2' } },
			},
			{
				displayName: 'Fecha de Cumpleaños',
				name: 'fechacumple',
				type: 'string',
				default: '',
				placeholder: 'YYYY-MM-DD',
				routing: { send: { type: 'body', property: 'fechacumple' } },
			},
			{
				displayName: 'Género',
				name: 'genero',
				type: 'string',
				default: '',
				description: 'Género del contacto',
				routing: { send: { type: 'body', property: 'genero' } },
			},
			{
				displayName: 'ID de la Conversación',
				name: 'id_chat',
				type: 'number',
				default: 0,
				description:
					'Si se envía, propaga el contacto editado a la conversación (Firebase + integraciones)',
				routing: { send: { type: 'body', property: 'id_chat' } },
			},
			{
				displayName: 'ID del Target por Defecto',
				name: 'default_target_id',
				type: 'string',
				default: '',
				routing: { send: { type: 'body', property: 'default_target_id' } },
			},
			{
				displayName: 'ID del Tercero',
				name: 'id_tercero',
				type: 'number',
				default: 0,
				description: 'ID del tercero enlazado',
				routing: { send: { type: 'body', property: 'id_tercero' } },
			},
			{
				displayName: 'IDH',
				name: 'idh',
				type: 'string',
				default: '',
				description: 'Identificador hash del contacto',
				routing: { send: { type: 'body', property: 'idh' } },
			},
			{
				displayName: 'IDs de Etiquetas',
				name: 'etiquetas',
				type: 'string',
				default: '',
				placeholder: '1,2,3',
				description: 'IDs de etiquetas a agregar (o a sincronizar si Sincronizar Etiquetas está activo)',
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
				displayName: 'Nombre',
				name: 'nombre',
				type: 'string',
				default: '',
				description: 'Nombre del contacto',
				routing: { send: { type: 'body', property: 'nombre' } },
			},
			{
				displayName: 'Número de Documento',
				name: 'num_documento',
				type: 'string',
				default: '',
				description: 'Número de documento (solo dígitos)',
				routing: { send: { type: 'body', property: 'num_documento' } },
			},
			{
				displayName: 'País',
				name: 'pais',
				type: 'string',
				default: '',
				description: 'País del contacto',
				routing: { send: { type: 'body', property: 'pais' } },
			},
			{
				displayName: 'Sincronizar Etiquetas',
				name: 'deleteTags',
				type: 'boolean',
				default: false,
				description:
					'Si se activa, sincroniza el conjunto completo de etiquetas (agrega y quita según los IDs de Etiquetas) en lugar de solo agregar',
				routing: { send: { type: 'body', property: 'deleteTags' } },
			},
			{
				displayName: 'Target por Defecto',
				name: 'default_target',
				type: 'string',
				default: '',
				description: 'Target por defecto del contacto',
				routing: { send: { type: 'body', property: 'default_target' } },
			},
		],
	},
];
