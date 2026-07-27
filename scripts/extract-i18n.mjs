#!/usr/bin/env node
/**
 * Extrae los textos visibles del nodo compilado a un diccionario indexado por RUTA.
 *
 * Uso: npm run build && node scripts/extract-i18n.mjs [locale]   (por defecto: es)
 *
 * El código fuente del paquete está en inglés porque n8n exige inglés para los nodos
 * verificados. El paquete en español se genera aplicando este diccionario sobre las
 * descripciones (scripts/build-es-package.mjs), así que hay UNA sola base de código.
 *
 * Las rutas las construye scripts/i18n-paths.mjs, compartido con el generador.
 */
import { createRequire } from 'node:module';
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { recorrerTextos } from './i18n-paths.mjs';

const require = createRequire(import.meta.url);
const raiz = resolve(dirname(fileURLToPath(import.meta.url)), '..');

export const FUENTES = [
	['liveConnect', 'dist/nodes/LiveConnect/LiveConnect.node.js', 'LiveConnect'],
	[
		'liveConnectCallbackResponse',
		'dist/nodes/LiveConnect/LiveConnectCallbackResponse.node.js',
		'LiveConnectCallbackResponse',
	],
	[
		'liveConnectCallbackTrigger',
		'dist/nodes/LiveConnect/LiveConnectCallbackTrigger.node.js',
		'LiveConnectCallbackTrigger',
	],
	[
		'liveConnectProxyTrigger',
		'dist/nodes/LiveConnect/LiveConnectProxyTrigger.node.js',
		'LiveConnectProxyTrigger',
	],
	['liveConnectApi', 'dist/credentials/LiveConnectApi.credentials.js', 'LiveConnectApi'],
];

const diccionario = {};

for (const [clave, archivo, exportado] of FUENTES) {
	const modulo = require(resolve(raiz, archivo));
	const Clase = modulo[exportado];
	if (typeof Clase !== 'function') {
		throw new Error(`No se pudo cargar ${exportado} desde ${archivo}`);
	}
	const instancia = new Clase();
	// La credencial expone displayName/properties en la instancia; los nodos, en description.
	const descripcion = instancia.description ?? instancia;
	recorrerTextos(descripcion, clave, (ruta, texto) => {
		if (texto.trim() !== '') diccionario[ruta] = texto;
	});
}

const locale = process.argv[2] ?? 'es';
const destino = resolve(raiz, `i18n/${locale}.json`);
mkdirSync(dirname(destino), { recursive: true });
// Claves ordenadas: el diff del diccionario debe ser legible entre versiones.
const ordenado = Object.fromEntries(
	Object.entries(diccionario).sort(([a], [b]) => a.localeCompare(b)),
);
writeFileSync(destino, `${JSON.stringify(ordenado, null, '\t')}\n`, 'utf8');

console.log(`${Object.keys(ordenado).length} textos extraídos → i18n/${locale}.json`);
