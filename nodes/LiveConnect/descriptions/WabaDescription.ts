import type { INodeProperties } from 'n8n-workflow';

import { handleLcResponse, prepareTemplateSend } from '../GenericFunctions';

export const wabaOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['waba'],
			},
		},
		options: [
			{
				name: 'Send Template',
				value: 'sendTemplate',
				action: 'Send a template',
				description:
					'Sends the specified template to the destination number through the selected channel. The header accepts an image, document, or video (video is rejected if it exceeds 16MB or is not mp4/3gp).',
				routing: {
					request: { method: 'POST', url: '/direct/waba/sendTemplate' },
					output: { postReceive: [handleLcResponse] },
				},
			},
			{
				name: 'Send Quick Reply',
				value: 'sendQuickAnswer',
				action: 'Send a quick reply',
				description:
					'Sends a quick reply (text and/or attachment) to the destination number, replacing {key} in the text with the specified variables',
				routing: {
					request: { method: 'POST', url: '/direct/waba/sendwabaQuickAnswer' },
					output: { postReceive: [handleLcResponse] },
				},
			},
			{
				name: 'Get Template',
				value: 'getTemplate',
				action: 'Get a template',
				description:
					'Looks up a template by ID or name. Requires the channel ID and, as the identifier, the template ID in Meta or its alternate name.',
				routing: {
					request: { method: 'POST', url: '/direct/waba/getTemplate' },
					output: { postReceive: [handleLcResponse] },
				},
			},
			{
				name: 'Get Many Templates',
				value: 'getManyTemplates',
				action: 'Get many templates',
				description:
					'Returns the WhatsApp Business API templates configured on the channel, with pagination and optional Meta filters',
				routing: {
					request: { method: 'POST', url: '/direct/waba/getTemplates' },
					output: { postReceive: [handleLcResponse] },
				},
			},
		],
		default: 'sendTemplate',
	},
];

