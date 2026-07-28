#!/usr/bin/env node
/**
 * Prueba de humo del recurso Callback Response sobre dist/.
 * Uso: npm run build && node scripts/smoke-response.mjs
 *
 * Desde 2.0.0 no es un nodo aparte: n8n solo admite UN nodo regular por paquete
 * verificado, así que la respuesta al callback es un recurso del nodo principal,
 * implementado con `customOperations` (LiveConnect.node.ts).
 */
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { LiveConnect } = require('../dist/nodes/LiveConnect/LiveConnect.node.js');
const { NodeHelpers } = require('n8n-workflow');

const node = new LiveConnect();
/** La operación custom que n8n invoca en vez del routing para este recurso. */
const enviarRespuesta = node.customOperations.callbackResponse.send;

function executeCtx({ params = {}, items = [{ json: {} }] } = {}) {
	const sent = [];
	return {
		sent,
		ctx: {
			getInputData: () => items,
			getNodeParameter: (name, _i, fallback) => params[name] ?? fallback,
			getNode: () => ({ name: 'test' }),
			continueOnFail: () => false,
			sendResponse: (r) => sent.push(r),
			helpers: {},
		},
	};
}

const acciones = (list) => ({ accion: list });

let passed = 0;
const test = async (name, fn) => {
	await fn();
	passed++;
	console.log(`✓ ${name}`);
};

await test('sendText + autoInput → cierre automático y sendResponse único', async () => {
	const { ctx, sent } = executeCtx({
		params: {
			acciones: acciones([{ tipo: 'sendText', text: 'Hola' }]),
			autoInput: true,
			respondWebhook: true,
		},
	});
	const out = await enviarRespuesta.call(ctx);
	const envelope = out[0][0].json;
	assert.deepEqual(envelope.data.actions, [
		{ type: 'sendText', text: 'Hola' },
		{ type: 'input', input: '' },
	]);
	assert.equal(envelope.status, 1);
	assert.equal(sent.length, 1);
	assert.equal(sent[0].statusCode, 200);
	assert.equal(sent[0].headers['content-type'], 'application/json');
	assert.deepEqual(sent[0].body, envelope);
});

await test('input INTERMEDIO no cierra: se agrega input de cierre al final', async () => {
	const { ctx } = executeCtx({
		params: {
			acciones: acciones([
				{ tipo: 'input', input: '¿Tu email?' },
				{ tipo: 'sendText', text: 'Gracias, te contactamos' },
			]),
			autoInput: true,
		},
	});
	const actions = (await enviarRespuesta.call(ctx))[0][0].json.data.actions;
	assert.equal(actions.length, 3);
	assert.equal(actions[2].type, 'input');
	assert.equal(actions[2].input, '');
});

await test('expresión que devuelve objeto/array en campo de texto → error claro', async () => {
	for (const bad of [{ nombre: 'Ana' }, [1, 2]]) {
		const { ctx } = executeCtx({
			params: { acciones: acciones([{ tipo: 'sendText', text: bad }]), autoInput: true },
		});
		await assert.rejects(() => enviarRespuesta.call(ctx), /returned an (object|array)/);
	}
	const varCase = executeCtx({
		params: {
			acciones: acciones([{ tipo: 'addVar', varname: 'x', varvalue: { a: 1 } }]),
			autoInput: true,
		},
	});
	await assert.rejects(() => enviarRespuesta.call(varCase.ctx), /returned an object/);
});

await test('IDs booleanos o arrays rechazados (no coerción fantasma)', async () => {
	for (const bad of [true, [5]]) {
		const { ctx } = executeCtx({
			params: { acciones: acciones([{ tipo: 'addTag', id_tag: bad }]), autoInput: true },
		});
		await assert.rejects(() => enviarRespuesta.call(ctx), /is not a valid ID/);
	}
});

await test('delegación elimina inputs configurados (gana la delegación)', async () => {
	const { ctx } = executeCtx({
		params: {
			acciones: acciones([
				{ tipo: 'sendText', text: 'Te transfiero' },
				{ tipo: 'input', input: '¿Algo más?' },
				{ tipo: 'teamDelegate', id_team: 3 },
			]),
			autoInput: true,
			respondWebhook: false,
		},
	});
	const actions = (await enviarRespuesta.call(ctx))[0][0].json.data.actions;
	assert.deepEqual(actions, [
		{ type: 'sendText', text: 'Te transfiero' },
		{ type: 'teamDelegate', id_team: 3 },
	]);
});

