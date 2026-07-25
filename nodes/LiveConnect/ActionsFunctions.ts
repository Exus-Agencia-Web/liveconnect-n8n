import type { IDataObject, INode } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

const LABELS: Record<string, string> = {
	sendText: 'Enviar Texto',
	sendImage: 'Enviar Imagen',
	sendFile: 'Enviar Archivo',
	addTag: 'Agregar Etiqueta',
	userDelegate: 'Delegar a Usuario',
	teamDelegate: 'Delegar a Equipo',
	addVar: 'Crear Variable',
	setVar: 'Actualizar Variable',
	input: 'Esperar Respuesta',
	updateContact: 'Actualizar Contacto',
};

function fail(node: INode, itemIndex: number, pos: number, tipo: string, detalle: string): never {
	throw new NodeOperationError(node, `Acción #${pos} (${LABELS[tipo] ?? tipo}): ${detalle}`, {
		itemIndex,
	});
}

function rejectNonScalar(
	node: INode,
	itemIndex: number,
	pos: number,
	tipo: string,
	campo: string,
	value: unknown,
): void {
	if (value !== null && typeof value === 'object') {
		fail(
			node,
			itemIndex,
			pos,
			tipo,
			`el campo "${campo}" debe ser texto, pero la expresión devolvió un ${Array.isArray(value) ? 'array' : 'objeto'} — revisa la ruta de tu expresión (p.ej. usa contacto.nombre en vez de contacto)`,
		);
	}
}

function requireText(
	node: INode,
	itemIndex: number,
	pos: number,
	tipo: string,
	campo: string,
	value: unknown,
): string {
	rejectNonScalar(node, itemIndex, pos, tipo, campo, value);
	const s = typeof value === 'string' ? value.trim() : String(value ?? '').trim();
	if (s === '') fail(node, itemIndex, pos, tipo, `el campo "${campo}" es obligatorio y no puede quedar vacío`);
	return s;
}

function requireUrl(
	node: INode,
	itemIndex: number,
	pos: number,
	tipo: string,
	campo: string,
	value: unknown,
): string {
	const s = requireText(node, itemIndex, pos, tipo, campo, value);
	let valid = false;
	try {
		const u = new URL(s);
		valid = u.protocol === 'http:' || u.protocol === 'https:';
	} catch {
		valid = false;
	}
	if (!valid) fail(node, itemIndex, pos, tipo, `"${s}" no es una URL http(s) válida en el campo "${campo}"`);
	return s;
}

function requireId(
	node: INode,
	itemIndex: number,
	pos: number,
	tipo: string,
	campo: string,
	value: unknown,
): number {
	// Number('') === 0 pasa Number.isInteger: rechazar vacío ANTES de castear.
	// Solo number|string: Number(true)===1 y Number([5])===5 colarían IDs fantasma.
	if (value === '' || value === null || value === undefined) {
		fail(node, itemIndex, pos, tipo, `el campo "${campo}" es obligatorio`);
	}
	if (typeof value !== 'number' && typeof value !== 'string') {
		fail(node, itemIndex, pos, tipo, `"${String(value)}" no es un ID válido en "${campo}" (debe ser un entero mayor que 0)`);
	}
	const n = Number(value);
	if (!Number.isInteger(n) || n <= 0) {
		fail(
			node,
			itemIndex,
			pos,
			tipo,
			`"${String(value)}" no es un ID válido en "${campo}" (debe ser un entero mayor que 0)`,
		);
	}
	return n;
}

const asStr = (value: unknown): string =>
	typeof value === 'string' ? value : value === null || value === undefined ? '' : String(value);

/**
 * Item de la UI → action del contrato del callback. Solo emite las claves del
 * contrato (el servidor rechaza propiedades extra); valida obligatorios y castea IDs.
 */
export function toAction(node: INode, ui: IDataObject, pos: number, itemIndex: number): IDataObject {
	const tipo = asStr(ui.tipo);
	switch (tipo) {
		case 'sendText':
			return { type: tipo, text: requireText(node, itemIndex, pos, tipo, 'text', ui.text) };
		case 'sendImage':
		case 'sendFile':
			return { type: tipo, url: requireUrl(node, itemIndex, pos, tipo, 'url', ui.url) };
		case 'addTag':
			return { type: tipo, id_tag: requireId(node, itemIndex, pos, tipo, 'id_tag', ui.id_tag) };
		case 'userDelegate': {
			const action: IDataObject = {
				type: tipo,
				id_user: requireId(node, itemIndex, pos, tipo, 'id_user', ui.id_user),
				user_name: requireText(node, itemIndex, pos, tipo, 'user_name', ui.user_name),
			};
			const avatar = asStr(ui.user_avatar).trim();
			if (avatar !== '') {
				action.user_avatar = requireUrl(node, itemIndex, pos, tipo, 'user_avatar', avatar);
			}
			return action;
		}
		case 'teamDelegate':
			return { type: tipo, id_team: requireId(node, itemIndex, pos, tipo, 'id_team', ui.id_team) };
		case 'addVar':
		case 'setVar':
			rejectNonScalar(node, itemIndex, pos, tipo, 'varvalue', ui.varvalue);
			return {
				type: tipo,
				varname: requireText(node, itemIndex, pos, tipo, 'varname', ui.varname),
				varvalue: asStr(ui.varvalue),
			};
		case 'input':
			// '' es válido: keep-alive (espera sin mostrar texto)
			rejectNonScalar(node, itemIndex, pos, tipo, 'input', ui.input);
			return { type: tipo, input: asStr(ui.input) };
		case 'updateContact':
			rejectNonScalar(node, itemIndex, pos, tipo, 'value', ui.value);
			return {
				type: tipo,
				key: requireText(node, itemIndex, pos, tipo, 'key', ui.key),
				value: asStr(ui.value),
			};
		default:
			throw new NodeOperationError(node, `Acción #${pos}: tipo "${tipo}" no soportado`, {
				itemIndex,
			});
	}
}

/**
 * Regla de oro del contrato: todo turno cierra con una acción `input` (vacía sirve),
 * SALVO que haya delegación (userDelegate/teamDelegate) — en ese caso el bot debe
 * salir del callback y cualquier `input` configurado se elimina. Devuelve copia.
 */
export function applyClosingRule(actions: IDataObject[]): IDataObject[] {
	const delega = actions.some((a) => a.type === 'userDelegate' || a.type === 'teamDelegate');
	if (delega) return actions.filter((a) => a.type !== 'input');
	// El input debe ser el ÚLTIMO elemento — un input intermedio no cierra el turno.
	const last = actions[actions.length - 1];
	if (last?.type === 'input') return actions;
	return [...actions, { type: 'input', input: '' }];
}

/** Envelope apiResp que LiveConnect espera como respuesta síncrona del callback. */
export function buildEnvelope(actions: IDataObject[]): IDataObject {
	return { status: 1, status_message: 'Ok', data: { actions } };
}
