import type { INodeProperties } from 'n8n-workflow';

import { handleLcResponse } from '../GenericFunctions';

export const contactOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
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
				name: 'Create',
				value: 'create',
				action: 'Create a contact',
				description:
					'Crea un contacto en la cuenta. Rechaza el alta si ya existe un contacto activo con el mismo celular.',
				routing: {
					request: { method: 'POST', url: '/contacts/add' },
					output: { postReceive: [handleLcResponse] },
				},
			},
			{
				name: 'Get',
				value: 'get',
				action: 'Get a contact',
				description: 'Busca un único contacto por ID o por identificador de canal',
				routing: {
					request: { method: 'POST', url: '/contacts/get' },
					output: { postReceive: [handleLcResponse] },
				},
			},
			{
				name: 'Get Many',
				value: 'getMany',
				action: 'Get many contacts',
				description: 'Lista los contactos de la cuenta, paginados y con filtros opcionales',
				routing: {
					request: { method: 'GET', url: '/contacts/list' },
					output: { postReceive: [handleLcResponse] },
				},
			},
			{
				name: 'Remove Tags',
				value: 'removeTags',
				action: 'Remove tags from a contact',
				description: 'Elimina las etiquetas indicadas del contacto',
				routing: {
					request: { method: 'POST', url: '/contacts/delEtiquetas' },
					output: { postReceive: [handleLcResponse] },
				},
			},
			{
				name: 'Update',
				value: 'update',
				action: 'Update a contact',
				description: 'Actualiza solo los campos presentes (patch parcial)',
				routing: {
					request: { method: 'POST', url: '/contacts/edt' },
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
		displayName: 'Name',
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
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				resource: ['contact'],
				operation: ['create'],
			},
		},
		options: [
			{
				displayName: 'Address',
				name: 'direccion',
				type: 'string',
				default: '',
				description: 'Dirección del contacto',
				routing: { send: { type: 'body', property: 'direccion' } },
			},
			{
				displayName: 'Alternate Email',
				name: 'correo',
				type: 'string',
				default: '',
				description: 'Email alternativo',
				routing: { send: { type: 'body', property: 'correo' } },
			},
			{
				displayName: 'Cell Phone',
				name: 'celular',
				type: 'string',
				default: '',
				description: 'Celular del contacto',
				routing: { send: { type: 'body', property: 'celular' } },
			},
			{
				displayName: 'Channel ID',
				name: 'id_en_canal',
				type: 'string',
				default: '',
				description: 'Identificador del contacto en el canal',
				routing: { send: { type: 'body', property: 'id_en_canal' } },
			},
			{
				displayName: 'City',
				name: 'ciudad',
				type: 'string',
				default: '',
				description: 'Ciudad del contacto',
				routing: { send: { type: 'body', property: 'ciudad' } },
			},
			{
				displayName: 'Country',
				name: 'pais',
				type: 'string',
				default: '',
				description: 'País del contacto',
				routing: { send: { type: 'body', property: 'pais' } },
			},
			{
				displayName: 'CRM Company ID',
				name: 'crm_tercero',
				type: 'number',
				default: 0,
				description: 'ID del tercero enlazado en el CRM',
				routing: { send: { type: 'body', property: 'crm_tercero' } },
			},
			{
				displayName: 'CRM Contact ID',
				name: 'crm_contacto',
				type: 'number',
				default: 0,
				description: 'ID del contacto enlazado en el CRM',
				routing: { send: { type: 'body', property: 'crm_contacto' } },
			},
			{
				displayName: 'Dynamic Fields',
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
				displayName: 'Email',
				name: 'email',
				type: 'string',
				placeholder: 'name@email.com',
				default: '',
				description: 'Email del contacto',
				routing: { send: { type: 'body', property: 'email' } },
			},
			{
				displayName: 'Last Name',
				name: 'apellidos',
				type: 'string',
				default: '',
				description: 'Apellidos del contacto',
				routing: { send: { type: 'body', property: 'apellidos' } },
			},
		],
	},

	// ----------------------------------
	//         contact: get
	// ----------------------------------
	{
		displayName: 'Search Fields',
		name: 'searchFields',
		type: 'collection',
		placeholder: 'Add Field',
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
				displayName: 'Cell Phone',
				name: 'celular',
				type: 'string',
				default: '',
				description: 'Celular del contacto',
				routing: { send: { type: 'body', property: 'celular' } },
			},
			{
				displayName: 'Channel ID',
				name: 'id_en_canal',
				type: 'string',
				default: '',
				description: 'Identificador del contacto en el canal',
				routing: { send: { type: 'body', property: 'id_en_canal' } },
			},
			{
				displayName: 'Contact ID',
				name: 'id',
				type: 'number',
				default: 0,
				description: 'ID del contacto',
				routing: { send: { type: 'body', property: 'id' } },
			},
			{
				displayName: 'Email',
				name: 'email',
				type: 'string',
				placeholder: 'name@email.com',
				default: '',
				description: 'Email del contacto',
				routing: { send: { type: 'body', property: 'email' } },
			},
			{
				displayName: 'Facebook ID',
				name: 'id_facebook',
				type: 'string',
				default: '',
				description: 'Identificador de Facebook',
				routing: { send: { type: 'body', property: 'id_facebook' } },
			},
			{
				displayName: 'Instagram ID',
				name: 'id_instagram',
				type: 'string',
				default: '',
				description: 'Identificador de Instagram',
				routing: { send: { type: 'body', property: 'id_instagram' } },
			},
			{
				displayName: 'Telegram ID',
				name: 'id_telegram',
				type: 'string',
				default: '',
				description: 'Identificador de Telegram',
				routing: { send: { type: 'body', property: 'id_telegram' } },
			},
			{
				displayName: 'WhatsApp Business ID',
				name: 'id_wabags',
				type: 'string',
				default: '',
				description: 'Identificador de WhatsApp Business (WABA)',
				routing: { send: { type: 'body', property: 'id_wabags' } },
			},
			{
				displayName: 'WhatsApp ID',
				name: 'id_wapi',
				type: 'string',
				default: '',
				description: 'Identificador de WhatsApp QR',
				routing: { send: { type: 'body', property: 'id_wapi' } },
			},
		],
	},

	// ----------------------------------
	//         contact: getMany
	// ----------------------------------
	{
		displayName: 'Filters',
		name: 'filters',
		type: 'collection',
		placeholder: 'Add Filter',
		default: {},
		displayOptions: {
			show: {
				resource: ['contact'],
				operation: ['getMany'],
			},
		},
		options: [
			{
				displayName: 'Archived',
				name: 'archivado',
				type: 'options',
				options: [
					{ name: 'No', value: 0 },
					{ name: 'Yes', value: 1 },
				],
				default: 0,
				description: 'Filtra por contactos archivados',
				routing: { send: { type: 'query', property: 'archivado' } },
			},
			{
				displayName: 'Contact ID',
				name: 'id',
				type: 'number',
				default: 0,
				description: 'Filtra por ID de contacto',
				routing: { send: { type: 'query', property: 'id' } },
			},
			{
				displayName: 'Created From',
				name: 'desde',
				type: 'string',
				default: '',
				placeholder: 'YYYY-MM-DD',
				description: 'Fecha de alta, desde (fecha_add)',
				routing: { send: { type: 'query', property: 'desde' } },
			},
			{
				displayName: 'Created To',
				name: 'hasta',
				type: 'string',
				default: '',
				placeholder: 'YYYY-MM-DD',
				description: 'Fecha de alta, hasta (fecha_add)',
				routing: { send: { type: 'query', property: 'hasta' } },
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
				displayName: 'Limit',
				name: 'limit',
				type: 'number',
				typeOptions: { minValue: 1 },
				default: 50,
				description: 'Max number of results to return',
				routing: { send: { type: 'query', property: 'limit' } },
			},
			{
				displayName: 'Offset',
				name: 'initFrom',
				type: 'number',
				default: 0,
				description: 'Offset de paginación',
				routing: { send: { type: 'query', property: 'initFrom' } },
			},
			{
				displayName: 'Public',
				name: 'publico',
				type: 'options',
				options: [
					{ name: 'No', value: 0 },
					{ name: 'Yes', value: 1 },
				],
				default: 1,
				description: 'Filtra por contactos públicos',
				routing: { send: { type: 'query', property: 'publico' } },
			},
			{
				displayName: 'Search',
				name: 'q',
				type: 'string',
				default: '',
				description: 'Búsqueda libre en nombre, apellidos, email o celular',
				routing: { send: { type: 'query', property: 'q' } },
			},
		],
	},

	// ----------------------------------
	//         contact: removeTags
	// ----------------------------------
	{
		displayName: 'Contact ID',
		name: 'id_contacto',
		type: 'number',
		required: true,
		default: 0,
		description: 'ID del contacto',
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
		displayName: 'Tag IDs',
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
		displayName: 'Contact ID',
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
		displayName: 'Update Fields',
		name: 'updateFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				resource: ['contact'],
				operation: ['update'],
			},
		},
		options: [
			{
				displayName: 'Address',
				name: 'direccion',
				type: 'string',
				default: '',
				description: 'Dirección del contacto',
				routing: { send: { type: 'body', property: 'direccion' } },
			},
			{
				displayName: 'Birthday',
				name: 'fechacumple',
				type: 'string',
				default: '',
				placeholder: 'YYYY-MM-DD',
				description: 'Fecha de cumpleaños',
				routing: { send: { type: 'body', property: 'fechacumple' } },
			},
			{
				displayName: 'Cell Phone',
				name: 'celular',
				type: 'string',
				default: '',
				description:
					'Celular. Rechaza el cambio si ya existe otro contacto activo con ese número.',
				routing: { send: { type: 'body', property: 'celular' } },
			},
			{
				displayName: 'City',
				name: 'ciudad',
				type: 'string',
				default: '',
				description: 'Ciudad del contacto',
				routing: { send: { type: 'body', property: 'ciudad' } },
			},
			{
				displayName: 'Conversation ID',
				name: 'id_chat',
				type: 'number',
				default: 0,
				description:
					'Si se envía, propaga el contacto editado a la conversación (Firebase + integraciones)',
				routing: { send: { type: 'body', property: 'id_chat' } },
			},
			{
				displayName: 'Country',
				name: 'pais',
				type: 'string',
				default: '',
				description: 'País del contacto',
				routing: { send: { type: 'body', property: 'pais' } },
			},
			{
				displayName: 'Default Target',
				name: 'default_target',
				type: 'string',
				default: '',
				description: 'Target por defecto del contacto',
				routing: { send: { type: 'body', property: 'default_target' } },
			},
			{
				displayName: 'Default Target ID',
				name: 'default_target_id',
				type: 'string',
				default: '',
				description: 'ID del target por defecto',
				routing: { send: { type: 'body', property: 'default_target_id' } },
			},
			{
				displayName: 'Document Number',
				name: 'num_documento',
				type: 'string',
				default: '',
				description: 'Número de documento (solo dígitos)',
				routing: { send: { type: 'body', property: 'num_documento' } },
			},
			{
				displayName: 'Dynamic Fields',
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
				displayName: 'Email',
				name: 'email',
				type: 'string',
				placeholder: 'name@email.com',
				default: '',
				description: 'Email del contacto',
				routing: { send: { type: 'body', property: 'email' } },
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
				displayName: 'Gender',
				name: 'genero',
				type: 'string',
				default: '',
				description: 'Género del contacto',
				routing: { send: { type: 'body', property: 'genero' } },
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
				displayName: 'Last Name',
				name: 'apellidos',
				type: 'string',
				default: '',
				description: 'Apellidos del contacto',
				routing: { send: { type: 'body', property: 'apellidos' } },
			},
			{
				displayName: 'Name',
				name: 'nombre',
				type: 'string',
				default: '',
				description: 'Nombre del contacto',
				routing: { send: { type: 'body', property: 'nombre' } },
			},
			{
				displayName: 'Sync Tags',
				name: 'deleteTags',
				type: 'boolean',
				default: false,
				description:
					'Whether to sync the full tag set (add and remove according to Tag IDs) instead of only adding',
				routing: { send: { type: 'body', property: 'deleteTags' } },
			},
			{
				displayName: 'Tag IDs',
				name: 'etiquetas',
				type: 'string',
				default: '',
				placeholder: '1,2,3',
				description: 'IDs de etiquetas a agregar (o a sincronizar si Sync Tags está activo)',
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
				displayName: 'Third Party ID',
				name: 'id_tercero',
				type: 'number',
				default: 0,
				description: 'ID del tercero enlazado',
				routing: { send: { type: 'body', property: 'id_tercero' } },
			},
		],
	},
];
