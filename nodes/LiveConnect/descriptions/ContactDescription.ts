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
				name: 'Update',
				value: 'update',
				action: 'Update a contact',
				description: 'Updates only the fields present (partial patch)',
				routing: {
					request: { method: 'POST', url: '/contacts/edt' },
					output: { postReceive: [handleLcResponse] },
				},
			},
			{
				name: 'Create',
				value: 'create',
				action: 'Create a contact',
				description:
					'Creates a contact in the account. Rejects the creation if an active contact with the same phone number already exists.',
				routing: {
					request: { method: 'POST', url: '/contacts/add' },
					output: { postReceive: [handleLcResponse] },
				},
			},
			{
				name: 'Remove Tags',
				value: 'removeTags',
				action: 'Remove tags from a contact',
				description: 'Removes the specified tags from the contact',
				routing: {
					request: { method: 'POST', url: '/contacts/delEtiquetas' },
					output: { postReceive: [handleLcResponse] },
				},
			},
			{
				name: 'Get',
				value: 'get',
				action: 'Get a contact',
				description: 'Looks up a single contact by ID or by channel identifier',
				routing: {
					request: { method: 'POST', url: '/contacts/get' },
					output: { postReceive: [handleLcResponse] },
				},
			},
			{
				name: 'Get Many',
				value: 'getMany',
				action: 'Get many contacts',
				description: 'Lists the contacts in the account, paginated and with optional filters',
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
		displayName: 'Name',
		name: 'nombre',
		type: 'string',
		required: true,
		default: '',
		description: 'Contact name',
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
				displayName: 'Last Name',
				name: 'apellidos',
				type: 'string',
				default: '',
				description: 'Contact last name',
				routing: { send: { type: 'body', property: 'apellidos' } },
			},
			{
				displayName: 'Dynamic Fields',
				name: 'dinamicos',
				type: 'json',
				default: '{}',
				description: 'Dynamic fields of the contact (key-value object)',
				routing: {
					send: {
						type: 'body',
						property: 'dinamicos',
						value: '={{ typeof $value === "object" && $value !== null ? $value : JSON.parse($value || "{}") }}',
					},
				},
			},
			{
				displayName: 'Phone Number',
				name: 'celular',
				type: 'string',
				default: '',
				description: 'Contact phone number',
				routing: { send: { type: 'body', property: 'celular' } },
			},
			{
				displayName: 'City',
				name: 'ciudad',
				type: 'string',
				default: '',
				description: 'Contact city',
				routing: { send: { type: 'body', property: 'ciudad' } },
			},
			{
				displayName: 'Alternate Email',
				name: 'correo',
				type: 'string',
				default: '',
				description: 'Alternate email address',
				routing: { send: { type: 'body', property: 'correo' } },
			},
			{
				displayName: 'Email',
				name: 'email',
				type: 'string',
				placeholder: 'name@email.com',
				default: '',
				description: 'Contact email address',
				routing: { send: { type: 'body', property: 'email' } },
			},
			{
				displayName: 'Address',
				name: 'direccion',
				type: 'string',
				default: '',
				description: 'Contact address',
				routing: { send: { type: 'body', property: 'direccion' } },
			},
			{
				displayName: 'CRM Contact ID',
				name: 'crm_contacto',
				type: 'number',
				default: 0,
				description: 'ID of the linked contact in the CRM',
				routing: { send: { type: 'body', property: 'crm_contacto' } },
			},
			{
				displayName: 'CRM Company ID',
				name: 'crm_tercero',
				type: 'number',
				default: 0,
				description: 'ID of the linked company in the CRM',
				routing: { send: { type: 'body', property: 'crm_tercero' } },
			},
			{
				displayName: 'Channel ID',
				name: 'id_en_canal',
				type: 'string',
				default: '',
				description: 'Contact identifier in the channel',
				routing: { send: { type: 'body', property: 'id_en_canal' } },
			},
			{
				displayName: 'Country',
				name: 'pais',
				type: 'string',
				default: '',
				description: 'Contact country',
				routing: { send: { type: 'body', property: 'pais' } },
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
			'If an ID is sent, searches by that ID; otherwise, searches by the first channel identifier present',
		displayOptions: {
			show: {
				resource: ['contact'],
				operation: ['get'],
			},
		},
		options: [
			{
				displayName: 'Phone Number',
				name: 'celular',
				type: 'string',
				default: '',
				description: 'Contact phone number',
				routing: { send: { type: 'body', property: 'celular' } },
			},
			{
				displayName: 'Email',
				name: 'email',
				type: 'string',
				placeholder: 'name@email.com',
				default: '',
				description: 'Contact email address',
				routing: { send: { type: 'body', property: 'email' } },
			},
			{
				displayName: 'Facebook ID',
				name: 'id_facebook',
				type: 'string',
				default: '',
				description: 'Facebook identifier',
				routing: { send: { type: 'body', property: 'id_facebook' } },
			},
			{
				displayName: 'Instagram ID',
				name: 'id_instagram',
				type: 'string',
				default: '',
				description: 'Instagram identifier',
				routing: { send: { type: 'body', property: 'id_instagram' } },
			},
			{
				displayName: 'Telegram ID',
				name: 'id_telegram',
				type: 'string',
				default: '',
				description: 'Telegram identifier',
				routing: { send: { type: 'body', property: 'id_telegram' } },
			},
			{
				displayName: 'WhatsApp ID',
				name: 'id_wapi',
				type: 'string',
				default: '',
				description: 'WhatsApp QR identifier',
				routing: { send: { type: 'body', property: 'id_wapi' } },
			},
			{
				displayName: 'WhatsApp Business ID',
				name: 'id_wabags',
				type: 'string',
				default: '',
				description: 'WhatsApp Business identifier (WABA)',
				routing: { send: { type: 'body', property: 'id_wabags' } },
			},
			{
				displayName: 'Channel ID',
				name: 'id_en_canal',
				type: 'string',
				default: '',
				description: 'Contact identifier in the channel',
				routing: { send: { type: 'body', property: 'id_en_canal' } },
			},
			{
				displayName: 'Contact ID',
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
				description: 'Filters by archived contacts',
				routing: { send: { type: 'query', property: 'archivado' } },
			},
			{
				displayName: 'Search',
				name: 'q',
				type: 'string',
				default: '',
				description: 'Free-text search in name, last name, email, or phone number',
				routing: { send: { type: 'query', property: 'q' } },
			},
			{
				displayName: 'Created From',
				name: 'desde',
				type: 'string',
				default: '',
				placeholder: 'YYYY-MM-DD',
				description: 'Creation date, from (fecha_add)',
				routing: { send: { type: 'query', property: 'desde' } },
			},
			{
				displayName: 'Created To',
				name: 'hasta',
				type: 'string',
				default: '',
				placeholder: 'YYYY-MM-DD',
				description: 'Creation date, to (fecha_add)',
				routing: { send: { type: 'query', property: 'hasta' } },
			},
			{
				displayName: 'Offset',
				name: 'initFrom',
				type: 'number',
				default: 0,
				description: 'Pagination offset',
				routing: { send: { type: 'query', property: 'initFrom' } },
			},
			{
				displayName: 'Extra 1',
				name: 'extra1',
				type: 'string',
				default: '',
				description: 'Filters by the free-form field extra1',
				routing: { send: { type: 'query', property: 'extra1' } },
			},
			{
				displayName: 'Extra 2',
				name: 'extra2',
				type: 'string',
				default: '',
				description: 'Filters by the free-form field extra2',
				routing: { send: { type: 'query', property: 'extra2' } },
			},
			{
				displayName: 'Contact ID',
				name: 'id',
				type: 'number',
				default: 0,
				description: 'Filters by contact ID',
				routing: { send: { type: 'query', property: 'id' } },
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
				displayName: 'Public',
				name: 'publico',
				type: 'options',
				options: [
					{ name: 'No', value: 0 },
					{ name: 'Yes', value: 1 },
				],
				default: 1,
				description: 'Filters by public contacts',
				routing: { send: { type: 'query', property: 'publico' } },
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
		description: 'Tag IDs to remove, separated by commas',
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
		description: 'ID of the contact to edit',
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
				displayName: 'Last Name',
				name: 'apellidos',
				type: 'string',
				default: '',
				description: 'Contact last name',
				routing: { send: { type: 'body', property: 'apellidos' } },
			},
			{
				displayName: 'Dynamic Fields',
				name: 'dinamicos',
				type: 'json',
				default: '{}',
				description: 'Dynamic fields to merge with the existing ones',
				routing: {
					send: {
						type: 'body',
						property: 'dinamicos',
						value: '={{ typeof $value === "object" && $value !== null ? $value : JSON.parse($value || "{}") }}',
					},
				},
			},
			{
				displayName: 'Phone Number',
				name: 'celular',
				type: 'string',
				default: '',
				description:
					'Phone number. Rejects the change if another active contact with that number already exists.',
				routing: { send: { type: 'body', property: 'celular' } },
			},
			{
				displayName: 'City',
				name: 'ciudad',
				type: 'string',
				default: '',
				description: 'Contact city',
				routing: { send: { type: 'body', property: 'ciudad' } },
			},
			{
				displayName: 'Email',
				name: 'email',
				type: 'string',
				placeholder: 'name@email.com',
				default: '',
				description: 'Contact email address',
				routing: { send: { type: 'body', property: 'email' } },
			},
			{
				displayName: 'Address',
				name: 'direccion',
				type: 'string',
				default: '',
				description: 'Contact address',
				routing: { send: { type: 'body', property: 'direccion' } },
			},
			{
				displayName: 'Extra 1',
				name: 'extra1',
				type: 'string',
				default: '',
				description: 'Free-form field extra1',
				routing: { send: { type: 'body', property: 'extra1' } },
			},
			{
				displayName: 'Extra 2',
				name: 'extra2',
				type: 'string',
				default: '',
				description: 'Free-form field extra2',
				routing: { send: { type: 'body', property: 'extra2' } },
			},
			{
				displayName: 'Date of Birth',
				name: 'fechacumple',
				type: 'string',
				default: '',
				placeholder: 'YYYY-MM-DD',
				routing: { send: { type: 'body', property: 'fechacumple' } },
			},
			{
				displayName: 'Gender',
				name: 'genero',
				type: 'string',
				default: '',
				description: 'Contact gender',
				routing: { send: { type: 'body', property: 'genero' } },
			},
			{
				displayName: 'Conversation ID',
				name: 'id_chat',
				type: 'number',
				default: 0,
				description:
					'If sent, propagates the edited contact to the conversation (Firebase + integrations)',
				routing: { send: { type: 'body', property: 'id_chat' } },
			},
			{
				displayName: 'Default Target ID',
				name: 'default_target_id',
				type: 'string',
				default: '',
				routing: { send: { type: 'body', property: 'default_target_id' } },
			},
			{
				displayName: 'Company ID',
				name: 'id_tercero',
				type: 'number',
				default: 0,
				description: 'ID of the linked company',
				routing: { send: { type: 'body', property: 'id_tercero' } },
			},
			{
				displayName: 'Hash ID',
				name: 'idh',
				type: 'string',
				default: '',
				description: 'Hash identifier of the contact',
				routing: { send: { type: 'body', property: 'idh' } },
			},
			{
				displayName: 'Tag IDs',
				name: 'etiquetas',
				type: 'string',
				default: '',
				placeholder: '1,2,3',
				description: 'Tag IDs to add (or to sync if Sync Tags is enabled)',
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
				displayName: 'Name',
				name: 'nombre',
				type: 'string',
				default: '',
				description: 'Contact name',
				routing: { send: { type: 'body', property: 'nombre' } },
			},
			{
				displayName: 'Document Number',
				name: 'num_documento',
				type: 'string',
				default: '',
				description: 'Document number (digits only)',
				routing: { send: { type: 'body', property: 'num_documento' } },
			},
			{
				displayName: 'Country',
				name: 'pais',
				type: 'string',
				default: '',
				description: 'Contact country',
				routing: { send: { type: 'body', property: 'pais' } },
			},
			{
				displayName: 'Sync Tags',
				name: 'deleteTags',
				type: 'boolean',
				default: false,
				description:
					'Whether to sync the full set of tags (adds and removes based on Tag IDs) instead of only adding',
				routing: { send: { type: 'body', property: 'deleteTags' } },
			},
			{
				displayName: 'Default Target',
				name: 'default_target',
				type: 'string',
				default: '',
				description: 'Contact default target',
				routing: { send: { type: 'body', property: 'default_target' } },
			},
		],
	},
];
