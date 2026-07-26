#!/usr/bin/env node
/**
 * Prueba de humo de "Enviar Plantilla" (WABA).
 * Uso: npm run build && node scripts/smoke-template-fields.mjs
 *
 * Cubre el parser de plantillas en sus dos formatos (Gupshup, que es el que devuelve
 * LiveConnect, y `components` de Meta), la etiqueta y el valor del selector, y el preSend
 * que valida y coloca los datos en el cuerpo de la petición.
 */
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const tf = require('../dist/nodes/LiveConnect/TemplateFields.js');
const { prepareTemplateSend } = require('../dist/nodes/LiveConnect/GenericFunctions.js');
const lo = require('../dist/nodes/LiveConnect/LoadOptions.js');
const { NodeHelpers } = require('n8n-workflow');
const { LiveConnect } = require('../dist/nodes/LiveConnect/LiveConnect.node.js');

let passed = 0;
const test = async (name, fn) => {
	await fn();
	passed++;
	console.log(`✓ ${name}`);
};

// --- plantillas de referencia -------------------------------------------------------
// Formato REAL de LiveConnect (proveedor Gupshup): el texto vive en `content`, el tipo de
// medio en `templateType` y el identificador de envío es el UUID `id`. Tomadas de la
// cuenta del usuario (canal 4695).

const GUPSHUP_TEXTO = {
	id: 'fcbcb260-4bc2-4056-8d98-d709dd17f2c0',
	elementName: 'lead_expocamello',
	languageCode: 'es',
	status: 'APPROVED',
	templateType: 'TEXT',
	content: '🎉 ¡Hola! Gracias por visitarnos en Expocamello.',
	containerMeta: { buttons: [{ type: 'URL', text: 'www', url: 'https://liveconnect.chat' }] },
};

const GUPSHUP_VIDEO = {
	id: '6990cf14-7796-425c-88a8-bb834dd61073',
	elementName: 'promo_48h',
	languageCode: 'es',
	status: 'APPROVED',
	templateType: 'VIDEO',
	content: '¡Solo por 48 horas, {{1}}! Activamos un {{2}}% de descuento.',
	mediaUrl: 'https://fss.gupshup.io/0/public/0/0/video.mp4',
	buttons: [{ text: 'Podemos hablar' }],
};

// Formato Meta (`components`): algunas cuentas lo devuelven así.
const META = {
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
				{
					type: 'URL',
					text: 'Ver cita',
					url: 'https://test.co/c/{{1}}',
					example: ['https://test.co/c/999'],
				},
				{ type: 'PHONE_NUMBER', text: 'Llamar', phone_number: '+571234567' },
			],
		},
	],
};

const META_SIMPLE = {
	id: 'tpl_2',
	name: 'aviso',
	language: 'es',
	status: 'APPROVED',
	components: [{ type: 'BODY', text: 'Tu pedido ya salió.' }],
};

// --- parser: formato Gupshup (el real) ----------------------------------------------

await test('parser Gupshup: sin variables ni medio cuando la plantilla es de texto', () => {
	const { fields, headerFormat } = tf.buildTemplateLayout(GUPSHUP_TEXTO);
	assert.equal(headerFormat, 'TEXT');
	assert.deepEqual(fields, []);
});

await test('parser Gupshup: VIDEO pide URL y trae mediaUrl como ejemplo', () => {
	const { fields, headerFormat } = tf.buildTemplateLayout(GUPSHUP_VIDEO);
	assert.equal(headerFormat, 'VIDEO');
	assert.deepEqual(
		fields.map((f) => f.id),
		['body_1', 'body_2', 'header_media_VIDEO'],
	);
	assert.equal(
		fields.find((f) => f.id === 'header_media_VIDEO').defaultValue,
		'https://fss.gupshup.io/0/public/0/0/video.mp4',
	);
});

await test('parser Gupshup: botón de URL fija no pide dato', () => {
	const { fields } = tf.buildTemplateLayout(GUPSHUP_TEXTO);
	assert.equal(fields.filter((f) => f.id.startsWith('button_')).length, 0);
});

