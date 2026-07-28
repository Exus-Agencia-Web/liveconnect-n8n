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

test('los wrappers no mutan los objetos compartidos del paquete base', () => {
	// Comparar dist-es/base con dist/ no vale: son dos copias independientes y pasaría
	// aunque la mutación fuera total. Lo que hay que mirar es el MISMO módulo que usan
	// los wrappers: las properties del nodo son los objetos que exportan las
	// descriptions, así que traducir en sitio los reescribiría para todo el proceso.
	const descripciones = require(
		resolve(distEs, 'base/nodes/LiveConnect/descriptions/ContactDescription.js'),
	);
	const campo = descripciones.contactFields[0];
	assert.equal(
		campo.displayName,
		'Name',
		`el módulo compartido quedó traducido: contactFields[0].displayName = ${campo.displayName}`,
	);

	// Y la clase base instanciada después del wrapper sigue en inglés.
	const base = new (require(resolve(distEs, 'base/nodes/LiveConnect/LiveConnect.node.js')).LiveConnect)();
	assert.equal(
		base.description.properties.find((p) => p.name === 'resource').displayName,
		'Resource',
	);
});

test('el paquete español conserva las funciones del routing', () => {
	const nodo = new (require(resolve(distEs, 'nodes/LiveConnect/LiveConnect.node.js')).LiveConnect)();
	const conPreSend = nodo.description.properties.filter((p) => Array.isArray(p.routing?.send?.preSend));
	assert.deepEqual(
		conPreSend.map((p) => p.name),
		['resource', 'numero'],
		'el clon del wrapper perdió algún preSend',
	);
	const operacion = nodo.description.properties.find(
		(p) => p.name === 'operation' && p.displayOptions?.show?.resource?.[0] === 'waba',
	);
	assert.equal(typeof operacion.options[0].routing.output.postReceive[0], 'function');
});

test('el package.json generado apunta a los wrappers y no al paquete base', () => {
	const paquete = JSON.parse(readFileSync(resolve(distEs, 'package.json'), 'utf8'));
	assert.equal(paquete.name, 'n8n-nodes-liveconnect-es');
	assert.equal(paquete.n8n.nodes.length, 3);
	for (const ruta of [...paquete.n8n.nodes, ...paquete.n8n.credentials]) {
		assert.ok(!ruta.startsWith('base/'), `${ruta} apunta al paquete base`);
		assert.ok(existsSync(resolve(distEs, ruta)), `falta ${ruta}`);
	}
});

test('los dos paquetes declaran credenciales distintas (pueden convivir)', () => {
	// n8n indexa las credenciales por nombre en un espacio global, sin prefijo de paquete:
	// si ambos declararan `liveConnectApi` serían incompatibles y n8n Cloud los rechaza.
	const credEs = new (require(resolve(distEs, 'credentials/LiveConnectApi.credentials.js')).LiveConnectApi)();
	const credEn = new (require(resolve(raiz, 'dist/credentials/LiveConnectApi.credentials.js')).LiveConnectApi)();
	assert.equal(credEn.name, 'liveConnectApi');
	assert.equal(credEs.name, 'liveConnectApiEs');

	// Y cada nodo pide la suya.
	for (const [archivo, clase] of [
		['nodes/LiveConnect/LiveConnect.node.js', 'LiveConnect'],
		['nodes/LiveConnect/LiveConnectCallbackTrigger.node.js', 'LiveConnectCallbackTrigger'],
		['nodes/LiveConnect/LiveConnectProxyTrigger.node.js', 'LiveConnectProxyTrigger'],
	]) {
		const nodoEs = new (require(resolve(distEs, archivo))[clase])();
		const nodoEn = new (require(resolve(raiz, 'dist', archivo))[clase])();
		for (const c of nodoEs.description.credentials ?? []) {
			assert.equal(c.name, 'liveConnectApiEs', `${clase} (es) pide ${c.name}`);
		}
		for (const c of nodoEn.description.credentials ?? []) {
			assert.equal(c.name, 'liveConnectApi', `${clase} (en) pide ${c.name}`);
		}
	}
});

console.log(`\n${passed} pruebas de humo del paquete español OK`);
