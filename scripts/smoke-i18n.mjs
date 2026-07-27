#!/usr/bin/env node
/**
 * Prueba de humo del paquete español generado.
 *
 * Uso: npm run build && node scripts/build-es-package.mjs && node scripts/smoke-i18n.mjs
 *
 * Comprueba lo único que puede romperse en silencio: que las rutas del diccionario
 * sigan encajando con la estructura del nodo. Si alguien renombra una propiedad y no
 * actualiza i18n/es.json, el texto se queda en inglés sin ningún aviso — de ahí el
 * umbral de cobertura.
 */
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { recorrerTextos } from './i18n-paths.mjs';

const require = createRequire(import.meta.url);
const raiz = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const distEs = resolve(raiz, 'dist-es');

let passed = 0;
const test = (nombre, fn) => {
	fn();
	passed++;
	console.log(`✓ ${nombre}`);
};

assert.ok(existsSync(distEs), 'Falta dist-es/: ejecuta node scripts/build-es-package.mjs');

const diccionario = JSON.parse(readFileSync(resolve(raiz, 'i18n/es.json'), 'utf8'));

const PIEZAS = [
	['liveConnect', 'nodes/LiveConnect/LiveConnect.node.js', 'LiveConnect'],
	[
		'liveConnectCallbackResponse',
		'nodes/LiveConnect/LiveConnectCallbackResponse.node.js',
		'LiveConnectCallbackResponse',
	],
	[
		'liveConnectCallbackTrigger',
		'nodes/LiveConnect/LiveConnectCallbackTrigger.node.js',
		'LiveConnectCallbackTrigger',
	],
	[
		'liveConnectProxyTrigger',
		'nodes/LiveConnect/LiveConnectProxyTrigger.node.js',
		'LiveConnectProxyTrigger',
	],
	['liveConnectApi', 'credentials/LiveConnectApi.credentials.js', 'LiveConnectApi'],
];

/** Textos del paquete generado, indexados por la misma ruta que usa el diccionario. */
const textosEs = {};
const textosEn = {};

for (const [clave, archivo, exportado] of PIEZAS) {
	const es = new (require(resolve(distEs, archivo))[exportado])();
	const en = new (require(resolve(raiz, 'dist', archivo))[exportado])();
	recorrerTextos(es.description ?? es, clave, (ruta, texto) => (textosEs[ruta] = texto));
	recorrerTextos(en.description ?? en, clave, (ruta, texto) => (textosEn[ruta] = texto));
}

test('el paquete generado expone las 5 clases con su descripción', () => {
	assert.ok(Object.keys(textosEs).length > 500, `solo ${Object.keys(textosEs).length} textos`);
});

test('las rutas del diccionario siguen encajando (cobertura ≥ 95%)', () => {
	const claves = Object.keys(diccionario);
	const aplicadas = claves.filter((ruta) => textosEs[ruta] === diccionario[ruta]);
	const cobertura = (aplicadas.length / claves.length) * 100;
	const huerfanas = claves.filter((ruta) => textosEs[ruta] === undefined).slice(0, 5);
	assert.ok(
		cobertura >= 95,
		`cobertura ${cobertura.toFixed(1)}% (${aplicadas.length}/${claves.length}). Rutas sin destino: ${huerfanas.join(', ')}`,
	);
	console.log(`  cobertura: ${cobertura.toFixed(1)}% (${aplicadas.length}/${claves.length})`);
});

test('lo que no está en el diccionario se queda en inglés, nunca vacío', () => {
	for (const [ruta, texto] of Object.entries(textosEs)) {
		assert.ok(typeof texto === 'string' && texto.trim() !== '', `texto vacío en ${ruta}`);
		if (diccionario[ruta] === undefined) assert.equal(texto, textosEn[ruta], `divergencia en ${ruta}`);
	}
});

test('el paquete inglés NO queda traducido (los wrappers no mutan la clase base)', () => {
	const claveEjemplo = Object.keys(diccionario).find((r) => r.endsWith('.displayName'));
	assert.notEqual(
		textosEn[claveEjemplo],
		diccionario[claveEjemplo],
		`la clase base quedó traducida en ${claveEjemplo}`,
	);
});

test('el package.json generado apunta a los wrappers y no al paquete base', () => {
	const paquete = JSON.parse(readFileSync(resolve(distEs, 'package.json'), 'utf8'));
	assert.equal(paquete.name, 'n8n-nodes-liveconnect-es');
	assert.equal(paquete.n8n.nodes.length, 4);
	for (const ruta of [...paquete.n8n.nodes, ...paquete.n8n.credentials]) {
		assert.ok(!ruta.startsWith('base/'), `${ruta} apunta al paquete base`);
		assert.ok(existsSync(resolve(distEs, ruta)), `falta ${ruta}`);
	}
});

console.log(`\n${passed} pruebas de humo del paquete español OK`);
