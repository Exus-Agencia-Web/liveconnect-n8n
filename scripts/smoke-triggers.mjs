#!/usr/bin/env node
/**
 * Prueba de humo de los trigger nodes sobre dist/, sin n8n corriendo.
 *
 * Uso: npm run build && node scripts/smoke-triggers.mjs
 *
 * Simula IWebhookFunctions / IHookFunctions con mocks y ejecuta:
 *  - CallbackTrigger.webhook() con el payload REAL de producción del Flowbot
 *  - validación de secret (query/header, 403 al fallar)
 *  - ProxyTrigger.webhookMethods (checkExists/create/delete) con API mockeada
 */
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { LiveConnectCallbackTrigger } = require('../dist/nodes/LiveConnect/LiveConnectCallbackTrigger.node.js');
const { LiveConnectProxyTrigger } = require('../dist/nodes/LiveConnect/LiveConnectProxyTrigger.node.js');
const { Workflow, NodeHelpers } = require('n8n-workflow');

// --- payload real de producción (contrato-request.md de la skill del gateway) ---
const REAL_BODY = {
	chat: {
		IPs: '200.189.27.0',
		contacto: {
			id: 'AKZPF35619988576HQZTF',
			isbot: 0,
			nombre: 'Nuevo Visitante',
			pais: '-',
			etiquetas: { 0: 0 },
			extra1: '',
			extra2: '',
			default_target: 0,
			default_target_id: 0,
			destacado: 0,
		},
		etiquetas: { 0: 0 },
		fecha: 1779240515,
		fecha_ini: 1779240516,
		id: 'ZMXRQ3854777686PYTXM',
		id_canal: 67095,
		id_grupo: 36284,
		id_usuario: 63479,
		isbot: 1,
		traceID: 'Root=1-6a0d0e43-xxxx',
		usuarios: {
			63479: {
				id: 63479,
				isbot: 1,
				assign: true,
				nombre: '*BOT* Flowbot: Test n8n',
				bot_data: { id_flowbot: 18443 },
			},
		},
	},
	inputs: {
		id: 'AKZPF35619988576HQZTF',
		id_contacto: null,
		nombre: 'Nuevo Visitante',
		email: null,
		correo: null,
		celular: null,
		pais: '-',
		etiquetas: [0],
		isbot: 0,
		mensaje_inicial: 'Hola!',
	},
	userInput: '',
	userFile: {},
	intent: { id_flowbot: 18443, id_intent: 416761, id_parent: 0, nombre: 'Menú principal', input: '' },
	idcs: 2,
};

function makeResSpy() {
	const spy = { statusCode: null, body: null };
	spy.status = (code) => {
		spy.statusCode = code;
		return spy;
	};
	spy.json = (body) => {
		spy.body = body;
		return spy;
	};
	return spy;
}

function webhookCtx({ body = REAL_BODY, params = {}, headers = {}, query = {}, staticData = {} } = {}) {
	const res = makeResSpy();
	return {
		res,
		ctx: {
			getBodyData: () => body,
			getHeaderData: () => headers,
			getQueryData: () => query,
			getNodeParameter: (name, fallback) => params[name] ?? fallback,
			getResponseObject: () => res,
			getWorkflowStaticData: () => staticData,
			getNode: () => ({ name: 'test' }),
			helpers: {
				returnJsonArray: (d) => (Array.isArray(d) ? d : [d]).map((json) => ({ json })),
			},
		},
	};
}

let passed = 0;
const test = async (name, fn) => {
	await fn();
	passed++;
	console.log(`✓ ${name}`);
};

const callback = new LiveConnectCallbackTrigger();
const proxy = new LiveConnectProxyTrigger();

// --- descriptions ---
await test('descriptions de triggers válidas', () => {
	for (const t of [callback, proxy]) {
		assert.ok(t.description.name.endsWith('Trigger'));
		assert.ok(t.description.displayName.endsWith(' Trigger'));
		assert.deepEqual(t.description.inputs, []);
		assert.ok(t.description.group.includes('trigger'));
		assert.equal(t.description.webhooks[0].httpMethod, 'POST');
	}
	assert.equal(proxy.description.credentials[0].name, 'liveConnectApi');
});

