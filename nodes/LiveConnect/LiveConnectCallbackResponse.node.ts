import type {
	IDataObject,
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';
import { NodeApiError, NodeConnectionTypes, NodeOperationError } from 'n8n-workflow';

import { applyClosingRule, buildEnvelope, toAction } from './ActionsFunctions';
import { getGroups, getUsers } from './LoadOptions';

export class LiveConnectCallbackResponse implements INodeType {
	// Selectores de agente y equipo para las acciones de delegación.
	methods = {
		loadOptions: { getGroups, getUsers },
	};

	description: INodeTypeDescription = {
		displayName: 'LiveConnect Respuesta al Callback',
		name: 'liveConnectCallbackResponse',
		icon: { light: 'file:liveconnect2.svg', dark: 'file:liveconnect2.svg' },
		group: ['transform'],
		version: 1,
		subtitle:
			'={{$parameter["acciones"]?.accion?.length ? $parameter["acciones"].accion.length + " actions" : "response"}}',
		description:
			'Construye visualmente la respuesta de actions del callback del Flowbot y responde el webhook',
		defaults: {
			name: 'LiveConnect Respuesta al Callback',
		},
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
		usableAsTool: true,
		// Credencial opcional: solo se usa para poblar los selectores de agente y equipo.
		// El nodo funciona sin ella (no llama al API para construir la respuesta).
		credentials: [
			{
				name: 'liveConnectApi',
				required: false,
			},
		],
		properties: [
			{
				displayName:
					'Construye la respuesta síncrona del callback del Flowbot sin código. Regla de oro: si no delegas, la respuesta cierra con una acción <code>input</code> (el toggle de abajo lo garantiza). Con "Responder al Webhook" activo, el LiveConnect Callback Trigger debe estar en modo "Usando el Nodo Respond to Webhook" (su default). No intercales nodos que puedan filtrar el item (IF/Filter) entre el trigger y este nodo: si no llega ningún item, el callback queda sin respuesta hasta su timeout.',
				name: 'notice',
				type: 'notice',
				default: '',
			},
			{
				displayName: 'Acciones',
				name: 'acciones',
				type: 'fixedCollection',
				typeOptions: { multipleValues: true, sortable: true },
				placeholder: 'Agregar Acción',
				default: {},
				description: 'Acciones que LiveConnect ejecuta en orden al recibir la respuesta',
				options: [
					{
						name: 'accion',
						displayName: 'Acción',
						values: [
							{
								displayName: 'Tipo',
								name: 'tipo',
								type: 'options',
								options: [
									{
										name: 'Actualizar Contacto (updateContact)',
										value: 'updateContact',
										description: 'Persiste un dato del contacto (name, email, phone…)',
									},
									{
										name: 'Actualizar Variable (setVar)',
										value: 'setVar',
										description: 'Actualiza una variable de memoria existente',
									},
									{
										name: 'Agregar Etiqueta (addTag)',
										value: 'addTag',
										description: 'Clasifica la conversación con una etiqueta',
									},
									{
										name: 'Crear Variable (addVar)',
										value: 'addVar',
										description: 'Crea una variable de memoria (primera escritura)',
									},
									{
										name: 'Delegar a Equipo (teamDelegate)',
										value: 'teamDelegate',
										description: 'Entrega la conversación a un equipo; el bot sale del callback',
									},
									{
										name: 'Delegar a Usuario (userDelegate)',
										value: 'userDelegate',
										description:
											'Entrega la conversación a un agente concreto; el bot sale del callback',
									},
									{
										name: 'Enviar Archivo (sendFile)',
										value: 'sendFile',
										description: 'Envía un archivo por URL pública',
									},
									{
										name: 'Enviar Imagen (sendImage)',
										value: 'sendImage',
										description: 'Envía una imagen por URL pública',
									},
									{
										name: 'Enviar Texto (sendText)',
										value: 'sendText',
										description: 'Envía un mensaje de texto al usuario',
									},
									{
										name: 'Esperar Respuesta (input)',
										value: 'input',
										description:
											'Pregunta y espera respuesta del usuario (vacío = espera sin mostrar nada)',
									},
								],
								default: 'sendText',
							},
							{
								displayName: 'Texto',
								name: 'text',
								type: 'string',
								typeOptions: { rows: 3 },
								default: '',
								displayOptions: { show: { tipo: ['sendText'] } },
								description: 'Mensaje que se envía al usuario',
							},
							{
								displayName: 'URL',
								name: 'url',
								type: 'string',
								default: '',
								placeholder: 'https://…',
								displayOptions: { show: { tipo: ['sendImage', 'sendFile'] } },
								description: 'URL pública y descargable por LiveConnect',
							},
							{
								displayName: 'ID de la Etiqueta',
								name: 'id_tag',
								type: 'number',
								default: 0,
								displayOptions: { show: { tipo: ['addTag'] } },
								description: 'ID entero de la etiqueta en LiveConnect',
							},
							{
								displayName: 'ID del Usuario',
								name: 'id_user',
								type: 'options',
								typeOptions: { loadOptionsMethod: 'getUsers' },
								default: '',
								displayOptions: { show: { tipo: ['userDelegate'] } },
								description:
									'Agente al que se delega. Elige de la lista o especifica un ID con una expresión.',
							},
							{
								displayName: 'Nombre del Usuario',
								name: 'user_name',
								type: 'string',
								default: '',
								displayOptions: { show: { tipo: ['userDelegate'] } },
								description: 'Nombre visible del agente al que se delega',
							},
							{
								displayName: 'Avatar del Usuario',
								name: 'user_avatar',
								type: 'string',
								default: '',
								placeholder: 'https://…',
								displayOptions: { show: { tipo: ['userDelegate'] } },
								description: 'URL del avatar del agente (opcional; se omite si queda vacío)',
							},
							{
								displayName: 'ID del Equipo',
								name: 'id_team',
								type: 'options',
								typeOptions: { loadOptionsMethod: 'getGroups' },
								default: '',
								displayOptions: { show: { tipo: ['teamDelegate'] } },
								description:
									'Equipo al que se delega. Elige de la lista o especifica un ID con una expresión.',
							},
							{
								displayName: 'Nombre de la Variable',
								name: 'varname',
								type: 'string',
								default: '',
								displayOptions: { show: { tipo: ['addVar', 'setVar'] } },
								description: 'Nombre de la variable de memoria del bot',
							},
							{
								displayName: 'Valor de la Variable',
								name: 'varvalue',
								type: 'string',
								default: '',
								displayOptions: { show: { tipo: ['addVar', 'setVar'] } },
								description: 'Valor a guardar (puede ser vacío)',
							},
							{
								displayName: 'Pregunta',
								name: 'input',
								type: 'string',
								default: '',
								displayOptions: { show: { tipo: ['input'] } },
								description:
									'Texto que se muestra antes de esperar. Vacío = espera sin mostrar nada (keep-alive).',
							},
							{
								displayName: 'Campo del Contacto',
								name: 'key',
								type: 'string',
								default: '',
								placeholder: 'name, email, phone, company…',
								displayOptions: { show: { tipo: ['updateContact'] } },
								description: 'Campo del contacto a actualizar',
							},
							{
								displayName: 'Valor del Campo',
								name: 'value',
								type: 'string',
								default: '',
								displayOptions: { show: { tipo: ['updateContact'] } },
								description: 'Valor a persistir en el contacto',
							},
						],
					},
				],
			},
			{
				displayName: 'Agregar Input de Cierre Automáticamente',
				name: 'autoInput',
				type: 'boolean',
				default: true,
				description:
					'Si se activa, aplica la regla del contrato: sin delegación agrega { "type": "input", "input": "" } al final si falta, y con delegación elimina cualquier acción input configurada. Si se desactiva, las acciones se envían tal cual.',
			},
			{
				displayName: 'Responder al Webhook',
				name: 'respondWebhook',
				type: 'boolean',
				default: true,
				description:
					'Si se activa, responde el callback directamente con el envelope (sin nodo Respond to Webhook). Responde una sola vez aunque lleguen varios items. En ejecuciones manuales de prueba no tiene efecto y el nodo solo emite el envelope.',
			},
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];
		// El callback HTTP admite UNA sola respuesta por ejecución.
		let responded = false;

		for (let i = 0; i < items.length; i++) {
			try {
				const raw = this.getNodeParameter('acciones', i, {}) as { accion?: IDataObject[] };
				const autoInput = this.getNodeParameter('autoInput', i, true) as boolean;
				const uiActions = raw.accion ?? [];

				let actions = uiActions.map((ui, idx) => toAction(this.getNode(), ui, idx + 1, i));
				if (autoInput) {
					actions = applyClosingRule(actions);
				} else if (actions.length === 0) {
					// El contrato exige data.actions no vacío; sin autoInput no hay keep-alive implícito.
					throw new NodeOperationError(
						this.getNode(),
						'Configura al menos una acción o activa "Agregar Input de Cierre Automáticamente"',
						{ itemIndex: i },
					);
				}

				const envelope = buildEnvelope(actions);

				const respond = this.getNodeParameter('respondWebhook', i, true) as boolean;
				if (respond && !responded) {
					// Misma forma que el core Respond to Webhook (IN8nHttpFullResponse).
					// Sin webhook esperando (ejecución manual) es no-op: no lanza.
					this.sendResponse({
						body: envelope,
						headers: { 'content-type': 'application/json' },
						statusCode: 200,
					});
					responded = true;
				}

				returnData.push({ json: envelope, pairedItem: { item: i } });
			} catch (error) {
				if (this.continueOnFail()) {
					returnData.push({ json: { error: (error as Error).message }, pairedItem: { item: i } });
					continue;
				}
				// toAction() ya lanza NodeOperationError con el itemIndex correcto: se
				// relanza tal cual para no perder contexto ni envolverlo dos veces.
				if (error instanceof NodeOperationError || error instanceof NodeApiError) {
					throw error;
				}
				throw new NodeOperationError(this.getNode(), error as Error, { itemIndex: i });
			}
		}

		return [returnData];
	}
}
