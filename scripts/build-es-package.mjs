#!/usr/bin/env node
/**
 * Genera el paquete en español a partir del paquete compilado en inglés.
 *
 * Uso: npm run build && node scripts/build-es-package.mjs
 * Salida: dist-es/  (listo para `npm publish` como n8n-nodes-liveconnect-es)
 *
 * Por qué existe: n8n exige que la interfaz de un nodo verificado esté en inglés, pero
 * el equipo trabaja en español. En vez de mantener dos bases de código, el español se
 * aplica en tiempo de build sobre las descripciones, usando i18n/es.json (extraído con
 * scripts/extract-i18n.mjs) y las MISMAS rutas que usó el extractor.
 *
 * Estructura generada:
 *   dist-es/base/…                              copia del paquete inglés compilado
 *   dist-es/i18n/{es.json,translate.js}         diccionario + aplicador
 *   dist-es/nodes/LiveConnect/<Nodo>.node.js    wrapper que traduce la descripción
 *   dist-es/credentials/LiveConnectApi.credentials.js
 *
 * n8n carga cada clase por el nombre del archivo, así que los wrappers conservan el
 * nombre y el export originales y heredan todo lo demás (routing, methods, webhooks).
 */
import { cpSync, mkdirSync, readFileSync, rmSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const raiz = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const dist = resolve(raiz, 'dist');
const salida = resolve(raiz, 'dist-es');

if (!existsSync(dist)) {
	console.error('No existe dist/. Ejecuta `npm run build` antes.');
	process.exit(1);
}

const paquete = JSON.parse(readFileSync(resolve(raiz, 'package.json'), 'utf8'));
const NOMBRE_ES = `${paquete.name}-es`;

/** Nodos y credencial: [archivo dentro de dist, clase exportada, clave del diccionario]. */
const PIEZAS = [
	['nodes/LiveConnect/LiveConnect.node.js', 'LiveConnect', 'liveConnect'],
	[
		'nodes/LiveConnect/LiveConnectCallbackResponse.node.js',
		'LiveConnectCallbackResponse',
		'liveConnectCallbackResponse',
	],
	[
		'nodes/LiveConnect/LiveConnectCallbackTrigger.node.js',
		'LiveConnectCallbackTrigger',
		'liveConnectCallbackTrigger',
	],
	[
		'nodes/LiveConnect/LiveConnectProxyTrigger.node.js',
		'LiveConnectProxyTrigger',
		'liveConnectProxyTrigger',
	],
	['credentials/LiveConnectApi.credentials.js', 'LiveConnectApi', 'liveConnectApi'],
];

rmSync(salida, { recursive: true, force: true });
mkdirSync(salida, { recursive: true });

// 1. El paquete inglés compilado, intacto, como base de los wrappers.
cpSync(dist, resolve(salida, 'base'), { recursive: true });

// 2. Diccionario y aplicador.
mkdirSync(resolve(salida, 'i18n'), { recursive: true });
cpSync(resolve(raiz, 'i18n/es.json'), resolve(salida, 'i18n/es.json'));
cpSync(resolve(raiz, 'scripts/i18n-runtime.js'), resolve(salida, 'i18n/translate.js'));

// 3. Wrappers, con los íconos junto a ellos (icon: 'file:…' resuelve relativo al nodo).
for (const [archivo, clase, claveDiccionario] of PIEZAS) {
	const destino = resolve(salida, archivo);
	mkdirSync(dirname(destino), { recursive: true });

	const profundidad = archivo.split('/').length;
	const haciaRaiz = '../'.repeat(profundidad - 1);

	writeFileSync(
		destino,
		`"use strict";
// Generado por scripts/build-es-package.mjs — no editar a mano.
Object.defineProperty(exports, "__esModule", { value: true });
const base = require("${haciaRaiz}base/${archivo}");
const { traducirDescripcion, clonarDescripcion } = require("${haciaRaiz}i18n/translate.js");
const diccionario = require("${haciaRaiz}i18n/es.json");

class ${clase} extends base.${clase} {
\tconstructor() {
\t\tsuper(...arguments);
\t\t// Se clona ANTES de traducir: las properties del nodo son los mismos objetos que
\t\t// exportan las descriptions, y traducirlas en sitio dejaría el paquete inglés en
\t\t// español si ambos se cargan en el mismo proceso (ver clonarDescripcion).
\t\tif (this.description !== undefined) this.description = clonarDescripcion(this.description);
\t\ttraducirDescripcion(this.description ?? this, "${claveDiccionario}", diccionario);
\t}
}
exports.${clase} = ${clase};
`,
		'utf8',
	);
}

for (const icono of ['liveconnect2.svg', 'liveconnect2.dark.svg']) {
	const origen = resolve(dist, 'nodes/LiveConnect', icono);
	if (existsSync(origen)) cpSync(origen, resolve(salida, 'nodes/LiveConnect', icono));
}

// 4. package.json del paquete español: mismos metadatos, nombre y descripción propios.
const paqueteEs = {
	...paquete,
	name: NOMBRE_ES,
	description:
		'Nodo comunitario de n8n para el API de LiveConnect (mensajería omnicanal + CRM), con la interfaz en español. Generado desde n8n-nodes-liveconnect.',
	keywords: [...new Set([...(paquete.keywords ?? []), 'espanol', 'spanish'])],
	files: ['base', 'i18n', 'nodes', 'credentials'],
	n8n: {
		n8nNodesApiVersion: paquete.n8n.n8nNodesApiVersion,
		credentials: ['credentials/LiveConnectApi.credentials.js'],
		nodes: [
			'nodes/LiveConnect/LiveConnect.node.js',
			'nodes/LiveConnect/LiveConnectCallbackResponse.node.js',
			'nodes/LiveConnect/LiveConnectCallbackTrigger.node.js',
			'nodes/LiveConnect/LiveConnectProxyTrigger.node.js',
		],
	},
};
delete paqueteEs.scripts;
delete paqueteEs.devDependencies;
writeFileSync(
	resolve(salida, 'package.json'),
	`${JSON.stringify(paqueteEs, null, '\t')}\n`,
	'utf8',
);

// El README en español vive en i18n/ y no en la raíz: npm mete en el tarball
// cualquier fichero que empiece por README, y el paquete inglés no debe llevarlo.
cpSync(resolve(raiz, 'LICENSE.md'), resolve(salida, 'LICENSE.md'));
cpSync(resolve(raiz, 'i18n/README.es.md'), resolve(salida, 'README.md'));

console.log(`${NOMBRE_ES} generado en dist-es/ (${PIEZAS.length} clases envueltas)`);