// --- callback: simplificación con payload real ---
await test('callback simplifica payload real (primer turno)', async () => {
	const { ctx } = webhookCtx({ params: { secret: '', simple: true } });
	const out = await callback.webhook.call(ctx);
	const json = out.workflowData[0][0].json;
	assert.equal(json.message, 'Hola!');
	assert.equal(json.isFirstTurn, true);
	assert.equal(json.sessionId, 'AKZPF35619988576HQZTF');
	assert.equal(json.hasHumanAgent, false);
	assert.equal(json.conversationId, 'ZMXRQ3854777686PYTXM');
	assert.equal(json.channelId, 67095);
	assert.equal(json.contact.nombre, 'Nuevo Visitante');
	assert.deepEqual(json.raw, REAL_BODY);
});

await test('callback turno normal usa userInput y detecta humano', async () => {
	const body = structuredClone(REAL_BODY);
	body.userInput = 'quiero precios';
	body.chat.usuarios['99'] = { id: 99, isbot: 0, nombre: 'Agente Real' };
	const { ctx } = webhookCtx({ body, params: { secret: '', simple: true } });
	const json = (await callback.webhook.call(ctx)).workflowData[0][0].json;
	assert.equal(json.message, 'quiero precios');
	assert.equal(json.isFirstTurn, false);
	assert.equal(json.hasHumanAgent, true);
});

await test('callback turno con adjunto sin texto NO es primer turno', async () => {
	const body = structuredClone(REAL_BODY);
	body.userFile = { url: 'https://cdn.example.com/foto.jpg', nombre: 'foto.jpg' };
	const { ctx } = webhookCtx({ body, params: { secret: '', simple: true } });
	const json = (await callback.webhook.call(ctx)).workflowData[0][0].json;
	assert.equal(json.isFirstTurn, false);
	assert.equal(json.hasAttachment, true);
	assert.equal(json.message, '');
	assert.equal(json.userFile.nombre, 'foto.jpg');
});

await test('sessionId sin ningún identificador es aleatorio por evento', async () => {
	const body = { chat: {}, inputs: {}, userInput: 'hola' };
	const a = (await callback.webhook.call(webhookCtx({ body, params: { secret: '', simple: true } }).ctx))
		.workflowData[0][0].json.sessionId;
	const b = (await callback.webhook.call(webhookCtx({ body, params: { secret: '', simple: true } }).ctx))
		.workflowData[0][0].json.sessionId;
	assert.notEqual(a, b);
	assert.ok(a.length > 10);
});

await test('callback simple:false entrega body crudo', async () => {
	const { ctx } = webhookCtx({ params: { secret: '', simple: false } });
	const json = (await callback.webhook.call(ctx)).workflowData[0][0].json;
	assert.deepEqual(json, REAL_BODY);
});

// --- callback: secret ---
await test('callback secret válido por query', async () => {
	const { ctx } = webhookCtx({
		params: { secret: 'LiveConnect', simple: true },
		query: { secret: 'LiveConnect' },
	});
	const out = await callback.webhook.call(ctx);
	assert.ok(out.workflowData);
});

await test('callback secret válido por header', async () => {
	const { ctx } = webhookCtx({
		params: { secret: 'LiveConnect', simple: true },
		headers: { secret: 'LiveConnect', 'user-agent': 'PageGear-Lambda-Hook/1.4.3' },
	});
	const out = await callback.webhook.call(ctx);
	assert.ok(out.workflowData);
});

await test('callback secret inválido → 403 sin ejecutar workflow', async () => {
	const { ctx, res } = webhookCtx({
		params: { secret: 'correcto', simple: true },
		query: { secret: 'incorrecto' },
	});
	const out = await callback.webhook.call(ctx);
	assert.equal(out.noWebhookResponse, true);
	assert.equal(out.workflowData, undefined);
	assert.equal(res.statusCode, 403);
	assert.equal(res.body.status, -1);
});

await test('callback secret vacío no valida', async () => {
	const { ctx } = webhookCtx({ params: { secret: '', simple: true }, query: {} });
	const out = await callback.webhook.call(ctx);
	assert.ok(out.workflowData);
});

// --- proxy: webhook() con forma desconocida ---
await test('proxy simplify con forma desconocida entrega crudo', async () => {
	const body = { evento: 'nuevo_mensaje', conversationId: 'X1' };
	const { ctx } = webhookCtx({ body, params: { secret: '', simple: true } });
	const json = (await proxy.webhook.call(ctx)).workflowData[0][0].json;
	assert.deepEqual(json, body);
});

