import type { IDataObject, ResourceMapperField } from 'n8n-workflow';

/**
 * Traduce los `components` de una plantilla WABA (formato crudo de Meta) a los campos
 * editables que se muestran en el nodo, con el ejemplo de la plantilla como valor por
 * defecto.
 *
 * Los IDs son deterministas y ordenables porque el preSend los reparte por prefijo:
 *   body_1, body_2…      → variables del cuerpo (en orden)
 *   header_1, header_2…  → variables del encabezado de texto
 *   header_media         → URL de la imagen/video/documento del encabezado
 *   button_1, button_2…  → parámetro dinámico de cada botón
 */

export const TEMPLATE_FIELD_PREFIX = {
	body: 'body_',
	header: 'header_',
	headerMedia: 'header_media',
	button: 'button_',
} as const;

/** Formato del encabezado, para saber a qué propiedad del body va la URL. */
export type HeaderFormat = 'IMAGE' | 'VIDEO' | 'DOCUMENT' | 'TEXT' | 'NONE';

export interface TemplateLayout {
	fields: ResourceMapperField[];
	headerFormat: HeaderFormat;
	/** Botones tal como los devuelve el API, para reconstruirlos al enviar. */
	buttons: IDataObject[];
}

function asObject(value: unknown): IDataObject | undefined {
	return value !== null && typeof value === 'object' && !Array.isArray(value)
		? (value as IDataObject)
		: undefined;
}

function asArray(value: unknown): unknown[] {
	return Array.isArray(value) ? value : [];
}

function asText(value: unknown): string | undefined {
	return typeof value === 'string' && value.trim() !== '' ? value : undefined;
}

/** Cantidad de marcadores {{n}} distintos en un texto de plantilla. */
export function countPlaceholders(text: string): number {
	const found = new Set<number>();
	for (const match of text.matchAll(/\{\{\s*(\d+)\s*\}\}/g)) {
		found.add(Number(match[1]));
	}
	if (found.size === 0) return 0;
	// Meta numera desde 1 y sin huecos; se usa el mayor por seguridad.
	return Math.max(...found);
}

function field(
	id: string,
	displayName: string,
	defaultValue?: string,
	required = true,
): ResourceMapperField {
	return {
		id,
		displayName,
		required,
		display: true,
		defaultMatch: false,
		canBeUsedToMatch: false,
		type: 'string',
		...(defaultValue !== undefined ? { defaultValue } : {}),
	};
}

/**
 * Campos de una plantilla. Las variables se listan aunque la plantilla no traiga
 * `example` (se detectan por los marcadores del texto), para que nunca falte un dato
 * obligatorio en el envío.
 */
