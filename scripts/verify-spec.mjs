#!/usr/bin/env node
/**
 * Verifica el nodo compilado (dist/) contra el OpenAPI público de LiveConnect.
 *
 * Uso:
 *   npm run build && npm run verify              # descarga el spec del CDN
 *   npm run verify -- ruta/al/openapi.json       # usa un spec local
 *
 * Reporta:
 *   ✗ errores duros (endpoint faltante/inventado, propiedad inexistente, body vs query)
 *   ~ avisos (required del spec no marcado required en el nodo)
 *   - cobertura (propiedad del spec no expuesta en el nodo)
 *
 * Sale con código 1 si hay errores duros.
 */
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';

const require = createRequire(import.meta.url);
const SPEC_URL = 'https://cdn.liveconnect.chat/liveconnect/public-openapi.json';

const specPath = process.argv[2];
const spec = specPath
	? JSON.parse(readFileSync(specPath, 'utf8'))
	: await (await fetch(SPEC_URL)).json();

const { LiveConnect } = require('../dist/nodes/LiveConnect/LiveConnect.node.js');
const props = new LiveConnect().description.properties;

// --- endpoints del spec (el token lo manejan las credenciales) ---
const specEndpoints = new Set();
for (const [p, methods] of Object.entries(spec.paths)) {
	for (const m of Object.keys(methods)) {
		if (['get', 'post', 'put', 'patch', 'delete'].includes(m) && p !== '/account/token') {
			specEndpoints.add(`${m.toUpperCase()} ${p}`);
		}
	}
}

// --- operaciones del nodo ---
const opRoute = {};
const nodeEndpoints = new Map();
let hard = 0;
for (const p of props.filter((p) => p.name === 'operation')) {
	const res = p.displayOptions.show.resource[0];
	for (const o of p.options) {
		opRoute[`${res}.${o.value}`] = o.routing.request;
		const key = `${o.routing.request.method} ${o.routing.request.url}`;
		nodeEndpoints.set(key, `${res}.${o.value}`);
		const pr = o.routing.output?.postReceive;
		if (!pr?.length) {
			console.log(`✗ ${res}.${o.value}: sin postReceive`);
			hard++;
		}
	}
}

for (const e of specEndpoints) {
	if (!nodeEndpoints.has(e)) {
		console.log(`✗ SPEC SIN CUBRIR: ${e}`);
		hard++;
	}
}
for (const e of nodeEndpoints.keys()) {
	if (!specEndpoints.has(e)) {
		console.log(`✗ NO EXISTE EN SPEC: ${e} (${nodeEndpoints.get(e)})`);
		hard++;
	}
}

// --- campos enviados por operación ---
const sent = {};
for (const p of props) {
	if (['resource', 'operation', 'fullResponse'].includes(p.name)) continue;
	const res = p.displayOptions.show.resource[0];
	for (const op of p.displayOptions.show.operation) {
		const key = `${res}.${op}`;
		sent[key] = sent[key] || [];
		if (p.routing?.send?.property) {
			sent[key].push({ prop: p.routing.send.property, where: p.routing.send.type, required: !!p.required });
		} else if (p.type === 'collection') {
			for (const o of p.options) {
				if (o.routing?.send?.property) {
					sent[key].push({ prop: o.routing.send.property, where: o.routing.send.type, required: false });
				}
			}
		}
	}
}

for (const [key, route] of Object.entries(opRoute)) {
	const method = route.method.toLowerCase();
	const specOp = spec.paths[route.url]?.[method];
	if (!specOp) continue;

	const isGet = method === 'get';
	const specProps = {};
	let specRequired = [];
	if (isGet) {
		for (const par of specOp.parameters || []) specProps[par.name] = 'query';
		specRequired = (specOp.parameters || []).filter((p) => p.required).map((p) => p.name);
	} else {
		const schema = specOp.requestBody?.content?.['application/json']?.schema || {};
		for (const name of Object.keys(schema.properties || {})) specProps[name] = 'body';
		specRequired = schema.required || [];
	}

	const nodeFields = sent[key] || [];
	const nodeProps = new Set(nodeFields.map((f) => f.prop));

	for (const f of nodeFields) {
		if (!(f.prop in specProps)) {
			console.log(`✗ ${key}: envía '${f.prop}' que NO existe en spec`);
			hard++;
		} else if (specProps[f.prop] !== f.where) {
			console.log(`✗ ${key}: '${f.prop}' va por ${f.where}, spec dice ${specProps[f.prop]}`);
			hard++;
		}
	}
	for (const r of specRequired) {
		const f = nodeFields.find((f) => f.prop === r);
		if (!f) {
			console.log(`✗ ${key}: requerido del spec '${r}' NO está en el nodo`);
			hard++;
		} else if (!f.required) {
			console.log(`~ ${key}: '${r}' es required en spec pero opcional en nodo`);
		}
	}
	for (const sp of Object.keys(specProps)) {
		if (!nodeProps.has(sp)) console.log(`- ${key}: propiedad del spec '${sp}' no expuesta en nodo`);
	}
}

console.log(
	`\nendpoints: nodo ${nodeEndpoints.size} / spec ${specEndpoints.size} | errores duros: ${hard}`,
);
process.exit(hard > 0 ? 1 : 0);