await test('proxy simplify con forma conocida extrae campos', async () => {
	const { ctx } = webhookCtx({ params: { secret: '', simple: true } });
	const json = (await proxy.webhook.call(ctx)).workflowData[0][0].json;
	assert.equal(json.message, 'Hola!');
	assert.equal(json.sessionId, 'AKZPF35619988576HQZTF');
});

await test('proxy usa secret autogenerado de staticData', async () => {
	const staticData = { secret: 'auto-abc' };
	const bad = webhookCtx({ params: { secret: '', simple: true }, query: { secret: 'otro' }, staticData });
	const outBad = await proxy.webhook.call(bad.ctx);
	assert.equal(outBad.noWebhookResponse, true);
	assert.equal(bad.res.statusCode, 403);

	const ok = webhookCtx({ params: { secret: '', simple: true }, query: { secret: 'auto-abc' }, staticData });
	const outOk = await proxy.webhook.call(ok.ctx);
	assert.ok(outOk.workflowData);
});

// --- proxy: webhookMethods con API mockeada ---
function hookCtx({
	params,
	staticData = {},
	responses = [],
	webhookUrl = 'https://n8n.test/webhook/abc',
	credentials = {},
	mint,
}) {
	const calls = [];
	const mints = [];
	return {
		calls,
		mints,
		staticData,
		ctx: {
			getNodeParameter: (name, fallback) => params[name] ?? fallback,
			getNodeWebhookUrl: () => webhookUrl,
			getWorkflowStaticData: () => staticData,
			getNode: () => ({ name: 'test' }),
			// lcHookRequest consulta credenciales para renovar el token si hace falta.
			getCredentials: async () => credentials,
			helpers: {
				httpRequest: async (options) => {
					mints.push(options);
					return mint ?? { status: 1, data: { token: 'TOKEN-HOOK' } };
				},
				httpRequestWithAuthentication: async function (_cred, options) {
					calls.push(options);
					const r = responses.shift();
					if (r instanceof Error) throw r;
					return r ?? { status: 1, status_message: 'Ok', data: {} };
				},
			},
		},
	};
}

const hooks = proxy.webhookMethods.default;
const URL_OK = 'https://n8n.test/webhook/abc';
const futureTTL = Math.floor(Date.now() / 1000) + 3600;

await test('checkExists true con URL+secret+TTL válidos', async () => {
	const h = hookCtx({
		params: { id_canal: 67095, secret: 's3cr3t' },
		responses: [{ status: 1, data: { webhook: URL_OK, secret: 's3cr3t', TTL: futureTTL } }],
	});
	assert.equal(await hooks.checkExists.call(h.ctx), true);
});

await test('checkExists false: URL distinta / status<0 / TTL vencido / secret rotado / error', async () => {
	const cases = [
		{ status: 1, data: { webhook: 'https://otro.com/x', secret: 's3cr3t', TTL: futureTTL } },
		{ status: -3, status_message: 'no existe' },
		{ status: 1, data: { webhook: URL_OK, secret: 's3cr3t', TTL: 1000 } },
		{ status: 1, data: { webhook: URL_OK, secret: 'viejo', TTL: futureTTL } },
		new Error('API caída'),
	];
	for (const response of cases) {
		const h = hookCtx({ params: { id_canal: 67095, secret: 's3cr3t' }, responses: [response] });
		assert.equal(await hooks.checkExists.call(h.ctx), false);
	}
});

await test('checkExists false con secret local desconocido (fuerza create)', async () => {
	// staticData vacío + parámetro vacío: aunque el registro remoto coincida en URL/TTL,
	// jamás darlo por válido — de lo contrario la validación de secret quedaría apagada.
	const h = hookCtx({
		params: { id_canal: 67095, secret: '' },
		staticData: {},
		responses: [{ status: 1, data: { webhook: URL_OK, secret: 'remoto', TTL: futureTTL } }],
	});
	assert.equal(await hooks.checkExists.call(h.ctx), false);
});

await test('create con secret vacío genera hex(32), persiste y registra', async () => {
	const h = hookCtx({ params: { id_canal: 67095, secret: '' }, responses: [{ status: 1, data: {} }] });
	assert.equal(await hooks.create.call(h.ctx), true);
	const sent = h.calls[0].body;
	assert.equal(sent.id_canal, 67095);
	assert.equal(sent.url, URL_OK);
	assert.equal(sent.estado, 1);
	assert.match(sent.secret, /^[0-9a-f]{32}$/);
	assert.equal(h.staticData.secret, sent.secret);
});