await test('userDelegate sin user_name → error en inglés con posición', async () => {
	const { ctx } = executeCtx({
		params: {
			acciones: acciones([{ tipo: 'userDelegate', id_user: 5, user_name: '' }]),
			autoInput: true,
		},
	});
	await assert.rejects(() => enviarRespuesta.call(ctx), /Action #1 \(Delegate to User\).*user_name/);
});

await test('IDs: castea "12"→12; rechaza "", "abc" y 0', async () => {
	const ok = executeCtx({
		params: { acciones: acciones([{ tipo: 'addTag', id_tag: '12' }]), autoInput: true },
	});
	const actions = (await enviarRespuesta.call(ok.ctx))[0][0].json.data.actions;
	assert.deepEqual(actions[0], { type: 'addTag', id_tag: 12 });

	for (const bad of ['', 'abc', 0, 3.5]) {
		const { ctx } = executeCtx({
			params: { acciones: acciones([{ tipo: 'addTag', id_tag: bad }]), autoInput: true },
		});
		await assert.rejects(() => enviarRespuesta.call(ctx), /Action #1 \(Add Tag\)/);
	}
});

await test('0 acciones: autoInput=true → keep-alive; false → error', async () => {
	const ok = executeCtx({ params: { acciones: {}, autoInput: true } });
	const actions = (await enviarRespuesta.call(ok.ctx))[0][0].json.data.actions;
	assert.deepEqual(actions, [{ type: 'input', input: '' }]);

	const bad = executeCtx({ params: { acciones: {}, autoInput: false } });
	await assert.rejects(() => enviarRespuesta.call(bad.ctx), /at least one action/);
});

await test('respondWebhook=false → no llama sendResponse, passthrough intacto', async () => {
	const { ctx, sent } = executeCtx({
		params: {
			acciones: acciones([{ tipo: 'sendText', text: 'Hola' }]),
			autoInput: true,
			respondWebhook: false,
		},
	});
	const out = await enviarRespuesta.call(ctx);
	assert.equal(sent.length, 0);
	assert.equal(out[0][0].json.data.actions.length, 2);
});

await test('2 items de entrada → 1 sola respuesta HTTP, 2 envelopes de salida', async () => {
	const { ctx, sent } = executeCtx({
		params: {
			acciones: acciones([{ tipo: 'sendText', text: 'Hola' }]),
			autoInput: true,
			respondWebhook: true,
		},
		items: [{ json: {} }, { json: {} }],
	});
	const out = await enviarRespuesta.call(ctx);
	assert.equal(sent.length, 1);
	assert.equal(out[0].length, 2);
});

await test('sendImage con URL inválida → error', async () => {
	for (const bad of ['no-es-url', 'ftp://x.com/a.jpg']) {
		const { ctx } = executeCtx({
			params: { acciones: acciones([{ tipo: 'sendImage', url: bad }]), autoInput: true },
		});
		await assert.rejects(() => enviarRespuesta.call(ctx), /valid http\(s\) URL/);
	}
});

await test('user_avatar vacío se omite; con URL se incluye', async () => {
	const sin = executeCtx({
		params: {
			acciones: acciones([{ tipo: 'userDelegate', id_user: 5, user_name: 'Ana', user_avatar: '' }]),
			autoInput: true,
		},
	});
	const a1 = (await enviarRespuesta.call(sin.ctx))[0][0].json.data.actions[0];
	assert.equal('user_avatar' in a1, false);

	const con = executeCtx({
		params: {
			acciones: acciones([
				{ tipo: 'userDelegate', id_user: 5, user_name: 'Ana', user_avatar: 'https://x.com/a.png' },
			]),
			autoInput: true,
		},
	});
	const a2 = (await enviarRespuesta.call(con.ctx))[0][0].json.data.actions[0];
	assert.equal(a2.user_avatar, 'https://x.com/a.png');
});

await test('acciones solo con claves del contrato (sin extras de la UI)', async () => {
	const { ctx } = executeCtx({
		params: {
			acciones: acciones([
				{ tipo: 'sendText', text: 'Hola', url: 'basura', id_tag: 99 },
				{ tipo: 'addVar', varname: 'x', varvalue: 'y', text: 'basura' },
				{ tipo: 'updateContact', key: 'email', value: 'a@b.co' },
			]),
			autoInput: true,
		},
	});
	const actions = (await enviarRespuesta.call(ctx))[0][0].json.data.actions;
	assert.deepEqual(Object.keys(actions[0]).sort(), ['text', 'type']);
	assert.deepEqual(Object.keys(actions[1]).sort(), ['type', 'varname', 'varvalue']);
	assert.deepEqual(Object.keys(actions[2]).sort(), ['key', 'type', 'value']);
});


// --- visibilidad de los campos del constructor ------------------------------------
// El autofix del escáner que alfabetizó este fixedCollection en 1.0.1 se llevó por
// delante los `displayOptions` de los 13 campos: el constructor pasó a mostrarlos TODOS
// a la vez, eligieras la acción que eligieras. Ninguna prueba lo vio porque todas
// miraban la lógica (toAction/applyClosingRule), no la UI. Esta lo mira.

const CAMPOS_POR_TIPO = {
	sendText: ['Type', 'Text'],
	sendImage: ['Type', 'URL'],
	sendFile: ['Type', 'URL'],
	addTag: ['Type', 'Tag ID'],
	userDelegate: ['Type', 'User Name or ID', 'User Name', 'User Avatar'],
	teamDelegate: ['Type', 'Team Name or ID'],
	addVar: ['Type', 'Variable Name', 'Variable Value'],
	setVar: ['Type', 'Variable Name', 'Variable Value'],
	input: ['Type', 'Question'],
	updateContact: ['Type', 'Contact Field', 'Field Value'],
};

const grupoAcciones = node.description.properties
	.find((p) => p.name === 'acciones')
	.options.find((o) => o.name === 'accion');

for (const [tipo, esperados] of Object.entries(CAMPOS_POR_TIPO)) {
	await test(`al elegir "${tipo}" solo se piden sus campos`, () => {
		// Dentro de un fixedCollection, displayOptions se evalúa contra los valores del
		// ÍTEM, no del nodo: por eso los `values` se pasan como nodeValues.
		const valores = { tipo };
		const nodo = { name: 'LC', type: 'x', typeVersion: 1, position: [0, 0], parameters: valores };
		const visibles = grupoAcciones.values
			.filter((v) => NodeHelpers.displayParameter(valores, v, nodo, node.description))
			.map((v) => v.displayName);
		assert.deepEqual(
			visibles.sort(),
			[...esperados].sort(),
			`con tipo=${tipo} se ven: ${visibles.join(', ')}`,
		);
	});
}

console.log(`\n${passed} pruebas de humo del recurso Callback Response OK`);
