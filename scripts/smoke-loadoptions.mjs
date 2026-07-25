#!/usr/bin/env node
/**
 * Prueba de humo de los selectores dinámicos (loadOptions).
 * Uso: npm run build && node scripts/smoke-loadoptions.mjs
 */
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const lo = require('../dist/nodes/LiveConnect/LoadOptions.js');

/** Mock de ILoadOptionsFunctions. */
function ctxFor({ response, params = {}, fail, credentials = {}, mint } = {}) {
	const calls = [];
	const mints = [];
	return {
		calls,
		mints,
		ctx: {
			getNode: () => ({ name: 'LiveConnect', type: 'liveConnect', typeVersion: 1 }),
			getCurrentNodeParameter: (path) => params[path],
			// lcList renueva el token antes de consultar (los selectores no pasan por el preSend).
			getCredentials: async () => credentials,
			helpers: {
				httpRequest: async (opts) => {
					mints.push(opts);
					return mint ?? { status: 1, data: { token: 'TOKEN-LO' } };
				},
				httpRequestWithAuthentication: async function (cred, opts) {
					calls.push({ cred, ...opts });
					if (fail) throw fail;
					return response;
				},
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

await test('getChannels: opciones "nombre (id)" ordenadas alfabéticamente', async () => {
	const { ctx, calls } = ctxFor({
		response: {
			status: 1,
			data: [
				{ id: 3, nombre: 'Web Chat' },
				{ id: 1, nombre: 'Instagram' },
				{ id: 2, nombre: 'WhatsApp Ventas' },
			],
		},
	});
	const options = await lo.getChannels.call(ctx);
	assert.deepEqual(options, [
		{ name: 'Instagram (1)', value: 1 },
		{ name: 'Web Chat (3)', value: 3 },
		{ name: 'WhatsApp Ventas (2)', value: 2 },
	]);
	assert.equal(calls[0].cred, 'liveConnectApi');
	assert.equal(calls[0].method, 'GET');
	assert.ok(calls[0].url.endsWith('/channels/list'));
});

await test('POST loaders mandan body vacío (pipelines, orígenes, canales de lead)', async () => {
	for (const [fn, endpoint] of [
		[lo.getPipelines, '/crm/getPipelines'],
		[lo.getLeadOrigins, '/crm/getLeadOrigins'],
		[lo.getLeadChannels, '/crm/getLeadChannels'],
	]) {
		const { ctx, calls } = ctxFor({ response: { status: 1, data: [{ id: 9, nombre: 'X' }] } });
		const options = await fn.call(ctx);
		assert.deepEqual(options, [{ name: 'X (9)', value: 9 }]);
		assert.equal(calls[0].method, 'POST');
		assert.ok(calls[0].url.endsWith(endpoint));
		assert.deepEqual(calls[0].body, {});
	}
});

await test('getStages exige el pipeline y lo manda como número', async () => {
	const sin = ctxFor({ response: { status: 1, data: [] } });
	await assert.rejects(() => lo.getStages.call(sin.ctx), /Selecciona primero el Pipeline/);

	const con = ctxFor({
		response: { status: 1, data: [{ id: 5, nombre: 'Ganado' }] },
		params: { resource: 'crm', operation: 'getStages', id_pipeline: '7' },
	});
	const options = await lo.getStages.call(con.ctx);
	assert.deepEqual(options, [{ name: 'Ganado (5)', value: 5 }]);
	assert.deepEqual(con.calls[0].body, { id_pipeline: 7 });
});

await test('dependencia dentro de una colección (deal.update → updateFields)', async () => {
	const { ctx, calls } = ctxFor({
		response: { status: 1, data: [{ id: 2, nombre: 'Contactado' }] },
		params: { resource: 'deal', operation: 'update', 'updateFields.id_pipeline': 4 },
	});
	await lo.getStages.call(ctx);
	assert.deepEqual(calls[0].body, { id_pipeline: 4 });
});

await test('la ruta se elige por contexto: un id_pipeline oculto de otra operación no gana', async () => {
	// n8n conserva los valores de campos ocultos al cambiar de operación: en deal.update
	// debe usarse updateFields.id_pipeline, NUNCA el top-level que quedó de deal.create.
	const { ctx, calls } = ctxFor({
		response: { status: 1, data: [{ id: 2, nombre: 'Contactado' }] },
		params: {
			resource: 'deal',
			operation: 'update',
			id_pipeline: 99, // residuo de otra operación
			'updateFields.id_pipeline': 4,
		},
	});
	await lo.getStages.call(ctx);
	assert.deepEqual(calls[0].body, { id_pipeline: 4 });

	// Y al revés: en deal.create manda el top-level aunque exista el de updateFields.
	const inverso = ctxFor({
		response: { status: 1, data: [] },
		params: {
			resource: 'deal',
			operation: 'create',
			id_pipeline: 7,
			'updateFields.id_pipeline': 99,
		},
	});
	await lo.getStages.call(inverso.ctx);
	assert.deepEqual(inverso.calls[0].body, { id_pipeline: 7 });
});

await test('campo dependiente con expresión → error explicativo, no NaN', async () => {
	const { ctx, calls } = ctxFor({
		response: { status: 1, data: [] },
		params: { resource: 'deal', operation: 'create', id_pipeline: '={{ $json.pipe }}' },
	});
	await assert.rejects(() => lo.getStages.call(ctx), /use una expresión/);
	assert.equal(calls.length, 0, 'no debe llamar al API con NaN');
});

await test('getWabaTemplates lee data.templates (respuesta anidada real del API)', async () => {
	const sin = ctxFor({ response: { status: 1, data: { templates: [] } } });
	await assert.rejects(() => lo.getWabaTemplates.call(sin.ctx), /Selecciona primero el Canal/);

	const con = ctxFor({
		// Forma REAL: data es un objeto { templates, paging }, no un array.
		response: {
			status: 1,
			data: {
				templates: [
					{ id: '123456789', name: 'bienvenida', language: 'es', status: 'APPROVED' },
					{ id: '987654321', name: 'aviso_pago', language: 'es_CO', status: 'PENDING' },
				],
				paging: false,
			},
		},
		params: { resource: 'waba', operation: 'sendTemplate', id_canal: 67095 },
	});
	const options = await lo.getWabaTemplates.call(con.ctx);
	// Aprobadas primero, luego alfabético.
	assert.deepEqual(options, [
		{ name: 'bienvenida (es)', value: '123456789' },
		{ name: 'aviso_pago (es_CO · PENDING)', value: '987654321' },
	]);
	assert.deepEqual(con.calls[0].body, { id_canal: 67095 });
});

await test('plantillas sin name: usa campos alternativos o el contenido, no el UUID', async () => {
	const { ctx } = ctxFor({
		response: {
			status: 1,
			data: {
				templates: [
					{ id: 'uuid-1', templateName: 'recordatorio_cita', status: 'APPROVED' },
					{ id: 'uuid-2', data: '{"name":"pago_recibido"}', status: 'APPROVED' },
					{ id: 'uuid-3', data: 'Hola {{1}}, tu pedido ya salió', status: 'APPROVED' },
					{ id: 'uuid-4', status: 'FAILED' },
				],
			},
		},
		params: { resource: 'waba', operation: 'sendTemplate', id_canal: 1 },
	});
	const options = await lo.getWabaTemplates.call(ctx);
	assert.deepEqual(options, [
		{ name: 'Hola {{1}}, tu pedido ya salió', value: 'uuid-3' },
		{ name: 'pago_recibido', value: 'uuid-2' },
		{ name: 'recordatorio_cita', value: 'uuid-1' },
		{ name: 'ID uuid-4 (FAILED)', value: 'uuid-4' },
	]);
});

await test('pickRows tolera array plano, objeto anidado y formas raras', async () => {
	// array plano (la mayoría de listados)
	const plano = ctxFor({ response: { status: 1, data: [{ id: 1, nombre: 'A' }] } });
	assert.equal((await lo.getChannels.call(plano.ctx)).length, 1);

	// objeto con clave desconocida que contiene el array
	const raro = ctxFor({ response: { status: 1, data: { cualquiera: [{ id: 2, nombre: 'B' }] } } });
	assert.deepEqual(await lo.getGroups.call(raro.ctx), [{ name: 'B (2)', value: 2 }]);

	// objeto sin ningún array → lista vacía, sin reventar
	const vacio = ctxFor({ response: { status: 1, data: { paging: false } } });
	assert.deepEqual(await lo.getUsers.call(vacio.ctx), []);
});

await test('canales filtrados por proveedor según el recurso (WABA vs QR)', async () => {
	const canales = {
		status: 1,
		data: [
			{ id: 1, nombre: 'Ventas WABA', proveedor: { tipo: 'wabags', nombre: 'WhatsApp Business' } },
			{ id: 2, nombre: 'Soporte QR', proveedor: { tipo: 'wapi', nombre: 'WhatsApp QR' } },
			{ id: 3, nombre: 'Web Chat', proveedor: { tipo: 'web', nombre: 'Chat Web' } },
		],
	};
	const waba = ctxFor({ response: canales });
	assert.deepEqual(await lo.getWabaChannels.call(waba.ctx), [{ name: 'Ventas WABA (1)', value: 1 }]);

	const qr = ctxFor({ response: canales });
	assert.deepEqual(await lo.getWhatsAppChannels.call(qr.ctx), [{ name: 'Soporte QR (2)', value: 2 }]);

	// Sin coincidencias (el API no devuelve proveedor) → se muestran todos, nunca vacío.
	const sinProveedor = ctxFor({
		response: { status: 1, data: [{ id: 9, nombre: 'Canal Genérico' }] },
	});
	assert.deepEqual(await lo.getWabaChannels.call(sinProveedor.ctx), [
		{ name: 'Canal Genérico (9)', value: 9 },
	]);
});

await test('nombres opacos de Meta ceden ante el contenido de la plantilla', async () => {
	const { ctx } = ctxFor({
		response: {
			status: 1,
			data: {
				templates: [
					{
						id: 'a1',
						name: '667058365993373_67d4976c2921a_6360',
						data: 'Hola {{1}}, tu cita quedó confirmada',
						category: 'MARKETING',
						status: 'APPROVED',
					},
					// Opaco y sin contenido: se conserva el identificador, no se pierde la opción.
					{ id: 'a2', name: '667058365993373_67d4976c2921a_9999', status: 'APPROVED' },
				],
			},
		},
		params: { resource: 'waba', operation: 'sendTemplate', id_canal: 1 },
	});
	const options = await lo.getWabaTemplates.call(ctx);
	const byValue = Object.fromEntries(options.map((o) => [o.value, o.name]));
	assert.equal(byValue.a1, 'Hola {{1}}, tu cita quedó confirmada (marketing)');
	assert.equal(byValue.a2, '667058365993373_67d4976c2921a_9999');
});

await test('envelope con status<0 → error con el mensaje del API', async () => {
	const { ctx } = ctxFor({ response: { status: -5, status_message: 'Sin permisos' } });
	await assert.rejects(() => lo.getUsers.call(ctx), /Sin permisos.*status -5/);
});

await test('data no-array o vacía → lista vacía, sin reventar', async () => {
	for (const data of [undefined, null, {}, 'texto']) {
		const { ctx } = ctxFor({ response: { status: 1, data } });
		assert.deepEqual(await lo.getGroups.call(ctx), []);
	}
});

await test('el selector renueva el token vencido antes de consultar (bug del -403)', async () => {
	const b64 = (o) => Buffer.from(JSON.stringify(o)).toString('base64url');
	const expirado = `${b64({ alg: 'HS256' })}.${b64({ exp: Math.floor(Date.now() / 1000) - 10 })}.firma`;
	const { ctx, calls, mints } = ctxFor({
		response: { status: 1, data: [{ id: 1, nombre: 'Canal' }] },
		credentials: { cKey: 'cuenta-selector', privateKey: 'PK', sessionToken: expirado },
	});
	await lo.getChannels.call(ctx);
	assert.equal(mints.length, 1, 'debe emitir un token nuevo');
	assert.equal(calls[0].headers.PageGearToken, 'TOKEN-LO', 'debe sembrar el token fresco');
});

await test('status -403 del selector → mensaje de token expirado', async () => {
	const { ctx } = ctxFor({
		response: { status: -403, status_message: 'Token no valido!' },
		credentials: { cKey: 'cuenta-403-selector', privateKey: 'PK', sessionToken: 'x' },
	});
	await assert.rejects(() => lo.getUsers.call(ctx), /token de sesión de LiveConnect expiró/);
});

await test('fallo de red / credencial ausente → mensaje accionable', async () => {
	const { ctx } = ctxFor({ fail: new Error('Credentials not found') });
	await assert.rejects(
		() => lo.getCategories.call(ctx),
		/No se pudo cargar la lista desde LiveConnect/,
	);
});

await test('filas sin nombre o sin id se manejan con gracia', async () => {
	const { ctx } = ctxFor({
		response: {
			status: 1,
			data: [{ id: 4 }, { id: null, nombre: 'Fantasma' }, { id: 6, nombre: '  ' }],
		},
	});
	const options = await lo.getAssistants.call(ctx);
	assert.deepEqual(options, [
		{ name: 'ID 4', value: 4 },
		{ name: 'ID 6', value: 6 },
	]);
});

console.log(`\n${passed} pruebas de humo de selectores OK`);