await test('create con status<0 lanza NodeApiError', async () => {
	const h = hookCtx({ params: { id_canal: 67095, secret: 'x' }, responses: [{ status: -2, status_message: 'canal inválido' }] });
	await assert.rejects(() => hooks.create.call(h.ctx), /canal inválido/);
});

await test('los hooks siembran un token vigente cuando hay credenciales', async () => {
	const expirado = `${Buffer.from(JSON.stringify({ alg: 'HS256' })).toString('base64url')}.${Buffer.from(
		JSON.stringify({ exp: Math.floor(Date.now() / 1000) - 10 }),
	).toString('base64url')}.firma`;
	const h = hookCtx({
		params: { id_canal: 67095, secret: 's3cr3t' },
		credentials: { cKey: 'cuenta-hook', privateKey: 'PK', sessionToken: expirado },
		responses: [{ status: 1, data: { webhook: URL_OK, secret: 's3cr3t', TTL: futureTTL } }],
	});
	await hooks.checkExists.call(h.ctx);
	assert.equal(h.mints.length, 1, 'debe emitir un token nuevo');
	assert.equal(h.calls[0].headers?.PageGearToken, 'TOKEN-HOOK');
});

await test('delete manda estado 0 y limpia staticData solo si el borrado remoto fue confirmado', async () => {
	const ok = hookCtx({ params: { id_canal: 67095, secret: 'x' }, staticData: { secret: 'x' }, responses: [{ status: 1 }] });
	assert.equal(await hooks.delete.call(ok.ctx), true);
	assert.equal(ok.calls[0].body.estado, 0);
	assert.equal(ok.staticData.secret, undefined);

	// API caída: no bloquea la desactivación, pero CONSERVA el secret local —
	// el registro remoto sigue vivo con ese secret y webhook() debe seguir validando.
	const fail = hookCtx({ params: { id_canal: 67095, secret: '' }, staticData: { secret: 'auto-1' }, responses: [new Error('API caída')] });
	assert.equal(await hooks.delete.call(fail.ctx), true);
	assert.equal(fail.staticData.secret, 'auto-1');
});

// --- ruta del webhook configurable ---------------------------------------------------
// Se evalúa con el propio Workflow de n8n: la URL es <base>/<webhookId>/<ruta> y el
// default debe reproducir la de las versiones anteriores (`/webhook`).

function webhookUrl(TipoNodo, parameters, webhookId) {
	const type = new TipoNodo();
	const nodeTypes = {
		getByName: () => type,
		getByNameAndVersion: () => type,
		getKnownTypes: () => ({}),
	};
	const node = {
		name: 'LiveConnect Callback Trigger1',
		type: 'x',
		typeVersion: 1,
		position: [0, 0],
		parameters,
		...(webhookId !== undefined ? { webhookId } : {}),
	};
	const wf = new Workflow({ id: 'WF1', nodes: [node], connections: {}, active: false, nodeTypes });
	const path = wf.expression.getSimpleParameterValue(
		node,
		type.description.webhooks[0].path,
		'internal',
		{},
	);
	return NodeHelpers.getNodeWebhookUrl('https://n8n.test/webhook', 'WF1', node, String(path), false);
}

for (const [nombre, Tipo] of [
	['callback', LiveConnectCallbackTrigger],
	['proxy', LiveConnectProxyTrigger],
]) {
	await test(`${nombre}: sin tocar la ruta, la URL no cambia respecto a versiones previas`, () => {
		assert.equal(webhookUrl(Tipo, {}, 'uuid-A'), 'https://n8n.test/webhook/uuid-A/webhook');
	});

	await test(`${nombre}: la ruta configurada se usa en la URL`, () => {
		assert.equal(
			webhookUrl(Tipo, { path: 'callback-ventas' }, 'uuid-A'),
			'https://n8n.test/webhook/uuid-A/callback-ventas',
		);
	});

	await test(`${nombre}: ruta vacía cae al default y no deja la URL colgando`, () => {
		assert.equal(webhookUrl(Tipo, { path: '' }, 'uuid-A'), 'https://n8n.test/webhook/uuid-A/webhook');
	});

	await test(`${nombre}: dos nodos con rutas distintas no comparten URL`, () => {
		assert.notEqual(
			webhookUrl(Tipo, { path: 'ventas' }, 'uuid-A'),
			webhookUrl(Tipo, { path: 'soporte' }, 'uuid-A'),
		);
	});
}

console.log(`\n${passed} pruebas de humo OK`);
