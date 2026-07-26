#!/usr/bin/env node
/**
 * Prueba de humo de "Enviar Plantilla" (WABA).
 * Uso: npm run build && node scripts/smoke-template-fields.mjs
 *
 * Cubre el parser de los `components` de Meta, la etiqueta del selector de plantillas
 * y el preSend que valida y coloca los datos en el cuerpo de la petición.
 */
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const tf = require('../dist/nodes/LiveConnect/TemplateFields.js');
const { prepareTemplateSend } = require('../dist/nodes/LiveConnect/GenericFunctions.js');
const lo = require('../dist/nodes/LiveConnect/LoadOptions.js');

let passed = 0;
const test = async (name, fn) => {
	await fn();
	passed++;
	console.log(`✓ ${name}`);
};

// Plantilla real de Meta: encabezado con imagen, cuerpo con 2 variables y botón dinámico.
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

const PLANTILLA_SIMPLE = {
	id: 'tpl_2',
	name: 'aviso',
	language: 'es',
	status: 'APPROVED',
	components: [{ type: 'BODY', text: 'Tu pedido ya salió.' }],
};

// --- parser ---

await test('parser: campos con los ejemplos de Meta', () => {
	const { fields, headerFormat } = tf.buildTemplateLayout(PLANTILLA);
	assert.equal(headerFormat, 'IMAGE');
	assert.deepEqual(
		fields.map((f) => [f.id, f.defaultValue]),
		[
			['header_media_IMAGE', 'https://cdn.test/foto.jpg'],
			['body_1', 'Ana'],
			['body_2', '12 de mayo'],
			['button_1', 'https://test.co/c/999'],
		],
	);
});

await test('parser: variables sin ejemplo se listan igual', () => {
	const { fields } = tf.buildTemplateLayout({
		components: [{ type: 'BODY', text: 'Hola {{1}}, van {{2}} de {{3}}.' }],
	});
	assert.deepEqual(fields.map((f) => f.id), ['body_1', 'body_2', 'body_3']);
	assert.ok(fields.every((f) => f.defaultValue === undefined));
});

await test('parser: tolera components ausentes, vacíos o con basura', () => {
	for (const plantilla of [{}, { components: [] }, { components: [null, 'x', 5] }]) {
		assert.deepEqual(tf.buildTemplateLayout(plantilla).fields, []);
	}
});

await test('countPlaceholders cuenta variables reales', () => {
	assert.equal(tf.countPlaceholders('Hola {{1}}, van {{2}} de {{3}}'), 3);
	assert.equal(tf.countPlaceholders('Sin variables'), 0);
	assert.equal(tf.countPlaceholders('Repetida {{1}} y {{1}}'), 1);
	assert.equal(tf.countPlaceholders('Con espacios {{ 2 }}'), 2);
});

// --- etiqueta del selector: debe decir qué necesita la plantilla ---

function optionsCtx(templates) {
	return {
		getNode: () => ({ name: 'test' }),
		getCurrentNodeParameter: (path) =>
			({ resource: 'waba', operation: 'sendTemplate', id_canal: 1 })[path],
		getCredentials: async () => ({}),
		helpers: {
			httpRequest: async () => ({ status: 1, data: { token: 'T' } }),
			httpRequestWithAuthentication: async () => ({ status: 1, data: { templates } }),
		},
	};
}

await test('selector: la etiqueta dice cuántas variables y qué medio pide', async () => {
	const options = await lo.getWabaTemplates.call(optionsCtx([PLANTILLA, PLANTILLA_SIMPLE]));
	const nombres = options.map((o) => o.name);
	assert.ok(nombres.includes('confirmacion_cita · es · 2 variables · imagen · botón'), nombres.join(' , '));
	assert.ok(nombres.includes('aviso · es · sin variables'), nombres.join(' , '));
});

await test('selector: sin components cuenta las variables del texto del cuerpo', async () => {
	const options = await lo.getWabaTemplates.call(
		optionsCtx([{ id: 'x', name: 'promo', language: 'es', data: 'Hola {{1}}, {{2}}' }]),
	);
	assert.match(options[0].name, /2 variables/);
});

