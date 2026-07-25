#!/usr/bin/env node
/**
 * Prueba de humo del campo "Datos de la Plantilla" (WABA).
 * Uso: npm run build && node scripts/smoke-template-fields.mjs
 *
 * Cubre el parser de los `components` de Meta y el reparto de los valores editados
 * a las propiedades del body que espera el API.
 */
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const tf = require('../dist/nodes/LiveConnect/TemplateFields.js');
const { applyTemplateData } = require('../dist/nodes/LiveConnect/GenericFunctions.js');
const lo = require('../dist/nodes/LiveConnect/LoadOptions.js');

let passed = 0;
const test = async (name, fn) => {
	await fn();
	passed++;
	console.log(`✓ ${name}`);
};

// Plantilla real de Meta: encabezado con imagen, cuerpo con 2 variables y botón con URL dinámica.
const PLANTILLA = {
	id: 'tpl_1',
	name: 'confirmacion_cita',
	language: 'es',
	status: 'APPROVED',
	components: [
		{ type: 'HEADER', format: 'IMAGE', example: { header_handle: ['https://cdn.test/foto.jpg'] } },
		{
			type: 'BODY',
			text: 'Hola {{1}}, tu cita es el {{2}}.',
			example: { body_text: [['Ana', '12 de mayo']] },
		},
		{
			type: 'BUTTONS',
			buttons: [
				{ type: 'URL', text: 'Ver cita', url: 'https://test.co/c/{{1}}', example: ['https://test.co/c/999'] },
				{ type: 'PHONE_NUMBER', text: 'Llamar', phone_number: '+571234567' },
			],
		},
	],
};

await test('parser: campos con los ejemplos de Meta como valor por defecto', () => {
	const { fields, headerFormat } = tf.buildTemplateLayout(PLANTILLA);
	assert.equal(headerFormat, 'IMAGE');
	assert.deepEqual(
		fields.map((f) => [f.id, f.displayName, f.defaultValue]),
		[
			['header_media_IMAGE', 'Encabezado · URL de imagen', 'https://cdn.test/foto.jpg'],
			['body_1', 'Cuerpo · variable {{1}}', 'Ana'],
			['body_2', 'Cuerpo · variable {{2}}', '12 de mayo'],
			['button_1', 'Botón · Ver cita', 'https://test.co/c/999'],
		],
	);
	// El botón de teléfono no lleva parámetro dinámico: no genera campo.
	assert.equal(fields.filter((f) => f.id.startsWith('button_')).length, 1);
	assert.ok(fields.every((f) => f.display === true && f.type === 'string'));
});

await test('parser: encabezado de texto y variables sin ejemplo se listan igual', () => {
	const { fields, headerFormat } = tf.buildTemplateLayout({
		components: [
			{ type: 'HEADER', format: 'TEXT', text: 'Pedido {{1}}' },
			{ type: 'BODY', text: 'Hola {{1}}, van {{2}} de {{3}}.' },
		],
	});
	assert.equal(headerFormat, 'TEXT');
	assert.deepEqual(
		fields.map((f) => f.id),
		['header_1', 'body_1', 'body_2', 'body_3'],
	);
	// Sin example: se listan igual (son obligatorias) pero sin valor precargado.
	assert.ok(fields.every((f) => f.defaultValue === undefined));
});

await test('parser: plantilla sin variables → sin campos', () => {
	const { fields } = tf.buildTemplateLayout({
		components: [{ type: 'BODY', text: 'Gracias por escribirnos.' }],
	});
	assert.deepEqual(fields, []);
});

await test('parser: tolera components ausentes, vacíos o con basura', () => {
	for (const plantilla of [{}, { components: [] }, { components: [null, 'x', 5] }]) {
		assert.deepEqual(tf.buildTemplateLayout(plantilla).fields, []);
	}
});

