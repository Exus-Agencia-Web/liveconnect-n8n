import type { IDataObject, INode } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

const LABELS: Record<string, string> = {
	sendText: 'Send Text',
	sendImage: 'Send Image',
	sendFile: 'Send File',
	addTag: 'Add Tag',
	userDelegate: 'Delegate to User',
	teamDelegate: 'Delegate to Team',
	addVar: 'Create Variable',
	setVar: 'Set Variable',
	input: 'Wait for Reply',
	updateContact: 'Update Contact',
};

function fail(node: INode, itemIndex: number, pos: number, tipo: string, detalle: string): never {
	throw new NodeOperationError(node, `Action #${pos} (${LABELS[tipo] ?? tipo}): ${detalle}`, {
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
			`field "${campo}" must be text, but the expression returned an ${Array.isArray(value) ? 'array' : 'object'} — check the path of your expression (e.g. use contacto.nombre instead of contacto)`,
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
	if (s === '') fail(node, itemIndex, pos, tipo, `field "${campo}" is required and cannot be left empty`);
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
	if (!valid) fail(node, itemIndex, pos, tipo, `"${s}" is not a valid http(s) URL in field "${campo}"`);
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
	// Number('') === 0 passes Number.isInteger: reject empty values BEFORE casting.
	// Only number|string: Number(true)===1 and Number([5])===5 would let phantom IDs slip through.
	if (value === '' || value === null || value === undefined) {
		fail(node, itemIndex, pos, tipo, `field "${campo}" is required`);
	}
	if (typeof value !== 'number' && typeof value !== 'string') {
		fail(node, itemIndex, pos, tipo, `"${String(value)}" is not a valid ID in "${campo}" (must be an integer greater than 0)`);
	}
	const n = Number(value);
	if (!Number.isInteger(n) || n <= 0) {
		fail(
			node,
			itemIndex,
			pos,
			tipo,
			`"${String(value)}" is not a valid ID in "${campo}" (must be an integer greater than 0)`,
		);
	}
	return n;
}

const asStr = (value: unknown): string =>
	typeof value === 'string' ? value : value === null || value === undefined ? '' : String(value);

/**
 * UI item → callback contract action. Emits only the contract's keys (the server
 * rejects extra properties); validates required fields and casts IDs.
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
			// '' is valid: keep-alive (waits without showing any text)
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
			throw new NodeOperationError(node, `Action #${pos}: type "${tipo}" not supported`, {
				itemIndex,
			});
	}
}

/**
 * Golden rule of the contract: every turn closes with an `input` action (an empty one
 * works), UNLESS there's a delegation (userDelegate/teamDelegate) — in that case the bot
 * must exit the callback and any configured `input` is removed. Returns a copy.
 */
export function applyClosingRule(actions: IDataObject[]): IDataObject[] {
	const delega = actions.some((a) => a.type === 'userDelegate' || a.type === 'teamDelegate');
	if (delega) return actions.filter((a) => a.type !== 'input');
	// The input must be the LAST element — an input in the middle doesn't close the turn.
	const last = actions[actions.length - 1];
	if (last?.type === 'input') return actions;
	return [...actions, { type: 'input', input: '' }];
}

/** apiResp envelope that LiveConnect expects as the synchronous response to the callback. */
export function buildEnvelope(actions: IDataObject[]): IDataObject {
	return { status: 1, status_message: 'Ok', data: { actions } };
}
