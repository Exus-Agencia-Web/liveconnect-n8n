import type { INodeProperties } from 'n8n-workflow';

import { handleLcResponse, prepareTemplateSend } from '../GenericFunctions';

export const wabaOperations: INodeProperties[] = [
	{
		displayName: 'Operación',
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
				name: 'Enviar Plantilla',
				value: 'sendTemplate',
				action: 'Enviar una plantilla',
				description:
					'Envía la plantilla indicada al número destino por el canal seleccionado. El encabezado admite imagen, documento o video (el video se rechaza si supera 16MB o no es mp4/3gp).',
				routing: {
					request: { method: 'POST', url: '/direct/waba/sendTemplate' },
					output: { postReceive: [handleLcResponse] },
				},
			},
			{
				name: 'Enviar Respuesta Rápida',
				value: 'sendQuickAnswer',
				action: 'Enviar una respuesta rápida',
				description:
					'Envía una respuesta rápida (texto y/o archivo adjunto) al número destino, sustituyendo {clave} en el texto por las variables indicadas',
				routing: {
					request: { method: 'POST', url: '/direct/waba/sendwabaQuickAnswer' },
					output: { postReceive: [handleLcResponse] },
				},
			},
			{
				name: 'Obtener Plantilla',
				value: 'getTemplate',
				action: 'Obtener una plantilla',
				description:
					'Busca una plantilla por ID o por nombre. Requiere el ID del canal y, como identificador, el ID de la plantilla en Meta o su nombre alterno.',
				routing: {
					request: { method: 'POST', url: '/direct/waba/getTemplate' },
					output: { postReceive: [handleLcResponse] },
				},
			},
			{
				name: 'Obtener Varias Plantillas',
				value: 'getManyTemplates',
				action: 'Obtener varias plantillas',
				description:
					'Retorna las plantillas de WhatsApp Business API configuradas en el canal, con paginación y filtros opcionales de Meta',
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
		displayName: 'ID del Canal',
		name: 'id_canal',
		type: 'options',
		typeOptions: { loadOptionsMethod: 'getWabaChannels' },
		required: true,
		default: '',
		description:
			'ID del canal WABA de la cuenta. Elige de la lista o especifica un ID con una expresión.',
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
		displayName: 'Filtros',
		name: 'filters',
		type: 'collection',
		placeholder: 'Agregar Filtro',
		default: {},
		displayOptions: {
			show: {
				resource: ['waba'],
				operation: ['getManyTemplates'],
			},
		},
		options: [
			{
				displayName: 'Categoría',
				name: 'category',
				type: 'options',
				options: [
					{ name: 'Autenticación', value: 'AUTHENTICATION' },
					{ name: 'Marketing', value: 'MARKETING' },
					{ name: 'Utilidad', value: 'UTILITY' },
				],
				default: 'MARKETING',
				description: 'Filtra por categoría de Meta',
				routing: { send: { type: 'body', property: 'category' } },
			},
			{
				displayName: 'Cursor de Paginación',
				name: 'paging',
				type: 'string',
				default: '',
				description: 'Cursor de paginación devuelto por una llamada previa',
				routing: { send: { type: 'body', property: 'paging' } },
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
			{
				displayName: 'Nombre',
				name: 'name',
				type: 'string',
				default: '',
				description: 'Filtra por nombre de la plantilla',
				routing: { send: { type: 'body', property: 'name' } },
			},
			{
				displayName: 'Solo Aprobadas',
				name: 'approved',
				type: 'boolean',
				default: false,
				description: 'Si se activa, devuelve solo las plantillas con estado APPROVED',
				routing: { send: { type: 'body', property: 'approved' } },
			},
		],
	},

	// ----------------------------------
	//         waba: getTemplate
	// ----------------------------------
	{
		displayName: 'ID del Canal',
		name: 'id_canal',
		type: 'options',
		typeOptions: { loadOptionsMethod: 'getWabaChannels' },
		required: true,
		default: '',
		description:
			'ID del canal WABA de la cuenta. Elige de la lista o especifica un ID con una expresión.',
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
		displayName: 'Campos de Búsqueda',
		name: 'searchFields',
		type: 'collection',
		placeholder: 'Agregar Campo',
		default: {},
		description: 'Envía el ID de la plantilla en Meta o su nombre alterno para identificarla',
		displayOptions: {
			show: {
				resource: ['waba'],
				operation: ['getTemplate'],
			},
		},
		options: [
			{
				displayName: 'ID de la Plantilla',
				name: 'id',
				type: 'string',
				default: '',
				description: 'ID de la plantilla en Meta',
				routing: { send: { type: 'body', property: 'id' } },
			},
			{
				displayName: 'Nombre de la Plantilla',
				name: 'id_template',
				type: 'string',
				default: '',
				description: 'Nombre o ID alterno de la plantilla',
				routing: { send: { type: 'body', property: 'id_template' } },
			},
		],
	},

	// ----------------------------------
	//         waba: sendQuickAnswer
	// ----------------------------------
	{
		displayName: 'ID del Canal',
		name: 'id_canal',
		type: 'options',
		typeOptions: { loadOptionsMethod: 'getWabaChannels' },
		required: true,
		default: '',
		description:
			'ID del canal WABA de la cuenta. Elige de la lista o especifica un ID con una expresión.',
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
		displayName: 'Número de Teléfono',
		name: 'numero',
		type: 'string',
		required: true,
		default: '',
		description: 'Celular destino',
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
		displayName: 'ID de la Respuesta Rápida',
		name: 'id_respuesta',
		type: 'number',
		required: true,
		default: 0,
		description: 'ID de la respuesta rápida (lc_respuestasrapidas)',
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
		displayName: 'Campos Adicionales',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Agregar Campo',
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
				description: 'Pares clave-valor para sustituir {clave} en el texto de la respuesta',
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
		displayName: 'ID del Canal',
		name: 'id_canal',
		type: 'options',
		typeOptions: { loadOptionsMethod: 'getWabaChannels' },
		required: true,
		default: '',
		description:
			'ID del canal WABA de la cuenta. Elige de la lista o especifica un ID con una expresión.',
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
		displayName: 'Número de Teléfono',
		name: 'numero',
		type: 'string',
		required: true,
		default: '',
		placeholder: '573001112233',
		description: 'Celular destino con código de país, sin espacios ni signos',
		displayOptions: {
			show: {
				resource: ['waba'],
				operation: ['sendTemplate'],
			},
		},
		routing: {
			// El preSend cuelga de este campo porque SIEMPRE está visible: n8n no ejecuta
			// los preSend de campos ocultos, y los de variables/URL aparecen según la
			// plantilla elegida.
			send: { type: 'body', property: 'numero', preSend: [prepareTemplateSend] },
		},
	},
	{
		displayName: 'ID de la Plantilla',
		name: 'id_plantilla',
		type: 'options',
		typeOptions: { loadOptionsMethod: 'getWabaTemplates', loadOptionsDependsOn: ['&id_canal'] },
		required: true,
		default: '',
		description:
			'ID o nombre de la plantilla a enviar. Elige de la lista o especifica un ID con una expresión.',
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
		description: 'Valor que reemplaza a {{1}} en el texto de la plantilla',
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
		description: 'Valor que reemplaza a {{2}} en el texto de la plantilla',
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
		description: 'Valor que reemplaza a {{3}} en el texto de la plantilla',
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
		description: 'Valor que reemplaza a {{4}} en el texto de la plantilla',
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
		description: 'Valor que reemplaza a {{5}} en el texto de la plantilla',
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
		description: 'Valor que reemplaza a {{6}} en el texto de la plantilla',
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
		description: 'Valor que reemplaza a {{7}} en el texto de la plantilla',
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
		description: 'Valor que reemplaza a {{8}} en el texto de la plantilla',
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
		description: 'Valor que reemplaza a {{9}} en el texto de la plantilla',
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
		description: 'Valor que reemplaza a {{10}} en el texto de la plantilla',
		displayOptions: {
			show: {
				resource: ['waba'],
				operation: ['sendTemplate'],
				id_plantilla: [{ _cnd: { regex: '\\|v\\d{2,}\\|' } }],
			},
		},
	},
	{
		displayName: 'URL del Encabezado',
		name: 'url_encabezado',
		type: 'string',
		default: '',
		placeholder: 'https://…',
		description:
			'URL pública de la imagen, video o documento del encabezado de la plantilla. El nodo la coloca en el campo que corresponda al tipo de medio.',
		displayOptions: {
			show: {
				resource: ['waba'],
				operation: ['sendTemplate'],
			},
			// Solo aparece cuando la plantilla elegida lleva un medio en el encabezado
			// (el valor del selector termina en IMAGE, VIDEO o DOCUMENT); con la plantilla
			// sin elegir no se muestra nada.
			hide: {
				id_plantilla: ['', { _cnd: { regex: '\\|(NONE|TEXT)$' } }],
			},
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
				resource: ['waba'],
				operation: ['sendTemplate'],
			},
		},
		options: [
			{
				displayName: 'Botones',
				name: 'buttons',
				type: 'json',
				default: '[]',
				description: 'Botones dinámicos de la plantilla (arreglo de objetos)',
				routing: {
					send: {
						type: 'body',
						property: 'buttons',
						value: '={{ typeof $value === "object" && $value !== null ? $value : JSON.parse($value || "[]") }}',
					},
				},
			},
			{
				displayName: 'ID del Equipo a Delegar',
				name: 'id_to_delegate',
				type: 'options',
				typeOptions: { loadOptionsMethod: 'getGroups' },
				default: '',
				description:
					'ID del equipo al que delegar el seguimiento de la plantilla enviada. Elige de la lista o especifica un ID con una expresión.',
				routing: { send: { type: 'body', property: 'id_to_delegate' } },
			},
			{
				displayName: 'Mensaje Adicional',
				name: 'message',
				type: 'json',
				default: '{}',
				description: 'Mensaje adicional para acompañar la plantilla',
				routing: {
					send: {
						type: 'body',
						property: 'message',
						value: '={{ typeof $value === "object" && $value !== null ? $value : JSON.parse($value || "{}") }}',
					},
				},
			},
			{
				displayName: 'Usar Datos de Ejemplo',
				name: 'usar_ejemplo',
				type: 'boolean',
				default: false,
				description:
					'Si se activa, rellena lo que dejes vacío con los datos de ejemplo que trae la plantilla de Meta. Sirve para enviarte una prueba sin escribir nada.',
			},
			{
				displayName: 'Variables del Cuerpo Separadas por Comas',
				name: 'variables_csv',
				type: 'string',
				default: '',
				placeholder: 'Ana, 12 de mayo',
				// Con la plantilla elegida por expresión (envío masivo con una plantilla
				// distinta por fila) n8n no puede saber cuántos campos "Variable {{n}}"
				// mostrar, porque displayOptions ve la expresión sin evaluar.
				description:
					'Solo si eliges la plantilla con una expresión: valores del cuerpo separados por comas, en el orden {{1}}, {{2}}, etc. Si llenas los campos "Variable {{n}}", estos mandan.',
			},
			{
				displayName: 'Variables del Encabezado',
				name: 'variables_encabezado',
				type: 'string',
				default: '',
				placeholder: 'value1,value2',
				description: 'Variables del encabezado de texto, separadas por comas',
				routing: {
					send: {
						type: 'body',
						property: 'variables_encabezado',
						value:
							'={{ $value.toString().split(",").map((v) => v.trim()).filter((v) => v !== "") }}',
					},
				},
			},
		],
	},
];
