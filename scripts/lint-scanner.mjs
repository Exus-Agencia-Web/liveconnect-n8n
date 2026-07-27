#!/usr/bin/env node
/**
 * Lint del repo con la MISMA configuración que aplica el escáner oficial de n8n.
 *
 * Uso: npm run lint:scanner [-- --fix]
 *
 * Por qué existe: `npm run lint` (n8n-node lint) usa el preset de @n8n/node-cli, que
 * apaga algunas reglas de `eslint-plugin-n8n-nodes-base` que el escáner SÍ exige. En
 * v1.0.0 el lint daba 0 errores y el escáner encontró 2 (`fixed-collection-type-unsorted-items`
 * y `display-name-miscased`) — se descubrieron después de publicar, que es justo lo que
 * este script evita: `npx @n8n/scan-community-package` solo funciona contra un paquete
 * ya publicado en npm.
 *
 * La config sale de `buildScanConfig()` del propio escáner, así que no hay que
 * mantener una copia que se desincronice. El escáner se instala en una caché
 * aparte porque su TypeScript 7 no puede convivir con el del proyecto.
 */
import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';

/** Versión fijada: la config de lint del escáner cambia entre versiones. */
const PAQUETE_ESCANER = '@n8n/scan-community-package@0.29.1';

const raiz = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const arreglar = process.argv.includes('--fix');

// El escáner se instala AISLADO, no como devDependency: arrastra su propio
// TypeScript 7 y su @typescript-eslint lo rechaza si comparte árbol con el
// TypeScript 5 del proyecto ("typescript-eslint does not support TS 7.0").
const cache = resolve(raiz, 'node_modules/.cache/n8n-scanner');
const scanner = resolve(cache, 'node_modules/@n8n/scan-community-package/scanner/scanner.mjs');

if (!existsSync(scanner)) {
	console.log('Instalando el escáner oficial en node_modules/.cache/n8n-scanner…');
	execFileSync(
		'npm',
		['install', '--prefix', cache, '--no-save', '--ignore-scripts', '--silent', PAQUETE_ESCANER],
		{ stdio: 'inherit' },
	);
}

const { buildScanConfig } = await import(pathToFileURL(scanner).href);
const { ESLint } = await import(pathToFileURL(resolve(cache, 'node_modules/eslint/lib/api.js')).href);

const eslint = new ESLint({
	overrideConfigFile: true,
	overrideConfig: await buildScanConfig(),
	cwd: raiz,
	fix: arreglar,
});

const resultados = await eslint.lintFiles([`${raiz}/nodes/**/*.ts`, `${raiz}/credentials/**/*.ts`]);
if (arreglar) await ESLint.outputFixes(resultados);

const formatter = await eslint.loadFormatter('stylish');
const salida = await formatter.format(resultados);
console.log(salida || '✅ 0 problemas con las reglas del escáner oficial');

process.exit(resultados.some((r) => r.errorCount > 0) ? 1 : 0);
