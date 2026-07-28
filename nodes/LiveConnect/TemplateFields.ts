import type { IDataObject, ResourceMapperField } from 'n8n-workflow';

/**
 * Translates the `components` of a WABA template (Meta's raw format) into the editable
 * fields shown in the node, using the template's example as the default value.
 *
 * IDs are deterministic and sortable because the preSend distributes them by prefix:
 *   body_1, body_2…      → body variables (in order)
 *   header_1, header_2…  → text header variables
 *   header_media         → URL of the header image/video/document
 *   button_1, button_2…  → dynamic parameter of each button
 */

export const TEMPLATE_FIELD_PREFIX = {
	body: 'body_',
	header: 'header_',
	headerMedia: 'header_media',
	button: 'button_',
} as const;

/** Header format, used to know which body property the URL should go into. */
export type HeaderFormat = 'IMAGE' | 'VIDEO' | 'DOCUMENT' | 'TEXT' | 'NONE';

export interface TemplateLayout {
	fields: ResourceMapperField[];
	headerFormat: HeaderFormat;
	/** Buttons exactly as returned by the API, so they can be rebuilt when sending. */
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

/** Number of distinct {{n}} placeholders in a template text. */
export function countPlaceholders(text: string): number {
	const found = new Set<number>();
	for (const match of text.matchAll(/\{\{\s*(\d+)\s*\}\}/g)) {
		found.add(Number(match[1]));
	}
	if (found.size === 0) return 0;
	// Meta numbers them from 1 with no gaps; the highest one is used, just to be safe.
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
 * Fields of a template. Variables are listed even when the template has no `example`
 * (they're detected from the placeholders in the text), so a required value is never
 * missing when sending.
 */
export function buildTemplateLayout(template: IDataObject): TemplateLayout {
	const components = asArray(template.components)
		.map((component) => asObject(component))
		.filter((component): component is IDataObject => component !== undefined);

	// LiveConnect's actual format (Gupshup provider): the text with the placeholders lives
	// in `content` and the media type in `templateType`; there are no Meta `components`.
	if (components.length === 0) {
		return buildLayoutFromGupshup(template);
	}

	return buildLayoutFromMetaComponents(template, components);
}

/** Template text with its {{n}} placeholders, in any of its variants. */
export function templateContent(template: IDataObject): string {
	const containerMeta = asObject(template.containerMeta) ?? {};
	return (
		asText(template.content) ??
		asText(containerMeta.data) ??
		asText(template.data) ??
		asText(template.preview) ??
		''
	);
}

/**
 * Identifier to use when asking LiveConnect to send the template.
 *
 * LiveConnect works with SEVERAL WhatsApp providers, and each one resolves the template
 * by a different key (`sendTemplate` documents "Id/nombre de la plantilla"):
 * - **Gupshup** (row with `elementName`/`templateType`): the `id` (UUID). Sending the
 *   name instead returns `status:-1` «Invalid template id provided».
 * - **Direct Meta** (row with `components`): the NAME. Meta's long id
 *   (`667058365993373_67d4976c2921a_6360`) does not resolve.
 *
 * The decision is based on the shape of the row, which is the only thing that tells
 * the providers apart.
 */
export function templateSendIdentifier(template: IDataObject): string | undefined {
	const esMeta = asArray(template.components).length > 0;
	const claves = esMeta
		? ['name', 'templateName', 'elementName', 'id']
		: ['id', 'elementName', 'name', 'templateName'];
	for (const clave of claves) {
		const valor = asText(template[clave]);
		if (valor !== undefined) return valor.trim();
	}
	return undefined;
}

/** Human-readable template name as exposed by LiveConnect. */
export function templateName(template: IDataObject): string | undefined {
	for (const key of ['elementName', 'name', 'nombre', 'templateName', 'title']) {
		const value = asText(template[key]);
		if (value !== undefined) return value;
	}
	return undefined;
}

function buildLayoutFromGupshup(template: IDataObject): TemplateLayout {
	const fields: ResourceMapperField[] = [];
	const containerMeta = asObject(template.containerMeta) ?? {};

	// Positional body variables: {{1}}, {{2}}…
	const total = countPlaceholders(templateContent(template));
	for (let i = 0; i < total; i++) {
		fields.push(field(`${TEMPLATE_FIELD_PREFIX.body}${i + 1}`, `Variable {{${i + 1}}}`));
	}

	// The template type declares whether it carries media in the header.
	const tipo = (asText(template.templateType) ?? 'TEXT').toUpperCase();
	let headerFormat: HeaderFormat = 'NONE';
	if (tipo === 'IMAGE' || tipo === 'VIDEO' || tipo === 'DOCUMENT') {
		headerFormat = tipo;
		const etiqueta = tipo === 'IMAGE' ? 'Image' : tipo === 'VIDEO' ? 'Video' : 'Document';
		fields.push(
			field(
				`${TEMPLATE_FIELD_PREFIX.headerMedia}_${tipo}`,
				`${etiqueta} URL`,
				asText(template.mediaUrl) ?? asText(containerMeta.mediaUrl),
			),
		);
	} else if (tipo === 'TEXT') {
		headerFormat = 'TEXT';
	}

	const crudos = Array.isArray(template.buttons) ? template.buttons : containerMeta.buttons;
	const buttons = asArray(crudos)
		.map((button) => asObject(button))
		.filter((button): button is IDataObject => button !== undefined);

	buttons.forEach((button, index) => {
		const url = asText(button.url) ?? '';
		const tipoBoton = (asText(button.type) ?? '').toUpperCase();
		if (countPlaceholders(url) === 0 && tipoBoton !== 'COPY_CODE') return;
		const etiqueta = asText(button.text) ?? `Button ${index + 1}`;
		fields.push(
			field(
				`${TEMPLATE_FIELD_PREFIX.button}${index + 1}`,
				`Button · ${etiqueta}`,
				asText(asArray(button.example)[0]),
			),
		);
	});

	return { fields, headerFormat, buttons };
}

function buildLayoutFromMetaComponents(
	template: IDataObject,
	components: IDataObject[],
): TemplateLayout {
	const fields: ResourceMapperField[] = [];
	let headerFormat: HeaderFormat = 'NONE';
	let buttons: IDataObject[] = [];
	let hayCuerpo = false;

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
							`Header · variable {{${i + 1}}}`,
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
					formato === 'IMAGE' ? 'Image' : formato === 'VIDEO' ? 'Video' : 'Document';
				// The format goes in the ID so it doesn't have to be guessed later from the extension.
				fields.push(
					field(
						`${TEMPLATE_FIELD_PREFIX.headerMedia}_${formato}`,
						`Header · ${etiqueta} URL`,
						asText(handles[0]),
					),
				);
			}
			continue;
		}

		if (tipo === 'BODY') {
			hayCuerpo = true;
			const texto = asText(component.text) ?? '';
			// example.body_text is an array of example rows: the first one is used.
			const primeraFila = asArray(asArray(example.body_text)[0]);
			const total = countPlaceholders(texto);
			for (let i = 0; i < total; i++) {
				fields.push(
					field(
						`${TEMPLATE_FIELD_PREFIX.body}${i + 1}`,
						`Body · variable {{${i + 1}}}`,
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

	// Without a BODY component, the body text arrives in `data` — that's where the variables come from.
	if (!hayCuerpo) {
		const texto = asText(template.data) ?? '';
		const total = countPlaceholders(texto);
		for (let i = 0; i < total; i++) {
			fields.push(
				field(`${TEMPLATE_FIELD_PREFIX.body}${i + 1}`, `Body · variable {{${i + 1}}}`),
			);
		}
	}

	// Some accounts deliver the buttons outside of `components`.
	if (buttons.length === 0) {
		buttons = asArray(template.buttons)
			.map((button) => asObject(button))
			.filter((button): button is IDataObject => button !== undefined);
	}

	buttons.forEach((button, index) => {
		// Only buttons with a dynamic parameter require a value: a URL with {{1}} or a
		// copyable code (COPY_CODE), which Meta provides in `example`.
		const tipoBoton = (asText(button.type) ?? '').toUpperCase();
		const url = asText(button.url) ?? '';
		const esDinamico = countPlaceholders(url) > 0 || tipoBoton === 'COPY_CODE';
		if (!esDinamico) return;

		const ejemplo = asText(asArray(button.example)[0]);
		const etiqueta = asText(button.text) ?? `Button ${index + 1}`;
		fields.push(
			field(`${TEMPLATE_FIELD_PREFIX.button}${index + 1}`, `Button · ${etiqueta}`, ejemplo),
		);
	});

	// A malformed template could repeat components: IDs must be unique.
	const vistos = new Set<string>();
	const unicos = fields.filter((f) => (vistos.has(f.id) ? false : vistos.add(f.id) !== undefined));

	return { fields: unicos, headerFormat, buttons };
}

/**
 * The template selector's value encodes what that template needs:
 * `name|v2|IMAGE` (identifier, number of body variables, header format).
 *
 * This serves two purposes n8n doesn't otherwise allow: showing the "Variables" and
 * "Header URL" fields ONLY when the template uses them (displayOptions can only look
 * at other parameters, never at API data), and validating without querying it again.
 * It's the same pattern used by the official WhatsApp node, whose value is `name|language`.
 */
export function encodeTemplateValue(
	identificador: string,
	variables: number,
	headerFormat: HeaderFormat,
): string {
	return `${identificador}|v${variables}|${headerFormat}`;
}

export interface DecodedTemplateValue {
	/** Name or ID the API uses to resolve the template. */
	identificador: string;
	/** Number of body variables, or `undefined` if the value doesn't encode it. */
	variables?: number;
	headerFormat?: HeaderFormat;
}

/** Reads the selector's value. Tolerates legacy values (identifier only). */
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

/** Body property that corresponds to the header URL, based on its format. */
export function headerUrlProperty(formato: HeaderFormat): string | undefined {
	if (formato === 'IMAGE') return 'url_imagen_encabezado';
	if (formato === 'VIDEO') return 'url_video_encabezado';
	if (formato === 'DOCUMENT') return 'url_documento_encabezado';
	return undefined;
}
