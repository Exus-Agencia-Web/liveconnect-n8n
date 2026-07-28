#!/usr/bin/env node
/**
 * Estado del diccionario de traducción: qué textos del nodo (en inglés) todavía no
 * tienen traducción, y qué entradas del diccionario ya no corresponden a nada.
 *
 * Uso: npm run build && npm run i18n:status [locale]
 *
 * No escribe nada. Es la herramienta que hay que usar tras añadir o renombrar campos:
 * el extractor (scripts/extract-i18n.mjs) sobrescribiría el diccionario con inglés.
 */
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { FUENTES, recorrerTextos } from './i18n-paths.mjs';

const require = createRequire(import.meta.url);
const raiz = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const locale = process.argv[2] ?? 'es';

const diccionario = JSON.parse(readFileSync(resolve(raiz, `i18n/${locale}.json`), 'utf8'));

const actuales = new Map();
for (const [clave, archivo, exportado] of FUENTES) {
	const instancia = new (require(resolve(raiz, archivo))[exportado])();
	recorrerTextos(instancia.description ?? instancia, clave, (ruta, texto) =>
		actuales.set(ruta, texto),
	);
}

const sinTraducir = [...actuales.keys()].filter((ruta) => diccionario[ruta] === undefined);
const huerfanas = Object.keys(diccionario).filter((ruta) => !actuales.has(ruta));

console.log(`Diccionario ${locale}: ${Object.keys(diccionario).length} entradas`);
console.log(`Textos del nodo:       ${actuales.size}`);
console.log(
	`Traducidos:            ${actuales.size - sinTraducir.length} (${(((actuales.size - sinTraducir.length) / actuales.size) * 100).toFixed(1)}%)`,
);

if (sinTraducir.length > 0) {
	console.log(`\n✗ ${sinTraducir.length} sin traducir (se verán en inglés):`);
	for (const ruta of sinTraducir.slice(0, 40)) console.log(`  ${ruta} = ${actuales.get(ruta)}`);
	if (sinTraducir.length > 40) console.log(`  … y ${sinTraducir.length - 40} más`);
}

if (huerfanas.length > 0) {
	console.log(`\n~ ${huerfanas.length} entradas del diccionario ya no existen en el nodo:`);
	for (const ruta of huerfanas.slice(0, 20)) console.log(`  ${ruta}`);
	if (huerfanas.length > 20) console.log(`  … y ${huerfanas.length - 20} más`);
}

// Solo informa: que falte una traducción no debe romper el build (el texto cae al inglés).
process.exit(0);
