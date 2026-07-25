#!/usr/bin/env node
/**
 * Prueba de humo de la renovación del token de sesión (fix del status -403).
 * Uso: npm run build && node scripts/smoke-token.mjs
 *
 * Cubre las dos capas:
 *  - proactiva: refreshTokenIfExpired renueva antes de que el JWT venza
 *  - reactiva:  handleLcResponse con status -403 quema el token en caché
 */
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { refreshTokenIfExpired, handleLcResponse, getJwtExpiry, extractSessionToken } = require('../dist/nodes/LiveConnect/GenericFunctions.js');

const b64 = (o) => Buffer.from(JSON.stringify(o)).toString('base64url');
const jwt = (exp) => `${b64({ alg: 'HS256', typ: 'JWT' })}.${b64({ exp })}.firma`;
const now = () => Math.floor(Date.now() / 1000);

/** Mock de IExecuteSingleFunctions con solo lo que tocan el preSend y el postReceive. */
function ctxFor({ cKey, sessionToken, mint, fullResponse = false }) {
	const calls = [];
	return {
		calls,
		ctx: {
			getNode: () => ({ name: 'LiveConnect', type: 'liveConnect', typeVersion: 1 }),
			getCredentials: async () => ({ cKey, privateKey: 'PK', sessionToken }),
			getNodeParameter: () => fullResponse,
			helpers: {
				httpRequest: async (opts) => {
					calls.push(opts);
					if (mint instanceof Error) throw mint;
					return typeof mint === 'function' ? mint(calls.length) : mint;
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

await test('getJwtExpiry lee exp y tolera basura', () => {
	const exp = now() + 300;
	assert.equal(getJwtExpiry(jwt(exp)), exp);
	assert.equal(getJwtExpiry('no-es-un-jwt'), undefined);
	assert.equal(getJwtExpiry('a.b.c'), undefined);
});

await test('extractSessionToken rechaza el JWT anónimo de las respuestas con status<0', () => {
	assert.throws(
		() => extractSessionToken({ status: -2, status_message: 'Se require un cKey', PageGearToken: 'ANONIMO' }),
		/status -2/,
	);
	assert.equal(extractSessionToken({ status: 1, data: { token: 'A' } }), 'A');
	assert.equal(extractSessionToken({ status: 1, PageGearToken: 'B' }), 'B');
	assert.equal(extractSessionToken({ status: 1, data: 'C' }), 'C');
});

await test('token vigente → no emite y no siembra header', async () => {
	const { ctx, calls } = ctxFor({ cKey: 'cuenta-vigente', sessionToken: jwt(now() + 600) });
	const out = await refreshTokenIfExpired.call(ctx, { url: '/x', headers: {} });
	assert.equal(calls.length, 0);
	assert.equal(out.headers?.PageGearToken, undefined);
});

await test('token expirado → emite y siembra el header', async () => {
	const { ctx, calls } = ctxFor({
		cKey: 'cuenta-expirada',
		sessionToken: jwt(now() - 10),
		mint: { status: 1, data: { token: 'NUEVO' } },
	});
	const out = await refreshTokenIfExpired.call(ctx, { url: '/x', headers: {} });
	assert.equal(calls.length, 1);
	assert.equal(calls[0].url.endsWith('/account/token'), true);
	assert.deepEqual(calls[0].body, { cKey: 'cuenta-expirada', privateKey: 'PK' });
	assert.equal(out.headers.PageGearToken, 'NUEVO');
});

await test('dentro del margen de 60 s → renueva igual', async () => {
	const { ctx, calls } = ctxFor({
		cKey: 'cuenta-margen',
		sessionToken: jwt(now() + 30),
		mint: { status: 1, data: { token: 'NUEVO' } },
	});
	const out = await refreshTokenIfExpired.call(ctx, { url: '/x', headers: {} });
	assert.equal(calls.length, 1);
	assert.equal(out.headers.PageGearToken, 'NUEVO');
});

await test('token nuevo en el campo raíz PageGearToken', async () => {
	const { ctx } = ctxFor({
		cKey: 'cuenta-raiz',
		sessionToken: jwt(now() - 10),
		mint: { status: 1, PageGearToken: 'DESDE-RAIZ' },
	});
	const out = await refreshTokenIfExpired.call(ctx, { url: '/x', headers: {} });
	assert.equal(out.headers.PageGearToken, 'DESDE-RAIZ');
});

await test('refresh con status<0 → error claro y jamás usa el JWT anónimo', async () => {
	const { ctx } = ctxFor({
		cKey: 'cuenta-keys-malas',
		sessionToken: jwt(now() - 10),
		mint: { status: -2, status_message: 'Se require un cKey y un privateKey', PageGearToken: 'ANONIMO' },
	});
	await assert.rejects(
		() => refreshTokenIfExpired.call(ctx, { url: '/x', headers: {} }),
		(err) => /status -2/.test(err.message + (err.description ?? '')) && !/ANONIMO/.test(JSON.stringify(err.description ?? '')),
	);
});

await test('red caída al renovar → NodeOperationError accionable', async () => {
	const { ctx } = ctxFor({
		cKey: 'cuenta-sin-red',
		sessionToken: jwt(now() - 10),
		mint: new Error('ECONNREFUSED'),
	});
	await assert.rejects(
		() => refreshTokenIfExpired.call(ctx, { url: '/x', headers: {} }),
		/No se pudo renovar el token de sesión/,
	);
});

await test('5 preSend concurrentes → una sola emisión', async () => {
	const { ctx, calls } = ctxFor({
		cKey: 'cuenta-concurrente',
		sessionToken: jwt(now() - 10),
		mint: { status: 1, data: { token: 'UNICO' } },
	});
	const outs = await Promise.all(
		Array.from({ length: 5 }, () => refreshTokenIfExpired.call(ctx, { url: '/x', headers: {} })),
	);
	assert.equal(calls.length, 1);
	for (const out of outs) assert.equal(out.headers.PageGearToken, 'UNICO');
});

await test('caché entre ítems: el segundo preSend reutiliza el token emitido', async () => {
	const shared = { cKey: 'cuenta-cache', sessionToken: jwt(now() - 10), mint: { status: 1, data: { token: jwt(now() + 600) } } };
	const a = ctxFor(shared);
	await refreshTokenIfExpired.call(a.ctx, { url: '/x', headers: {} });
	assert.equal(a.calls.length, 1);

	const b = ctxFor(shared);
	const out = await refreshTokenIfExpired.call(b.ctx, { url: '/y', headers: {} });
	assert.equal(b.calls.length, 0, 'debe usar el token en caché, no emitir otro');
	assert.equal(typeof out.headers.PageGearToken, 'string');
});

await test('capa reactiva: JWT sin exp + status -403 fuerza la renovación siguiente', async () => {
	const cKey = 'cuenta-sin-exp';
	// 1) token ilegible: no se puede saber que venció → no emite
	const first = ctxFor({ cKey, sessionToken: 'no-es-un-jwt' });
	await refreshTokenIfExpired.call(first.ctx, { url: '/x', headers: {} });
	assert.equal(first.calls.length, 0);

	// 2) el API responde -403 → se quema el token
	const burner = ctxFor({ cKey, sessionToken: 'no-es-un-jwt' });
	await assert.rejects(
		() =>
			handleLcResponse.call(burner.ctx, [], {
				statusCode: 200,
				body: { status: -403, status_message: 'Token no valido!' },
				headers: {},
			}),
		/token de sesión de LiveConnect no es válido o expiró/,
	);

	// 3) el siguiente preSend SÍ emite uno nuevo
	const second = ctxFor({ cKey, sessionToken: 'no-es-un-jwt', mint: { status: 1, data: { token: 'RECUPERADO' } } });
	const out = await refreshTokenIfExpired.call(second.ctx, { url: '/x', headers: {} });
	assert.equal(second.calls.length, 1);
	assert.equal(out.headers.PageGearToken, 'RECUPERADO');
});

await test('handleLcResponse: -403 no falsea el 401 y otros status siguen genéricos', async () => {
	const { ctx } = ctxFor({ cKey: 'cuenta-403', sessionToken: jwt(now() + 600) });
	await assert.rejects(
		() => handleLcResponse.call(ctx, [], { statusCode: 200, body: { status: -403 }, headers: {} }),
		(err) => err.httpCode === '200' || String(err.httpCode ?? '') === '200',
	);
	await assert.rejects(
		() =>
			handleLcResponse.call(ctx, [], {
				statusCode: 200,
				body: { status: -7, status_message: 'Otro error' },
				headers: {},
			}),
		/Otro error/,
	);
});

console.log(`\n${passed} pruebas de humo del token OK`);