export const wabaFields: INodeProperties[] = [
	// ----------------------------------
	//         waba: getManyTemplates
	// ----------------------------------
	{
		displayName: 'Channel Name or ID',
		name: 'id_canal',
		type: 'options',
		typeOptions: { loadOptionsMethod: 'getWabaChannels' },
		required: true,
		default: '',
		description: 'ID of the WABA channel for the account. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
		displayOptions: {
			show: {
				resource: ['waba'],
				operation: ['getManyTemplates'],
			},
		},
		routing: {
			send: { type: 'body', property: 'id_canal' },
		},
	},
	{
		displayName: 'Filters',
		name: 'filters',
		type: 'collection',
		placeholder: 'Add Filter',
		default: {},
		displayOptions: {
			show: {
				resource: ['waba'],
				operation: ['getManyTemplates'],
			},
		},
		options: [
			{
				displayName: 'Approved Only',
				name: 'approved',
				type: 'boolean',
				default: false,
				description: 'Whether to return only templates with APPROVED status',
				routing: { send: { type: 'body', property: 'approved' } },
			},
			{
				displayName: 'Category',
				name: 'category',
				type: 'options',
				options: [
					{ name: 'Authentication', value: 'AUTHENTICATION' },
					{ name: 'Marketing', value: 'MARKETING' },
					{ name: 'Utility', value: 'UTILITY' },
				],
				default: 'MARKETING',
				description: 'Filter by Meta category',
				routing: { send: { type: 'body', property: 'category' } },
			},
			{
				displayName: 'Limit',
				name: 'limit',
				type: 'number',
				typeOptions: { minValue: 1 },
				default: 50,
				description: 'Max number of results to return',
				routing: { send: { type: 'body', property: 'limit' } },
			},
			{
				displayName: 'Name',
				name: 'name',
				type: 'string',
				default: '',
				description: 'Filter by template name',
				routing: { send: { type: 'body', property: 'name' } },
			},
			{
				displayName: 'Pagination Cursor',
				name: 'paging',
				type: 'string',
				default: '',
				description: 'Pagination cursor returned by a previous call',
				routing: { send: { type: 'body', property: 'paging' } },
			},
		],
	},

	// ----------------------------------
	//         waba: getTemplate
	// ----------------------------------
	{
		displayName: 'Channel Name or ID',
		name: 'id_canal',
		type: 'options',
		typeOptions: { loadOptionsMethod: 'getWabaChannels' },
		required: true,
		default: '',
		description: 'ID of the WABA channel for the account. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
		displayOptions: {
			show: {
				resource: ['waba'],
				operation: ['getTemplate'],
			},
		},
		routing: {
			send: { type: 'body', property: 'id_canal' },
		},
	},
	{
		displayName: 'Search Fields',
		name: 'searchFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		description: 'Send the template ID in Meta or its alternate name to identify it',
		displayOptions: {
			show: {
				resource: ['waba'],
				operation: ['getTemplate'],
			},
		},
		options: [
			{
				displayName: 'Template ID',
				name: 'id',
				type: 'string',
				default: '',
				description: 'ID of the template in Meta',
				routing: { send: { type: 'body', property: 'id' } },
			},
			{
				displayName: 'Template Name',
				name: 'id_template',
				type: 'string',
				default: '',
				description: 'Alternate name or ID of the template',
				routing: { send: { type: 'body', property: 'id_template' } },
			},
		],
	},

	// ----------------------------------
	//         waba: sendQuickAnswer
	// ----------------------------------
	{
		displayName: 'Channel Name or ID',
		name: 'id_canal',
		type: 'options',
		typeOptions: { loadOptionsMethod: 'getWabaChannels' },
		required: true,
		default: '',
		description: 'ID of the WABA channel for the account. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
		displayOptions: {
			show: {
				resource: ['waba'],
				operation: ['sendQuickAnswer'],
			},
		},
		routing: {
			send: { type: 'body', property: 'id_canal' },
		},
	},
	{
		displayName: 'Phone Number',
		name: 'numero',
		type: 'string',
		required: true,
		default: '',
		description: 'Destination phone number',
		displayOptions: {
			show: {
				resource: ['waba'],
				operation: ['sendQuickAnswer'],
			},
		},
		routing: {
			send: { type: 'body', property: 'numero' },
		},
	},
	{
		displayName: 'Quick Reply ID',
		name: 'id_respuesta',
		type: 'number',
		required: true,
		default: 0,
		description: 'ID of the quick reply (lc_respuestasrapidas)',
		displayOptions: {
			show: {
				resource: ['waba'],
				operation: ['sendQuickAnswer'],
			},
		},
		routing: {
			send: { type: 'body', property: 'id_respuesta' },
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
				resource: ['waba'],
				operation: ['sendQuickAnswer'],
			},
		},
		options: [
			{
				displayName: 'Variables',
				name: 'variables',
				type: 'json',
				default: '{}',
				description: 'Key-value pairs to substitute {key} in the reply text',
				routing: {
					send: {
						type: 'body',
						property: 'variables',
						value: '={{ typeof $value === "object" && $value !== null ? $value : JSON.parse($value || "{}") }}',
					},
				},
			},
		],
	},

	// ----------------------------------
	//         waba: sendTemplate
	// ----------------------------------
	{
		displayName: 'Channel Name or ID',
		name: 'id_canal',
		type: 'options',
		typeOptions: { loadOptionsMethod: 'getWabaChannels' },
		required: true,
		default: '',
		description: 'ID of the WABA channel for the account. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
		displayOptions: {
			show: {
				resource: ['waba'],
				operation: ['sendTemplate'],
			},
		},
		routing: {
			send: { type: 'body', property: 'id_canal' },
		},
	},
	{
		displayName: 'Phone Number',
		name: 'numero',
		type: 'string',
		required: true,
		default: '',
		placeholder: '573001112233',
		description: 'Destination phone number with country code, no spaces or symbols',
		displayOptions: {
			show: {
				resource: ['waba'],
				operation: ['sendTemplate'],
			},
		},
		routing: {
			// The preSend hangs off this field because it's ALWAYS visible: n8n doesn't run
			// the preSend of hidden fields, and the variable/URL fields appear based on the
			// chosen template.
			send: { type: 'body', property: 'numero', preSend: [prepareTemplateSend] },
		},
	},
	{
		displayName: 'Template Name or ID',
		name: 'id_plantilla',
		type: 'options',
		typeOptions: { loadOptionsMethod: 'getWabaTemplates', loadOptionsDependsOn: ['&id_canal'] },
		required: true,
		default: '',
		description: 'ID or name of the template to send. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
		displayOptions: {
			show: {
				resource: ['waba'],
				operation: ['sendTemplate'],
			},
		},
		routing: {
			send: { type: 'body', property: 'id_plantilla' },
		},
	},
	{
		displayName: 'Variable {{1}}',
		name: 'variable_1',
		type: 'string',
		default: '',
		description: 'Value that replaces {{1}} in the template text',
		displayOptions: {
			show: {
				resource: ['waba'],
				operation: ['sendTemplate'],
				id_plantilla: [{ _cnd: { regex: '\\|v([1-9]|\\d{2,})\\|' } }],
			},
		},
	},
	{
		displayName: 'Variable {{2}}',
		name: 'variable_2',
		type: 'string',
		default: '',
		description: 'Value that replaces {{2}} in the template text',
		displayOptions: {
			show: {
				resource: ['waba'],
				operation: ['sendTemplate'],
				id_plantilla: [{ _cnd: { regex: '\\|v([2-9]|\\d{2,})\\|' } }],
			},
		},
	},
	{
		displayName: 'Variable {{3}}',
		name: 'variable_3',
		type: 'string',
		default: '',
		description: 'Value that replaces {{3}} in the template text',
		displayOptions: {
			show: {
				resource: ['waba'],
				operation: ['sendTemplate'],
				id_plantilla: [{ _cnd: { regex: '\\|v([3-9]|\\d{2,})\\|' } }],
			},
		},
	},
	{
		displayName: 'Variable {{4}}',
		name: 'variable_4',
		type: 'string',
		default: '',
		description: 'Value that replaces {{4}} in the template text',
		displayOptions: {
			show: {
				resource: ['waba'],
				operation: ['sendTemplate'],
				id_plantilla: [{ _cnd: { regex: '\\|v([4-9]|\\d{2,})\\|' } }],
			},
		},
	},
	{
		displayName: 'Variable {{5}}',
		name: 'variable_5',
		type: 'string',
		default: '',
		description: 'Value that replaces {{5}} in the template text',
		displayOptions: {
			show: {
				resource: ['waba'],
				operation: ['sendTemplate'],
				id_plantilla: [{ _cnd: { regex: '\\|v([5-9]|\\d{2,})\\|' } }],
			},
		},
	},
	{
		displayName: 'Variable {{6}}',
		name: 'variable_6',
		type: 'string',
		default: '',
		description: 'Value that replaces {{6}} in the template text',
		displayOptions: {
			show: {
				resource: ['waba'],
				operation: ['sendTemplate'],
				id_plantilla: [{ _cnd: { regex: '\\|v([6-9]|\\d{2,})\\|' } }],
			},
		},
	},
	{
		displayName: 'Variable {{7}}',
		name: 'variable_7',
		type: 'string',
		default: '',
		description: 'Value that replaces {{7}} in the template text',
		displayOptions: {
			show: {
				resource: ['waba'],
				operation: ['sendTemplate'],
				id_plantilla: [{ _cnd: { regex: '\\|v([7-9]|\\d{2,})\\|' } }],
			},
		},
	},
	{
		displayName: 'Variable {{8}}',
		name: 'variable_8',
		type: 'string',
		default: '',
		description: 'Value that replaces {{8}} in the template text',
		displayOptions: {
			show: {
				resource: ['waba'],
				operation: ['sendTemplate'],
				id_plantilla: [{ _cnd: { regex: '\\|v([8-9]|\\d{2,})\\|' } }],
			},
		},
	},
	{
		displayName: 'Variable {{9}}',
		name: 'variable_9',
		type: 'string',
		default: '',
		description: 'Value that replaces {{9}} in the template text',
		displayOptions: {
			show: {
				resource: ['waba'],
				operation: ['sendTemplate'],
				id_plantilla: [{ _cnd: { regex: '\\|v(9|\\d{2,})\\|' } }],
			},
		},
	},
	{
		displayName: 'Variable {{10}}',
		name: 'variable_10',
		type: 'string',
		default: '',
		description: 'Value that replaces {{10}} in the template text',
		displayOptions: {
			show: {
				resource: ['waba'],
				operation: ['sendTemplate'],
				id_plantilla: [{ _cnd: { regex: '\\|v\\d{2,}\\|' } }],
			},
		},
	},
	{
		displayName: 'Header URL',
		name: 'url_encabezado',
		type: 'string',
		default: '',
		placeholder: 'https://…',
		description:
			'Public URL of the template header image, video, or document. The node places it in the field matching the media type.',
		displayOptions: {
			show: {
				resource: ['waba'],
				operation: ['sendTemplate'],
			},
			// Only appears when the chosen template carries media in the header
			// (the selector's value ends in IMAGE, VIDEO, or DOCUMENT); with no template
			// chosen, nothing is shown.
			hide: {
				id_plantilla: ['', { _cnd: { regex: '\\|(NONE|TEXT)$' } }],
			},
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
				resource: ['waba'],
				operation: ['sendTemplate'],
			},
		},
		options: [
			{
				displayName: 'Additional Message',
				name: 'message',
				type: 'json',
				default: '{}',
				description: 'Additional message to accompany the template',
				routing: {
					send: {
						type: 'body',
						property: 'message',
						value: '={{ typeof $value === "object" && $value !== null ? $value : JSON.parse($value || "{}") }}',
					},
				},
			},
			{
				displayName: 'Body Variables (Comma-Separated)',
				name: 'variables_csv',
				type: 'string',
				default: '',
				placeholder: 'Ana, May 12',
				// With the template chosen via expression (bulk sending with a different
				// template per row), n8n can't know how many "Variable {{n}}" fields to
				// show, because displayOptions sees the expression unevaluated.
				description:
					'Only used if you choose the template with an expression: body values separated by commas, in the order {{1}}, {{2}}, etc. If you fill in the "Variable {{n}}" fields, they take precedence.',
			},
			{
				displayName: 'Buttons',
				name: 'buttons',
				type: 'json',
				default: '[]',
				description: 'Dynamic buttons of the template (array of objects)',
				routing: {
					send: {
						type: 'body',
						property: 'buttons',
						value: '={{ typeof $value === "object" && $value !== null ? $value : JSON.parse($value || "[]") }}',
					},
				},
			},
			{
				displayName: 'Delegate Team Name or ID',
				name: 'id_to_delegate',
				type: 'options',
				typeOptions: { loadOptionsMethod: 'getGroups' },
				default: '',
				description: 'ID of the team to delegate follow-up of the sent template to. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
				routing: { send: { type: 'body', property: 'id_to_delegate' } },
			},
			{
				displayName: 'Header Variables',
				name: 'variables_encabezado',
				type: 'string',
				default: '',
				placeholder: 'value1,value2',
				description: 'Text header variables, separated by commas',
				routing: {
					send: {
						type: 'body',
						property: 'variables_encabezado',
						value:
							'={{ $value.toString().split(",").map((v) => v.trim()).filter((v) => v !== "") }}',
					},
				},
			},
			{
				displayName: 'Use Sample Data',
				name: 'usar_ejemplo',
				type: 'boolean',
				default: false,
				description:
					'Whether to fill in whatever you leave empty with the sample data provided by the Meta template. Useful for sending yourself a test without typing anything.',
			},
		],
	},
];