await test('parser: botones fuera de components (variante del API)', () => {
	const { fields } = tf.buildTemplateLayout({
		components: [{ type: 'BODY', text: 'Hola' }],
		buttons: [{ type: 'URL', text: 'Pagar', url: 'https://p.co/{{1}}', example: ['https://p.co/1'] }],
	});
	assert.deepEqual(
		fields.map((f) => [f.id, f.defaultValue]),
		[['button_1', 'https://p.co/1']],
	);
});

await test('countPlaceholders cuenta variables reales', () => {
	assert.equal(tf.countPlaceholders('Hola {{1}}, van {{2}} de {{3}}'), 3);
	assert.equal(tf.countPlaceholders('Sin variables'), 0);
	assert.equal(tf.countPlaceholders('Repetida {{1}} y {{1}}'), 1);
	assert.equal(tf.countPlaceholders('Con espacios {{ 2 }}'), 2);
});

// --- estructura JSON editable (formato actual) ---

await test('buildTemplateExample: estructura estilo Meta con los ejemplos', () => {
	assert.deepEqual(tf.buildTemplateExample(PLANTILLA), {
		header: { type: 'image', url: 'https://cdn.test/foto.jpg' },
		body: ['Ana', '12 de mayo'],
		buttons: [{ index: 0, type: 'url', parameter: 'https://test.co/c/999' }],
	});
});

await test('buildTemplateExample: encabezado de texto y variables sin ejemplo', () => {
	assert.deepEqual(
		tf.buildTemplateExample({
			components: [
				{ type: 'HEADER', format: 'TEXT', text: 'Pedido {{1}}', example: { header_text: ['A-123'] } },
				{ type: 'BODY', text: 'Hola {{1}} y {{2}}' },
			],
		}),
		{ header: { type: 'text', variables: ['A-123'] }, body: ['', ''] },
	);
});

await test('buildTemplateExample: plantilla sin variables → objeto vacío', () => {
	assert.deepEqual(tf.buildTemplateExample({ components: [{ type: 'BODY', text: 'Gracias.' }] }), {});
});

await test('templateExampleToBody: traduce a las propiedades del API', () => {
	assert.deepEqual(
		tf.templateExampleToBody({
			header: { type: 'image', url: 'https://cdn.test/f.jpg' },
			body: ['Ana'],
			buttons: [{ index: 0, type: 'url', parameter: 'https://x.co/1' }],
		}),
		{
			variables: ['Ana'],
			url_imagen_encabezado: 'https://cdn.test/f.jpg',
			buttons: [{ index: 0, type: 'url', parameter: 'https://x.co/1' }],
		},
	);

	// Encabezado de texto → variables_encabezado
	assert.deepEqual(tf.templateExampleToBody({ header: { type: 'text', variables: ['A-1'] } }), {
		variables_encabezado: ['A-1'],
	});

	// Video y documento a su propiedad
	assert.deepEqual(tf.templateExampleToBody({ header: { type: 'video', url: 'https://v.mp4' } }), {
		url_video_encabezado: 'https://v.mp4',
	});
	assert.deepEqual(tf.templateExampleToBody({ header: { type: 'document', url: 'https://d.pdf' } }), {
		url_documento_encabezado: 'https://d.pdf',
	});

	// Estructura vacía → body vacío
	assert.deepEqual(tf.templateExampleToBody({}), {});
});

// --- reparto al body (preSend) ---
function executeCtx({ datos, body = {} }) {
	return {
		getNodeParameter: (name, fallback) => (name === 'datos_plantilla' ? datos : fallback),
		getNode: () => ({ name: 'test' }),
	};
}

await test('preSend: JSON de la plantilla (string) → propiedades del body', async () => {
	const ctx = executeCtx({
		datos: {
			mappingMode: 'defineBelow',
			value: {
				datos: JSON.stringify({
					header: { type: 'image', url: 'https://cdn.test/foto.jpg' },
					body: ['Ana', '12 de mayo'],
					buttons: [{ index: 0, type: 'url', parameter: 'https://test.co/c/999' }],
				}),
			},
		},
	});
	const out = await applyTemplateData.call(ctx, { body: { id_canal: 1 } });
	assert.deepEqual(out.body.variables, ['Ana', '12 de mayo']);
	assert.equal(out.body.url_imagen_encabezado, 'https://cdn.test/foto.jpg');
	assert.deepEqual(out.body.buttons, [{ index: 0, type: 'url', parameter: 'https://test.co/c/999' }]);
	assert.equal(out.body.id_canal, 1);
});