// --- valor codificado del selector (controla qué campos se ven) ---

await test('valor del selector: codifica y decodifica lo que pide la plantilla', () => {
	assert.equal(tf.encodeTemplateValue('confirmacion_cita', 2, 'IMAGE'), 'confirmacion_cita|v2|IMAGE');
	assert.deepEqual(tf.decodeTemplateValue('confirmacion_cita|v2|IMAGE'), {
		identificador: 'confirmacion_cita',
		variables: 2,
		headerFormat: 'IMAGE',
	});
	// Sin variables ni medio: los campos se ocultan por displayOptions.
	assert.deepEqual(tf.decodeTemplateValue('aviso|v0|NONE'), {
		identificador: 'aviso',
		variables: 0,
		headerFormat: 'NONE',
	});
	// Valor antiguo (solo el identificador): se usa tal cual.
	assert.deepEqual(tf.decodeTemplateValue('667058365993373_67d4976c2921a_6360'), {
		identificador: '667058365993373_67d4976c2921a_6360',
	});
	// Un nombre con "|" no rompe el identificador.
	assert.equal(tf.decodeTemplateValue('raro|nombre|v1|TEXT').identificador, 'raro|nombre');
});

await test('selector: el valor lleva el nombre, las variables y el formato', async () => {
	const options = await lo.getWabaTemplates.call(optionsCtx([PLANTILLA, PLANTILLA_SIMPLE]));
	const valores = options.map((o) => o.value);
	assert.ok(valores.includes('confirmacion_cita|v2|IMAGE'), valores.join(' , '));
	assert.ok(valores.includes('aviso|v0|NONE'), valores.join(' , '));
});

// --- preSend ---

function executeCtx({ params = {}, template = PLANTILLA, falla = false } = {}) {
	const calls = [];
	return {
		calls,
		ctx: {
			getNode: () => ({ name: 'test' }),
			getNodeParameter: (name, fallback) => params[name] ?? fallback,
			getCredentials: async () => ({}),
			helpers: {
				httpRequest: async () => ({ status: 1, data: { token: 'T' } }),
				httpRequestWithAuthentication: async (_cred, opts) => {
					calls.push(opts);
					if (falla) throw new Error('API caída');
					return { status: 1, data: template };
				},
			},
		},
	};
}

await test('preSend: variables en orden van al cuerpo', async () => {
	const { ctx } = executeCtx({
		params: { id_canal: 1, id_plantilla: 'tpl_1', variables: 'Ana, 12 de mayo', url_encabezado: 'https://cdn.test/f.jpg' },
	});
	const out = await prepareTemplateSend.call(ctx, { body: { numero: '57300' } });
	assert.deepEqual(out.body.variables, ['Ana', '12 de mayo']);
	assert.equal(out.body.url_imagen_encabezado, 'https://cdn.test/f.jpg');
	assert.equal(out.body.numero, '57300');
});

await test('preSend: envía el NOMBRE de la plantilla, no el ID largo de Meta', async () => {
	const { ctx } = executeCtx({
		params: {
			id_canal: 1,
			id_plantilla: '667058365993373_67d4976c2921a_6360',
			variables: 'Ana, 12 de mayo',
			url_encabezado: 'https://cdn.test/f.jpg',
		},
	});
	const out = await prepareTemplateSend.call(ctx, {
		body: { id_plantilla: '667058365993373_67d4976c2921a_6360' },
	});
	assert.equal(out.body.id_plantilla, 'confirmacion_cita');
});

await test('preSend: sin nombre en la plantilla se conserva el valor elegido', async () => {
	const { ctx } = executeCtx({
		params: { id_canal: 1, id_plantilla: 'tpl_sin_nombre' },
		template: { components: [{ type: 'BODY', text: 'Hola' }] },
	});
	const out = await prepareTemplateSend.call(ctx, { body: { id_plantilla: 'tpl_sin_nombre' } });
	assert.equal(out.body.id_plantilla, 'tpl_sin_nombre');
});

