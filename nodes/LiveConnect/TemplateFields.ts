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

/** ID del campo único que contiene la estructura JSON de la plantilla. */
export const TEMPLATE_PAYLOAD_FIELD = 'datos';

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
 * Ordena por el número del sufijo (body_2 antes que body_10). Los IDs sin número
 * (p. ej. `header_media_IMAGE`) van al final con orden estable, para no volver
 * inconsistente al comparador.
 */
function bySuffixNumber(a: string, b: string): number {
	const num = (id: string) => {
		const parsed = Number(id.slice(id.lastIndexOf('_') + 1));
		return Number.isFinite(parsed) ? parsed : Number.MAX_SAFE_INTEGER;
	};
	const diff = num(a) - num(b);
	return diff !== 0 ? diff : a.localeCompare(b);
}

/** Valores del campo agrupados por destino en el body del API. */
export interface TemplatePayload {
	variables: string[];
	variablesEncabezado: string[];
	urlEncabezado?: string;
	/** Formato declarado por la plantilla para el medio del encabezado. */
	formatoEncabezado?: HeaderFormat;
	botones: Record<number, string>;
}

/** Reparte los valores editados por el usuario según el prefijo de su ID. */
export function splitTemplateValues(values: IDataObject): TemplatePayload {
	const body: string[] = [];
	const header: string[] = [];
	const botones: Record<number, string> = {};
	let urlEncabezado: string | undefined;
	let formatoEncabezado: HeaderFormat | undefined;

	for (const id of Object.keys(values).sort(bySuffixNumber)) {
		const raw = values[id];
		const valor = raw === null || raw === undefined ? '' : String(raw);

		// Debe comprobarse ANTES que `header_`, porque el ID empieza igual.
		if (id.startsWith(TEMPLATE_FIELD_PREFIX.headerMedia)) {
			if (valor !== '') {
				urlEncabezado = valor;
				const sufijo = id.slice(TEMPLATE_FIELD_PREFIX.headerMedia.length + 1).toUpperCase();
				if (sufijo === 'IMAGE' || sufijo === 'VIDEO' || sufijo === 'DOCUMENT') {
					formatoEncabezado = sufijo;
				}
			}
			continue;
		}
		if (id.startsWith(TEMPLATE_FIELD_PREFIX.body)) {
			body.push(valor);
			continue;
		}
		if (id.startsWith(TEMPLATE_FIELD_PREFIX.header)) {
			header.push(valor);
			continue;
		}
		if (id.startsWith(TEMPLATE_FIELD_PREFIX.button)) {
			const indice = Number(id.slice(TEMPLATE_FIELD_PREFIX.button.length));
			if (Number.isInteger(indice) && valor !== '') botones[indice] = valor;
		}
	}

	return { variables: body, variablesEncabezado: header, urlEncabezado, formatoEncabezado, botones };
}

/** Propiedad del body que corresponde a la URL del encabezado según su formato. */
export function headerUrlProperty(formato: HeaderFormat): string | undefined {
	if (formato === 'IMAGE') return 'url_imagen_encabezado';
	if (formato === 'VIDEO') return 'url_video_encabezado';
	if (formato === 'DOCUMENT') return 'url_documento_encabezado';
	return undefined;
}

/* ------------------------------------------------------------------ *
 * Estructura editable de la plantilla (formato estilo Meta)
 * ------------------------------------------------------------------ */

export interface TemplateExampleHeader {
	type: 'text' | 'image' | 'video' | 'document';
	/** Variables del encabezado de texto. */
	variables?: string[];
	/** URL del medio (imagen, video o documento). */
	url?: string;
}

export interface TemplateExampleButton {
	index: number;
	type: string;
	parameter: string;
}

export interface TemplateExample {
	header?: TemplateExampleHeader;
	body?: string[];
	buttons?: TemplateExampleButton[];
}

/**
 * Estructura que la plantilla necesita para enviarse, con los ejemplos de Meta como
 * valores. Solo incluye las claves que esa plantilla usa: lo que se ve es exactamente
 * lo que hay que rellenar.
 */
export function buildTemplateExample(template: IDataObject): TemplateExample {
	const { fields, headerFormat, buttons } = buildTemplateLayout(template);
	const valorDe = (id: string): string => {
		const campo = fields.find((f) => f.id === id);
		const valor = campo?.defaultValue;
		return typeof valor === 'string' ? valor : '';
	};

	const ejemplo: TemplateExample = {};

	// Encabezado: variables de texto o URL del medio.
	const variablesEncabezado = fields
		.filter((f) => f.id.startsWith(TEMPLATE_FIELD_PREFIX.header) && !f.id.startsWith(TEMPLATE_FIELD_PREFIX.headerMedia))
		.map((f) => (typeof f.defaultValue === 'string' ? f.defaultValue : ''));
	if (headerFormat === 'TEXT' && variablesEncabezado.length > 0) {
		ejemplo.header = { type: 'text', variables: variablesEncabezado };
	} else if (headerFormat === 'IMAGE' || headerFormat === 'VIDEO' || headerFormat === 'DOCUMENT') {
		ejemplo.header = {
			type: headerFormat.toLowerCase() as TemplateExampleHeader['type'],
			url: valorDe(`${TEMPLATE_FIELD_PREFIX.headerMedia}_${headerFormat}`),
		};
	}

	const variablesCuerpo = fields
		.filter((f) => f.id.startsWith(TEMPLATE_FIELD_PREFIX.body))
		.map((f) => (typeof f.defaultValue === 'string' ? f.defaultValue : ''));
	if (variablesCuerpo.length > 0) ejemplo.body = variablesCuerpo;

	const botones = fields
		.filter((f) => f.id.startsWith(TEMPLATE_FIELD_PREFIX.button))
		.map((f) => {
			const indice = Number(f.id.slice(TEMPLATE_FIELD_PREFIX.button.length));
			const definicion = buttons[indice - 1] ?? {};
			const tipo = typeof definicion.type === 'string' ? definicion.type.toLowerCase() : 'url';
			return {
				index: indice - 1,
				type: tipo,
				parameter: typeof f.defaultValue === 'string' ? f.defaultValue : '',
			};
		});
	if (botones.length > 0) ejemplo.buttons = botones;

	return ejemplo;
}

/** Traduce la estructura editable a las propiedades que espera el cuerpo de la petición. */
export function templateExampleToBody(example: TemplateExample): IDataObject {
	const body: IDataObject = {};

	if (Array.isArray(example.body) && example.body.length > 0) {
		body.variables = example.body.map((valor) => String(valor ?? ''));
	}

	const header = example.header;
	if (header !== undefined && header !== null) {
		const tipo = (header.type ?? '').toString().toUpperCase();
		if (tipo === 'TEXT' && Array.isArray(header.variables) && header.variables.length > 0) {
			body.variables_encabezado = header.variables.map((valor) => String(valor ?? ''));
		}
		const url = typeof header.url === 'string' ? header.url.trim() : '';
		if (url !== '') {
			const propiedad = headerUrlProperty(tipo as HeaderFormat) ?? 'url_imagen_encabezado';
			body[propiedad] = url;
		}
	}

	if (Array.isArray(example.buttons) && example.buttons.length > 0) {
		body.buttons = example.buttons as unknown as IDataObject[];
	}

	return body;
}