await test('preSend: JSON ya parseado (objeto) también funciona', async () => {
	const ctx = executeCtx({
		datos: { value: { datos: { body: ['Ana'] } } },
	});
	const out = await applyTemplateData.call(ctx, { body: {} });
	assert.deepEqual(out.body.variables, ['Ana']);
});

await test('preSend: JSON inválido → error claro en español', async () => {
	const ctx = executeCtx({ datos: { value: { datos: '{ body: [ roto' } } });
	await assert.rejects(
		() => applyTemplateData.call(ctx, { body: {} }),
		/no es un JSON válido/,
	);
});

await test('preSend: JSON vacío no toca el body', async () => {
	for (const datos of ['', '   ']) {
		const ctx = executeCtx({ datos: { value: { datos } } });
		const out = await applyTemplateData.call(ctx, { body: { id_canal: 1 } });
		assert.deepEqual(out.body, { id_canal: 1 });
	}
});

await test('preSend: Campos Adicionales ganan sobre el JSON', async () => {
	const ctx = executeCtx({
		datos: { value: { datos: JSON.stringify({ body: ['Ejemplo'] }) } },
	});
	const out = await applyTemplateData.call(ctx, { body: { variables: ['MIO'] } });
	assert.deepEqual(out.body.variables, ['MIO']);
});

await test('preSend [compatibilidad v0.6.0]: reparte variables, encabezado y botones', async () => {
	const ctx = executeCtx({
		datos: {
			mappingMode: 'defineBelow',
			value: {
				body_1: 'Ana',
				body_2: '12 de mayo',
				header_media_IMAGE: 'https://cdn.test/foto.jpg',
				button_1: 'https://test.co/c/999',
			},
		},
	});
	const out = await applyTemplateData.call(ctx, { body: { id_canal: 1, numero: '57300' } });
	assert.deepEqual(out.body.variables, ['Ana', '12 de mayo']);
	assert.equal(out.body.url_imagen_encabezado, 'https://cdn.test/foto.jpg');
	assert.deepEqual(out.body.buttons, [{ index: 0, parameter: 'https://test.co/c/999' }]);
	// No pisa lo que ya venía.
	assert.equal(out.body.id_canal, 1);
});

await test('preSend: orden estable con 10+ variables (body_2 antes que body_10)', async () => {
	const value = {};
	for (let i = 1; i <= 11; i++) value[`body_${i}`] = `v${i}`;
	const ctx = executeCtx({ datos: { value } });
	const out = await applyTemplateData.call(ctx, { body: {} });
	assert.deepEqual(out.body.variables, ['v1','v2','v3','v4','v5','v6','v7','v8','v9','v10','v11']);
});

await test('preSend: lo escrito en Campos Adicionales tiene prioridad', async () => {
	const ctx = executeCtx({
		datos: { value: { body_1: 'Ejemplo', header_media_IMAGE: 'https://cdn.test/ejemplo.jpg' } },
	});
	const out = await applyTemplateData.call(ctx, {
		body: { variables: ['MIO'], url_imagen_encabezado: 'https://mio.jpg' },
	});
	assert.deepEqual(out.body.variables, ['MIO']);
	assert.equal(out.body.url_imagen_encabezado, 'https://mio.jpg');
});

await test('preSend: la URL del encabezado va a la propiedad según el tipo de medio', async () => {
	const casos = [
		['https://cdn.test/f.jpg', 'url_imagen_encabezado'],
		['https://cdn.test/v.mp4', 'url_video_encabezado'],
		['https://cdn.test/d.pdf?x=1', 'url_documento_encabezado'],
	];
	for (const [url, propiedad] of casos) {
		const ctx = executeCtx({ datos: { value: { header_media: url } } }); // sin formato declarado → se infiere
		const out = await applyTemplateData.call(ctx, { body: {} });
		assert.equal(out.body[propiedad], url, `${url} → ${propiedad}`);
	}
});