await test('preSend: faltan variables → error que dice cuántas y da el ejemplo', async () => {
	const { ctx } = executeCtx({
		params: { id_canal: 1, id_plantilla: 'tpl_1', variables: 'Ana', url_encabezado: 'https://x/f.jpg' },
	});
	await assert.rejects(
		() => prepareTemplateSend.call(ctx, { body: {} }),
		(err) =>
			/necesita 2 variables y recibió 1/.test(err.message) &&
			/Ana, 12 de mayo/.test(err.description ?? ''),
	);
});

await test('preSend: falta la URL del encabezado → error que explica el medio', async () => {
	const { ctx } = executeCtx({
		params: { id_canal: 1, id_plantilla: 'tpl_1', variables: 'Ana, 12 de mayo' },
	});
	await assert.rejects(
		() => prepareTemplateSend.call(ctx, { body: {} }),
		(err) =>
			/lleva una imagen en el encabezado/.test(err.message) &&
			/https:\/\/cdn.test\/foto.jpg/.test(err.description ?? ''),
	);
});

await test('preSend: "Usar Datos de Ejemplo" rellena todo lo vacío', async () => {
	const { ctx } = executeCtx({
		params: { id_canal: 1, id_plantilla: 'tpl_1', 'additionalFields.usar_ejemplo': true },
	});
	const out = await prepareTemplateSend.call(ctx, { body: {} });
	assert.deepEqual(out.body.variables, ['Ana', '12 de mayo']);
	assert.equal(out.body.url_imagen_encabezado, 'https://cdn.test/foto.jpg');
	assert.deepEqual(out.body.buttons, [{ index: 0, parameter: 'https://test.co/c/999' }]);
});

await test('preSend: plantilla sin variables no exige nada', async () => {
	const { ctx } = executeCtx({
		params: { id_canal: 1, id_plantilla: 'tpl_2' },
		template: PLANTILLA_SIMPLE,
	});
	const out = await prepareTemplateSend.call(ctx, { body: { numero: '57300' } });
	assert.equal(out.body.variables, undefined);
	assert.equal(out.body.numero, '57300');
});

await test('preSend: la URL va a la propiedad del formato declarado (video)', async () => {
	const video = {
		name: 'promo',
		components: [{ type: 'HEADER', format: 'VIDEO' }, { type: 'BODY', text: 'Mira esto' }],
	};
	const { ctx } = executeCtx({
		params: { id_canal: 1, id_plantilla: 'tpl_v', url_encabezado: 'https://cdn.test/sin-extension' },
		template: video,
	});
	const out = await prepareTemplateSend.call(ctx, { body: {} });
	assert.equal(out.body.url_video_encabezado, 'https://cdn.test/sin-extension');
	assert.equal(out.body.url_imagen_encabezado, undefined);
});

await test('preSend: la plantilla se consulta una sola vez (caché entre ítems)', async () => {
	const params = { id_canal: 77, id_plantilla: 'tpl_cache', variables: 'Ana, 12 de mayo', url_encabezado: 'https://x/f.jpg' };
	const a = executeCtx({ params });
	await prepareTemplateSend.call(a.ctx, { body: {} });
	assert.equal(a.calls.length, 1);

	const b = executeCtx({ params });
	await prepareTemplateSend.call(b.ctx, { body: {} });
	assert.equal(b.calls.length, 0, 'el segundo ítem debe usar la caché');
});

await test('preSend: si no se puede consultar la plantilla, envía igual', async () => {
	const { ctx } = executeCtx({
		params: { id_canal: 99, id_plantilla: 'tpl_sin_red', variables: 'Ana' },
		falla: true,
	});
	const out = await prepareTemplateSend.call(ctx, { body: { numero: '57300' } });
	assert.deepEqual(out.body.variables, ['Ana']);
	assert.equal(out.body.numero, '57300');
});

console.log(`\n${passed} pruebas de humo de plantillas OK`);