await test('templateContent y templateName leen las variantes conocidas', () => {
	assert.equal(tf.templateName(GUPSHUP_TEXTO), 'lead_expocamello');
	assert.equal(tf.templateName(META), 'confirmacion_cita');
	assert.equal(tf.templateContent({ containerMeta: { data: 'Hola {{1}}' } }), 'Hola {{1}}');
	assert.equal(tf.templateContent({ preview: 'Solo preview' }), 'Solo preview');
	assert.equal(tf.templateContent({}), '');
});

// --- parser: formato Meta ------------------------------------------------------------

await test('parser Meta: campos con los ejemplos de la plantilla', () => {
	const { fields, headerFormat } = tf.buildTemplateLayout(META);
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

await test('parser Meta: variables sin ejemplo se listan igual', () => {
	const { fields } = tf.buildTemplateLayout({
		components: [{ type: 'BODY', text: 'Hola {{1}}, van {{2}} de {{3}}.' }],
	});
	assert.deepEqual(
		fields.map((f) => f.id),
		['body_1', 'body_2', 'body_3'],
	);
	assert.ok(fields.every((f) => f.defaultValue === undefined));
});

await test('parser: tolera plantillas vacías o con basura', () => {
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

// --- etiqueta y valor del selector ---------------------------------------------------

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
	const options = await lo.getWabaTemplates.call(optionsCtx([GUPSHUP_VIDEO, GUPSHUP_TEXTO]));
	const nombres = options.map((o) => o.name);
	assert.ok(
		nombres.some((n) => n.startsWith('promo_48h · es · 2 variables · video')),
		nombres.join(' , '),
	);
	assert.ok(
		nombres.some((n) => n.startsWith('lead_expocamello · es · sin variables')),
		nombres.join(' , '),
	);
});

await test('selector: el valor lleva el UUID, las variables y el formato', async () => {
	const options = await lo.getWabaTemplates.call(optionsCtx([GUPSHUP_VIDEO, GUPSHUP_TEXTO]));
	const valores = options.map((o) => o.value);
	// El identificador DEBE ser el id (UUID): con elementName el API responde
	// "Invalid template id provided" (verificado contra la cuenta real).
	assert.ok(valores.includes('6990cf14-7796-425c-88a8-bb834dd61073|v2|VIDEO'), valores.join(' , '));
	assert.ok(valores.includes('fcbcb260-4bc2-4056-8d98-d709dd17f2c0|v0|TEXT'), valores.join(' , '));
});

await test('selector: el formato Meta también se etiqueta', async () => {
	const options = await lo.getWabaTemplates.call(optionsCtx([META, META_SIMPLE]));
	const nombres = options.map((o) => o.name);
	assert.ok(
		nombres.some((n) => n.includes('confirmacion_cita · es · 2 variables · imagen · botón')),
		nombres.join(' , '),
	);
	assert.ok(
		nombres.some((n) => n.includes('aviso · es · sin variables')),
		nombres.join(' , '),
	);
});

await test('valor del selector: codifica y decodifica lo que pide la plantilla', () => {
	assert.equal(tf.encodeTemplateValue('uuid-1', 2, 'IMAGE'), 'uuid-1|v2|IMAGE');
	assert.deepEqual(tf.decodeTemplateValue('uuid-1|v2|IMAGE'), {
		identificador: 'uuid-1',
		variables: 2,
		headerFormat: 'IMAGE',
	});
	// Sin variables ni medio: los campos se ocultan por displayOptions.
	assert.deepEqual(tf.decodeTemplateValue('uuid-2|v0|NONE'), {
		identificador: 'uuid-2',
		variables: 0,
		headerFormat: 'NONE',
	});
	// Valor pegado a mano (solo el identificador): se usa tal cual.
	assert.deepEqual(tf.decodeTemplateValue('fcbcb260-4bc2-4056-8d98-d709dd17f2c0'), {
		identificador: 'fcbcb260-4bc2-4056-8d98-d709dd17f2c0',
	});
	// Un nombre con "|" no rompe el identificador.
	assert.equal(tf.decodeTemplateValue('raro|nombre|v1|TEXT').identificador, 'raro|nombre');
});


// --- visibilidad de los campos (lo que ve el usuario) --------------------------------
// Se evalúa con el propio helper de n8n: es la queja que originó el rediseño ("siempre
// muestra Variables y URL del Encabezado aunque la plantilla no lleve ni lo uno ni lo otro").

const descripcionNodo = new LiveConnect().description;

function camposVisibles(idPlantilla) {
	const values = {
		resource: 'waba',
		operation: 'sendTemplate',
		id_canal: 4695,
		numero: '573152887786',
		id_plantilla: idPlantilla,
	};
	const node = { name: 'LC', type: 'x', typeVersion: 1, position: [0, 0], parameters: values };
	return descripcionNodo.properties
		.filter((p) => NodeHelpers.displayParameter(values, p, node, descripcionNodo))
		.map((p) => p.displayName);
}

await test('UI: sin plantilla elegida no se pide ni variable ni URL', () => {
	const visibles = camposVisibles('');
	assert.ok(!visibles.some((n) => n.startsWith('Variable ')), visibles.join(' , '));
	assert.ok(!visibles.includes('URL del Encabezado'), visibles.join(' , '));
});

await test('UI: plantilla de texto sin variables no pide nada extra', () => {
	const visibles = camposVisibles('uuid|v0|TEXT');
	assert.ok(!visibles.some((n) => n.startsWith('Variable ')), visibles.join(' , '));
	assert.ok(!visibles.includes('URL del Encabezado'), visibles.join(' , '));
});

await test('UI: se muestran exactamente las variables que pide la plantilla', () => {
	for (const total of [1, 2, 5, 9, 10]) {
		const visibles = camposVisibles(`uuid|v${total}|NONE`).filter((n) => n.startsWith('Variable '));
		assert.deepEqual(
			visibles,
			Array.from({ length: total }, (_, i) => `Variable {{${i + 1}}}`),
			`con v${total}`,
		);
	}
});

await test('UI: la URL del encabezado solo aparece con imagen, video o documento', () => {
	for (const formato of ['IMAGE', 'VIDEO', 'DOCUMENT']) {
		assert.ok(
			camposVisibles(`uuid|v0|${formato}`).includes('URL del Encabezado'),
			`falta con ${formato}`,
		);
	}
	for (const formato of ['NONE', 'TEXT']) {
		assert.ok(
			!camposVisibles(`uuid|v0|${formato}`).includes('URL del Encabezado'),
			`sobra con ${formato}`,
		);
	}
});

await test('UI: con la plantilla por expresión se ofrece la URL (no se puede deducir)', () => {
	const visibles = camposVisibles('={{ $json.plantilla }}');
	assert.ok(visibles.includes('URL del Encabezado'), visibles.join(' , '));
});

// --- preSend -------------------------------------------------------------------------

/** Campos "Variable {{n}}" tal como los lee el nodo. */
function vars(...valores) {
	return Object.fromEntries(valores.map((v, i) => [`variable_${i + 1}`, v]));
}

function executeCtx({ params = {}, template = META, falla = false } = {}) {
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

await test('preSend: envía el identificador limpio, sin el sufijo del selector', async () => {
	const { ctx } = executeCtx({
		params: {
			id_canal: 4695,
			id_plantilla: '6990cf14-7796-425c-88a8-bb834dd61073|v2|VIDEO',
			...vars('Ana', '30'),
			url_encabezado: 'https://cdn.test/v.mp4',
		},
		template: GUPSHUP_VIDEO,
	});
	const out = await prepareTemplateSend.call(ctx, {
		body: { id_plantilla: '6990cf14-7796-425c-88a8-bb834dd61073|v2|VIDEO', numero: '57300' },
	});
	assert.equal(out.body.id_plantilla, '6990cf14-7796-425c-88a8-bb834dd61073');
	assert.deepEqual(out.body.variables, ['Ana', '30']);
	assert.equal(out.body.url_video_encabezado, 'https://cdn.test/v.mp4');
	assert.equal(out.body.numero, '57300');
});

await test('preSend: las variables van en el orden de los campos', async () => {
	const { ctx } = executeCtx({
		params: {
			id_canal: 1,
			id_plantilla: 'tpl_1|v2|IMAGE',
			...vars('Ana', '12 de mayo'),
			url_encabezado: 'https://cdn.test/f.jpg',
		},
	});
	const out = await prepareTemplateSend.call(ctx, { body: { numero: '57300' } });
	assert.deepEqual(out.body.variables, ['Ana', '12 de mayo']);
	assert.equal(out.body.url_imagen_encabezado, 'https://cdn.test/f.jpg');
});

await test('preSend: descarta lo que quedó en campos ocultos de otra plantilla', async () => {
	// El usuario venía de una plantilla de 3 variables y eligió una de 2: n8n conserva
	// variable_3 en el nodo aunque el campo ya no se vea.
	const { ctx } = executeCtx({
		params: {
			id_canal: 1,
			id_plantilla: 'tpl_1|v2|IMAGE',
			...vars('Ana', '12 de mayo', 'sobrante'),
			url_encabezado: 'https://cdn.test/f.jpg',
		},
	});
	const out = await prepareTemplateSend.call(ctx, { body: {} });
	assert.deepEqual(out.body.variables, ['Ana', '12 de mayo']);
});

await test('preSend: hueco en el medio → error que nombra la variable vacía', async () => {
	const { ctx } = executeCtx({
		params: {
			id_canal: 1,
			id_plantilla: 'tpl_1|v2|IMAGE',
			...vars('Ana', '   '),
			url_encabezado: 'https://x/f.jpg',
		},
	});
	await assert.rejects(
		() => prepareTemplateSend.call(ctx, { body: {} }),
		(err) =>
			/falta el valor de \{\{2\}\}/.test(err.message) &&
			/"Variable \{\{2\}\}"/.test(err.description ?? '') &&
			/Ana, 12 de mayo/.test(err.description ?? ''),
	);
});

await test('preSend: falta la URL del encabezado → error que explica el medio', async () => {
	const { ctx } = executeCtx({
		params: { id_canal: 1, id_plantilla: 'tpl_1|v2|IMAGE', ...vars('Ana', '12 de mayo') },
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
		params: { id_canal: 1, id_plantilla: 'tpl_1|v2|IMAGE', 'additionalFields.usar_ejemplo': true },
	});
	const out = await prepareTemplateSend.call(ctx, { body: {} });
	assert.deepEqual(out.body.variables, ['Ana', '12 de mayo']);
	assert.equal(out.body.url_imagen_encabezado, 'https://cdn.test/foto.jpg');
	assert.deepEqual(out.body.buttons, [{ index: 0, parameter: 'https://test.co/c/999' }]);
});

await test('preSend: "Usar Datos de Ejemplo" completa solo los huecos', async () => {
	const { ctx } = executeCtx({
		params: {
			id_canal: 1,
			id_plantilla: 'tpl_1|v2|IMAGE',
			...vars('Herduin', ''),
			url_encabezado: 'https://x/f.jpg',
			'additionalFields.usar_ejemplo': true,
		},
	});
	const out = await prepareTemplateSend.call(ctx, { body: {} });
	assert.deepEqual(out.body.variables, ['Herduin', '12 de mayo']);
});

await test('preSend: plantilla sin variables no exige nada', async () => {
	const { ctx } = executeCtx({
		params: { id_canal: 4695, id_plantilla: 'fcbcb260-4bc2-4056-8d98-d709dd17f2c0|v0|TEXT' },
		template: GUPSHUP_TEXTO,
	});
	const out = await prepareTemplateSend.call(ctx, { body: { numero: '57300' } });
	assert.equal(out.body.variables, undefined);
	assert.equal(out.body.url_imagen_encabezado, undefined);
	assert.equal(out.body.numero, '57300');
});

await test('preSend: plantilla sin variables ignora restos de otra plantilla', async () => {
	const { ctx } = executeCtx({
		params: {
			id_canal: 4695,
			id_plantilla: 'fcbcb260-4bc2-4056-8d98-d709dd17f2c0|v0|TEXT',
			...vars('resto', 'de antes'),
		},
		template: GUPSHUP_TEXTO,
	});
	const out = await prepareTemplateSend.call(ctx, { body: {} });
	assert.equal(out.body.variables, undefined);
});

await test('preSend: la URL va a la propiedad del formato declarado (video)', async () => {
	const { ctx } = executeCtx({
		params: {
			id_canal: 1,
			id_plantilla: 'tpl_v|v2|VIDEO',
			...vars('Ana', '30'),
			url_encabezado: 'https://cdn.test/sin-extension',
		},
		template: GUPSHUP_VIDEO,
	});
	const out = await prepareTemplateSend.call(ctx, { body: {} });
	assert.equal(out.body.url_video_encabezado, 'https://cdn.test/sin-extension');
	assert.equal(out.body.url_imagen_encabezado, undefined);
});

await test('preSend: la plantilla se consulta una sola vez (caché entre ítems)', async () => {
	const params = {
		id_canal: 77,
		id_plantilla: 'tpl_cache|v2|IMAGE',
		...vars('Ana', '12 de mayo'),
		url_encabezado: 'https://x/f.jpg',
	};
	const a = executeCtx({ params });
	await prepareTemplateSend.call(a.ctx, { body: {} });
	assert.equal(a.calls.length, 1);

	const b = executeCtx({ params });
	await prepareTemplateSend.call(b.ctx, { body: {} });
	assert.equal(b.calls.length, 0, 'el segundo ítem debe usar la caché');
});

await test('preSend: si no se puede consultar la plantilla, envía igual', async () => {
	const { ctx } = executeCtx({
		params: { id_canal: 99, id_plantilla: 'tpl_sin_red|v1|NONE', ...vars('Ana') },
		falla: true,
	});
	const out = await prepareTemplateSend.call(ctx, { body: { numero: '57300' } });
	assert.deepEqual(out.body.variables, ['Ana']);
	assert.equal(out.body.numero, '57300');
});

await test('preSend: plantilla por expresión → toma las variables del campo CSV', async () => {
	const { ctx } = executeCtx({
		params: {
			id_canal: 1,
			id_plantilla: 'tpl_1',
			'additionalFields.variables_csv': 'Ana, 12 de mayo',
			url_encabezado: 'https://x/f.jpg',
		},
	});
	const out = await prepareTemplateSend.call(ctx, { body: {} });
	assert.deepEqual(out.body.variables, ['Ana', '12 de mayo']);
});

await test('preSend: los campos "Variable {{n}}" mandan sobre el CSV', async () => {
	const { ctx } = executeCtx({
		params: {
			id_canal: 1,
			id_plantilla: 'tpl_1|v2|IMAGE',
			...vars('Herduin', 'hoy'),
			'additionalFields.variables_csv': 'Ana, 12 de mayo',
			url_encabezado: 'https://x/f.jpg',
		},
	});
	const out = await prepareTemplateSend.call(ctx, { body: {} });
	assert.deepEqual(out.body.variables, ['Herduin', 'hoy']);
});

await test('preSend: CSV vacío no inventa variables', async () => {
	const { ctx } = executeCtx({
		params: {
			id_canal: 4695,
			id_plantilla: 'fcbcb260-4bc2-4056-8d98-d709dd17f2c0|v0|TEXT',
			'additionalFields.variables_csv': '  ,  ',
		},
		template: GUPSHUP_TEXTO,
	});
	const out = await prepareTemplateSend.call(ctx, { body: {} });
	assert.equal(out.body.variables, undefined);
});

console.log(`\n${passed} pruebas de humo de plantillas OK`);
