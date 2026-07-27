/**
 * Rutas estables para el diccionario de traducción, compartidas por el extractor
 * (scripts/extract-i18n.mjs) y el generador del paquete español
 * (scripts/build-es-package.mjs). Si las dos usan la misma función, el diccionario
 * siempre encaja.
 *
 * La clave NO puede ser solo el nombre de la propiedad: el nodo declara una propiedad
 * `operation` por recurso y un `additionalFields` por operación, todas con el mismo
 * `name`. Se antepone el ámbito que declara `displayOptions.show`:
 *
 *   liveConnect.contact.create.id_canal.displayName
 *   liveConnect.waba.sendTemplate.operation.options.sendTemplate.action
 *   liveConnect._._.resource.displayName          ← visible siempre
 *   liveConnectApi._._.cKey.displayName
 */

/** Campos de una propiedad que el usuario ve en el editor. */
export const CAMPOS_VISIBLES = ['displayName', 'description', 'placeholder', 'action', 'hint'];

function primerValor(valor) {
	if (Array.isArray(valor)) {
		const simple = valor.find((v) => typeof v === 'string' || typeof v === 'number');
		return simple === undefined ? undefined : String(simple);
	}
	return undefined;
}

/** Ámbito `<resource>.<operation>` de una propiedad, con `_` donde no aplique. */
export function scopeDe(propiedad) {
	const show = propiedad?.displayOptions?.show ?? {};
	return `${primerValor(show.resource) ?? '_'}.${primerValor(show.operation) ?? '_'}`;
}

/**
 * Recorre las propiedades de una descripción y llama a `visitar(ruta, texto, ubicacion)`
 * por cada texto visible. `ubicacion` permite escribir de vuelta: { objeto, campo }.
 */
export function recorrerTextos(descripcion, prefijo, visitar) {
	for (const campo of ['displayName', 'description', 'subtitle']) {
		if (typeof descripcion?.[campo] === 'string') {
			visitar(`${prefijo}.${campo}`, descripcion[campo], { objeto: descripcion, campo });
		}
	}
	recorrerPropiedades(descripcion?.properties, prefijo, undefined, visitar);
}

function recorrerPropiedades(propiedades, prefijo, scopeHeredado, visitar) {
	if (!Array.isArray(propiedades)) return;

	for (const propiedad of propiedades) {
		if (propiedad === null || typeof propiedad !== 'object') continue;
		if (typeof propiedad.name !== 'string') continue;

		// Las propiedades anidadas heredan el ámbito de quien las contiene.
		const scope = scopeHeredado ?? scopeDe(propiedad);
		const ruta = `${prefijo}.${scope}.${propiedad.name}`;

		for (const campo of CAMPOS_VISIBLES) {
			if (typeof propiedad[campo] === 'string') {
				visitar(`${ruta}.${campo}`, propiedad[campo], { objeto: propiedad, campo });
			}
		}

		if (!Array.isArray(propiedad.options)) continue;

		for (const opcion of propiedad.options) {
			if (opcion === null || typeof opcion !== 'object') continue;

			// fixedCollection: cada entrada agrupa propiedades bajo `values`.
			if (Array.isArray(opcion.values)) {
				const rutaGrupo = `${ruta}.options.${opcion.name ?? ''}`;
				if (typeof opcion.displayName === 'string') {
					visitar(`${rutaGrupo}.displayName`, opcion.displayName, {
						objeto: opcion,
						campo: 'displayName',
					});
				}
				recorrerPropiedades(opcion.values, `${rutaGrupo}.values`, scope, visitar);
				continue;
			}

			// collection: sus opciones SON propiedades completas.
			if (typeof opcion.type === 'string') {
				recorrerPropiedades([opcion], `${ruta}.options`, scope, visitar);
				continue;
			}

			// options/multiOptions: pares name/value visibles.
			const clave = opcion.value ?? opcion.name;
			if (clave === undefined) continue;
			const rutaOpcion = `${ruta}.options.${clave}`;
			for (const campo of ['name', 'description', 'action']) {
				if (typeof opcion[campo] === 'string') {
					visitar(`${rutaOpcion}.${campo}`, opcion[campo], { objeto: opcion, campo });
				}
			}
		}
	}
}
