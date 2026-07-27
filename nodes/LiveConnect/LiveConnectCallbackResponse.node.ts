import type {
	IDataObject,
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';
import { NodeConnectionTypes, NodeOperationError } from 'n8n-workflow';

import { applyClosingRule, buildEnvelope, toAction } from './ActionsFunctions';
import { getGroups, getUsers } from './LoadOptions';

export class LiveConnectCallbackResponse implements INodeType {
	// Selectores de agente y equipo para las acciones de delegación.
	methods = {
		loadOptions: { getGroups, getUsers },
	};

	description: INodeTypeDescription = {
		displayName: 'LiveConnect Callback Response',
		name: 'liveConnectCallbackResponse',
		icon: { light: 'file:liveconnect2.svg', dark: 'file:liveconnect2.dark.svg' },
		group: ['transform'],
		version: 1,
		subtitle:
			'={{$parameter["acciones"]?.accion?.length ? $parameter["acciones"].accion.length + " actions" : "response"}}',
		description:
			'Visually builds the action response for the Flowbot callback and responds to the webhook',
		defaults: {
			name: 'LiveConnect Callback Response',
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
					'Builds the synchronous response for the Flowbot callback without code. Golden rule: unless you delegate, the response must close with an <code>input</code> action (the toggle below guarantees this). With "Respond to Webhook" enabled, the LiveConnect Callback Trigger must be in "Using Respond to Webhook Node" mode (its default). Do not insert nodes that might filter the item (IF/Filter) between the trigger and this node: if no item arrives, the callback goes unanswered until it times out.',
				name: 'notice',
				type: 'notice',
				default: '',
			},
			{
				displayName: 'Actions',
				name: 'acciones',
				type: 'fixedCollection',
				typeOptions: { multipleValues: true, sortable: true },
				placeholder: 'Add Action',
				default: {},
				description: 'Actions that LiveConnect executes in order upon receiving the response',
				options: [
					{
						name: 'accion',
						displayName: 'Action',
						values: [
							{
						displayName: 'Contact Field',
						name: 'key',
						type: 'string',
						default: '',
						placeholder: 'name, email, phone, company…',
						description: 'Contact field to update',
							},
							{
						displayName: 'Field Value',
						name: 'value',
						type: 'string',
						default: '',
						description: 'Value to store on the contact',
							},
							{
						displayName: 'Question',
						name: 'input',
						type: 'string',
						default: '',
						description: 'Text shown before waiting. Empty	=	waits without showing anything (keep-alive).',
							},
							{
						displayName: 'Tag ID',
						name: 'id_tag',
						type: 'number',
						default: 0,
						description: 'Integer ID of the tag in LiveConnect',
							},
							{
						displayName: 'Team Name or ID',
						name: 'id_team',
						type: 'options',
						default: '',
						description: 'Team to delegate to. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
							},
							{
						displayName: 'Text',
						name: 'text',
						type: 'string',
						default: '',
						description: 'Message sent to the user',
							},
							{
						displayName: 'Type',
						name: 'tipo',
						type: 'options',
						options: [
									{
										name: 'Add Tag (addTag)',
										value: 'addTag',
										description: 'Classifies the conversation with a tag',
									},
									{
										name: 'Create Variable (addVar)',
										value: 'addVar',
										description: 'Creates a memory variable (first write)',
									},
									{
										name: 'Delegate to Team (teamDelegate)',
										value: 'teamDelegate',
										description: 'Hands the conversation over to a team;	the bot exits the callback',
									},
									{
										name: 'Delegate to User (userDelegate)',
										value: 'userDelegate',
										description: 'Hands the conversation over to a specific agent;	the bot exits the callback',
									},
									{
										name: 'Send File (sendFile)',
										value: 'sendFile',
										description: 'Sends a file via public URL',
									},
									{
										name: 'Send Image (sendImage)',
										value: 'sendImage',
										description: 'Sends an image via public URL',
									},
									{
										name: 'Send Text (sendText)',
										value: 'sendText',
										description: 'Sends a text message to the user',
									},
									{
										name: 'Set Variable (setVar)',
										value: 'setVar',
										description: 'Updates an existing memory variable',
									},
									{
										name: 'Update Contact (updateContact)',
										value: 'updateContact',
										description: 'Persists a contact field (name, email, phone…)',
									},
									{
										name: 'Wait for Reply (Input)',
										value: 'input',
										description: 'Asks a question and waits for a reply from the user (empty	=	waits without showing anything)',
									},
								],
						default: 'sendText',
							},
							{
						displayName: 'URL',
						name: 'url',
						type: 'string',
						default: '',
						placeholder: 'https://…',
						description: 'Public URL that LiveConnect can download',
							},
							{
						displayName: 'User Avatar',
						name: 'user_avatar',
						type: 'string',
						default: '',
						placeholder: 'https://…',
						description: 'Agent avatar URL (optional;	omitted if left empty)',
							},
							{
						displayName: 'User Name',
						name: 'user_name',
						type: 'string',
						default: '',
						description: 'Visible name of the agent being delegated to',
							},
							{
						displayName: 'User Name or ID',
						name: 'id_user',
						type: 'options',
						default: '',
						description: 'Agent to delegate to. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
							},
							{
						displayName: 'Variable Name',
						name: 'varname',
						type: 'string',
						default: '',
						description: 'Name of the bot memory variable',
							},
							{
						displayName: 'Variable Value',
						name: 'varvalue',
						type: 'string',
						default: '',
						description: 'Value to store (can be empty)',
							},
					],
					},
				],
			},
			{
				displayName: 'Automatically Add Closing Input',
				name: 'autoInput',
				type: 'boolean',
				default: true,
				description:
					'Whether to apply the contract rule: without delegation, adds { "type": "input", "input": "" } at the end if missing, and with delegation removes any configured input action. If disabled, actions are sent as-is.',
			},
			{
				displayName: 'Respond to Webhook',
				name: 'respondWebhook',
				type: 'boolean',
				default: true,
				description:
					'Whether to respond to the callback directly with the envelope (without a Respond to Webhook node). Responds only once even if several items arrive. Has no effect on manual test executions, where the node only emits the envelope.',
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
						'Configure at least one action or enable "Automatically Add Closing Input"',
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
				// Siempre se envuelve, incluso lo que ya es NodeOperationError: la regla
				// `require-node-api-error` del linter de nodos verificados prohíbe relanzar
				// el error tal cual. NodeOperationError conserva el mensaje del original,
				// así que el texto que ve el usuario no cambia.
				throw new NodeOperationError(this.getNode(), error as Error, { itemIndex: i });
			}
		}

		return [returnData];
	}
}