export function buildTemplateLayout(template: IDataObject): TemplateLayout {
	const fields: ResourceMapperField[] = [];
	let headerFormat: HeaderFormat = 'NONE';
	let buttons: IDataObject[] = [];
	let hayCuerpo = false;

	const components = asArray(template.components)
		.map((component) => asObject(component))
		.filter((component): component is IDataObject => component !== undefined);

	for (const component of components) {
		const tipo = (asText(component.type) ?? '').toUpperCase();
		const example = asObject(component.example) ?? {};

		if (tipo === 'HEADER') {
			const formato = (asText(component.format) ?? 'TEXT').toUpperCase();

			if (formato === 'TEXT') {
				headerFormat = 'TEXT';
				const texto = asText(component.text) ?? '';
				const ejemplos = asArray(example.header_text);
				const total = countPlaceholders(texto);
				for (let i = 0; i < total; i++) {
					fields.push(
						field(
							`${TEMPLATE_FIELD_PREFIX.header}${i + 1}`,
							`Encabezado · variable {{${i + 1}}}`,
							asText(ejemplos[i]),
						),
					);
				}
				continue;
			}

			if (formato === 'IMAGE' || formato === 'VIDEO' || formato === 'DOCUMENT') {
				headerFormat = formato;
				const handles = asArray(example.header_handle);
				const etiqueta =
					formato === 'IMAGE' ? 'imagen' : formato === 'VIDEO' ? 'video' : 'documento';
				// El formato va en el ID para no tener que adivinarlo luego por la extensión.
				fields.push(
					field(
						`${TEMPLATE_FIELD_PREFIX.headerMedia}_${formato}`,
						`Encabezado · URL de ${etiqueta}`,
						asText(handles[0]),
					),
				);
			}
			continue;
		}

		if (tipo === 'BODY') {
			hayCuerpo = true;
			const texto = asText(component.text) ?? '';
			// example.body_text es un array de filas de ejemplo: se usa la primera.
			const primeraFila = asArray(asArray(example.body_text)[0]);
			const total = countPlaceholders(texto);
			for (let i = 0; i < total; i++) {
				fields.push(
					field(
						`${TEMPLATE_FIELD_PREFIX.body}${i + 1}`,
						`Cuerpo · variable {{${i + 1}}}`,
						asText(primeraFila[i]),
					),
				);
			}
			continue;
		}

		if (tipo === 'BUTTONS') {
			buttons = asArray(component.buttons)
				.map((button) => asObject(button))
				.filter((button): button is IDataObject => button !== undefined);
		}
	}

	// Sin componente BODY, el texto del cuerpo llega en `data`: de ahí salen las variables.
	if (!hayCuerpo) {
		const texto = asText(template.data) ?? '';
		const total = countPlaceholders(texto);
		for (let i = 0; i < total; i++) {
			fields.push(
				field(`${TEMPLATE_FIELD_PREFIX.body}${i + 1}`, `Cuerpo · variable {{${i + 1}}}`),
			);
		}
	}

	// Algunas cuentas entregan los botones fuera de `components`.
	if (buttons.length === 0) {
		buttons = asArray(template.buttons)
			.map((button) => asObject(button))
			.filter((button): button is IDataObject => button !== undefined);
	}

	buttons.forEach((button, index) => {
		// Solo los botones con parámetro dinámico piden dato: una URL con {{1}} o un
		// código copiable (COPY_CODE), que Meta entrega en `example`.
		const tipoBoton = (asText(button.type) ?? '').toUpperCase();
		const url = asText(button.url) ?? '';
		const esDinamico = countPlaceholders(url) > 0 || tipoBoton === 'COPY_CODE';
		if (!esDinamico) return;

		const ejemplo = asText(asArray(button.example)[0]);
		const etiqueta = asText(button.text) ?? `Botón ${index + 1}`;
		fields.push(
			field(`${TEMPLATE_FIELD_PREFIX.button}${index + 1}`, `Botón · ${etiqueta}`, ejemplo),
		);
	});

	// Una plantilla mal formada podría repetir componentes: los IDs deben ser únicos.
	const vistos = new Set<string>();
	const unicos = fields.filter((f) => (vistos.has(f.id) ? false : vistos.add(f.id) !== undefined));

	return { fields: unicos, headerFormat, buttons };
}

/**
 * El valor del selector de plantillas codifica lo que esa plantilla necesita:
 * `nombre|v2|IMAGE` (identificador, nº de variables del cuerpo, formato del encabezado).
 *
 * Sirve para dos cosas que n8n no permite de otro modo: mostrar los campos "Variables" y
 * "URL del Encabezado" SOLO cuando la plantilla los usa (displayOptions únicamente puede
 * mirar otros parámetros, nunca datos del API), y validar sin volver a consultarla.
 * Es el mismo patrón del nodo oficial de WhatsApp, cuyo valor es `nombre|idioma`.
 */
export function encodeTemplateValue(
	identificador: string,
	variables: number,
	headerFormat: HeaderFormat,
): string {
	return `${identificador}|v${variables}|${headerFormat}`;
}

export interface DecodedTemplateValue {
	/** Nombre o ID con el que el API resuelve la plantilla. */
	identificador: string;
	/** Número de variables del cuerpo, o `undefined` si el valor no lo codifica. */
	variables?: number;
	headerFormat?: HeaderFormat;
}

/** Lee el valor del selector. Tolera valores antiguos (solo el identificador). */
export function decodeTemplateValue(value: string): DecodedTemplateValue {
	const partes = value.split('|');
	if (partes.length < 3) return { identificador: value };

	const formato = partes[partes.length - 1].toUpperCase();
	const marcador = partes[partes.length - 2];
	const identificador = partes.slice(0, -2).join('|');

	const variables = /^v\d+$/.test(marcador) ? Number(marcador.slice(1)) : undefined;
	const headerFormat = ['IMAGE', 'VIDEO', 'DOCUMENT', 'TEXT', 'NONE'].includes(formato)
		? (formato as HeaderFormat)
		: undefined;

	if (variables === undefined || headerFormat === undefined) return { identificador: value };
	return { identificador, variables, headerFormat };
}

/** Propiedad del body que corresponde a la URL del encabezado según su formato. */
export function headerUrlProperty(formato: HeaderFormat): string | undefined {
	if (formato === 'IMAGE') return 'url_imagen_encabezado';
	if (formato === 'VIDEO') return 'url_video_encabezado';
	if (formato === 'DOCUMENT') return 'url_documento_encabezado';
	return undefined;
}