await test('preSend: el formato declarado por la plantilla gana sobre la extensión', async () => {
	// URL sin extensión reconocible (típico de los handles de Meta): sin el formato del
	// ID se asumiría imagen; el ID dice DOCUMENT y debe respetarse.
	const ctx = executeCtx({
		datos: { value: { header_media_DOCUMENT: 'https://cdn.test/handle/abc123' } },
	});
	const out = await applyTemplateData.call(ctx, { body: {} });
	assert.equal(out.body.url_documento_encabezado, 'https://cdn.test/handle/abc123');
	assert.equal(out.body.url_imagen_encabezado, undefined);
});

await test('preSend: sin datos configurados no toca el body', async () => {
	for (const datos of [undefined, {}, { value: null }, { value: {} }]) {
		const ctx = executeCtx({ datos });
		const original = { body: { id_canal: 1 } };
		const out = await applyTemplateData.call(ctx, original);
		assert.deepEqual(out.body, { id_canal: 1 });
	}
});

// --- resourceMapping ---
await test('getTemplateFields devuelve lista vacía sin canal o plantilla', async () => {
	const ctx = {
		getNode: () => ({ name: 'test' }),
		getCurrentNodeParameter: () => undefined,
		getCredentials: async () => ({}),
		helpers: {
			httpRequest: async () => ({ status: 1, data: { token: 'T' } }),
			httpRequestWithAuthentication: async () => {
				throw new Error('no debería consultar el API sin plantilla');
			},
		},
	};
	assert.deepEqual(await lo.getTemplateFields.call(ctx), { fields: [] });
});

await test('getTemplateFields devuelve UN campo object con el JSON prellenado', async () => {
	const params = { resource: 'waba', operation: 'sendTemplate', id_canal: 4695, id_plantilla: 'tpl_1' };
	const ctx = {
		getNode: () => ({ name: 'test' }),
		getCurrentNodeParameter: (path) => params[path],
		getCredentials: async () => ({}),
		helpers: {
			httpRequest: async () => ({ status: 1, data: { token: 'T' } }),
			httpRequestWithAuthentication: async () => ({ status: 1, data: PLANTILLA }),
		},
	};
	const { fields } = await lo.getTemplateFields.call(ctx);
	assert.equal(fields.length, 1);
	assert.equal(fields[0].id, 'datos');
	assert.equal(fields[0].type, 'object', 'type object → n8n lo renderiza como editor JSON');
	assert.deepEqual(JSON.parse(fields[0].defaultValue), {
		header: { type: 'image', url: 'https://cdn.test/foto.jpg' },
		body: ['Ana', '12 de mayo'],
		buttons: [{ index: 0, type: 'url', parameter: 'https://test.co/c/999' }],
	});
});

await test('getTemplateFields consulta getTemplate con el canal y la plantilla', async () => {
	const calls = [];
	const params = { resource: 'waba', operation: 'sendTemplate', id_canal: 4695, id_plantilla: 'tpl_1' };
	const ctx = {
		getNode: () => ({ name: 'test' }),
		getCurrentNodeParameter: (path) => params[path],
		getCredentials: async () => ({}),
		helpers: {
			httpRequest: async () => ({ status: 1, data: { token: 'T' } }),
			httpRequestWithAuthentication: async (_cred, opts) => {
				calls.push(opts);
				return { status: 1, data: PLANTILLA };
			},
		},
	};
	const { fields } = await lo.getTemplateFields.call(ctx);
	assert.ok(calls[0].url.endsWith('/direct/waba/getTemplate'));
	assert.deepEqual(calls[0].body, { id_canal: 4695, id: 'tpl_1' });
	assert.equal(fields.length, 1);
});

console.log(`\n${passed} pruebas de humo de plantillas OK`);
