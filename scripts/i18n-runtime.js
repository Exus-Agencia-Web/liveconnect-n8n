'use strict';
/**
 * Aplica un diccionario de traducción sobre la descripción de un nodo, EN SITIO.
 *
 * Va dentro del paquete español generado (dist-es/i18n/translate.js), así que es
 * CommonJS puro y sin dependencias. Las rutas del diccionario las produce
 * scripts/extract-i18n.mjs y deben construirse igual aquí: cualquier divergencia deja
 * textos sin traducir (que es el fallo seguro: se ven en inglés, nunca mal traducidos).
 *
 * La versión en ESM de esta misma lógica, usada por el extractor, está en
 * scripts/i18n-paths.mjs. Duplicar ~60 líneas es preferible a que el paquete publicado
 * dependa de un módulo del repo que no se publica.
 */

const CAMPOS_VISIBLES = ['displayName', 'description', 'placeholder', 'action', 'hint'];

function primerValor(valor) {
	if (!Array.isArray(valor)) return undefined;
	const simple = valor.find((v) => typeof v === 'string' || typeof v === 'number');
	return simple === undefined ? undefined : String(simple);
}

function scopeDe(propiedad) {
	const show =
		propiedad && propiedad.displayOptions && propiedad.displayOptions.show
			? propiedad.displayOptions.show
			: {};
	return `${primerValor(show.resource) || '_'}.${primerValor(show.operation) || '_'}`;
}

function aplicar(objeto, campo, ruta, diccionario) {
	const traduccion = diccionario[ruta];
	if (typeof traduccion === 'string' && typeof objeto[campo] === 'string') {
		objeto[campo] = traduccion;
	}
}

function recorrerPropiedades(propiedades, prefijo, scopeHeredado, diccionario) {
	if (!Array.isArray(propiedades)) return;

	for (const propiedad of propiedades) {
		if (propiedad === null || typeof propiedad !== 'object') continue;
		if (typeof propiedad.name !== 'string') continue;

		const scope = scopeHeredado || scopeDe(propiedad);
		const ruta = `${prefijo}.${scope}.${propiedad.name}`;

		for (const campo of CAMPOS_VISIBLES) aplicar(propiedad, campo, `${ruta}.${campo}`, diccionario);

		if (!Array.isArray(propiedad.options)) continue;

		for (const opcion of propiedad.options) {
			if (opcion === null || typeof opcion !== 'object') continue;

			if (Array.isArray(opcion.values)) {
				const rutaGrupo = `${ruta}.options.${opcion.name || ''}`;
				aplicar(opcion, 'displayName', `${rutaGrupo}.displayName`, diccionario);
				recorrerPropiedades(opcion.values, `${rutaGrupo}.values`, scope, diccionario);
				continue;
			}

			if (typeof opcion.type === 'string') {
				recorrerPropiedades([opcion], `${ruta}.options`, scope, diccionario);
				continue;
			}

			const clave = opcion.value !== undefined ? opcion.value : opcion.name;
			if (clave === undefined) continue;
			const rutaOpcion = `${ruta}.options.${clave}`;
			for (const campo of ['name', 'description', 'action']) {
				aplicar(opcion, campo, `${rutaOpcion}.${campo}`, diccionario);
			}
		}
	}
}

/** Traduce en sitio la descripción de un nodo o credencial. */
function traducirDescripcion(descripcion, clave, diccionario) {
	if (descripcion === null || typeof descripcion !== 'object') return descripcion;

	for (const campo of ['displayName', 'description', 'subtitle']) {
		aplicar(descripcion, campo, `${clave}.${campo}`, diccionario);
	}
	recorrerPropiedades(descripcion.properties, clave, undefined, diccionario);
	return descripcion;
}

module.exports = { traducirDescripcion };
