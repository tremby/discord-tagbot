import * as thisModule from './string';

export function pluralize(word: string, num: number, pluralSuffix: string = "s", singularSuffix: string = ""): string {
	return `${word}${num === 1 ? singularSuffix : pluralSuffix}`;
}

export function msToHumanReadable(ms: number): string {
	if (ms < 1e3) return "less than a second";
	const s = Math.floor(ms / 1e3 % 60);
	const m = Math.floor(ms / 1e3 / 60 % 60);
	const h = Math.floor(ms / 1e3 / 60 / 60 % 24);
	const d = Math.floor(ms / 1e3 / 60 / 60 / 24);
	const parts = [];
	if (d > 0) parts.push(`${d} ${thisModule.pluralize("day", d)}`);
	if (h > 0) parts.push(`${h} ${thisModule.pluralize("hour", h)}`);
	if (m > 0) parts.push(`${m} ${thisModule.pluralize("minute", m)}`);
	if (s > 0) parts.push(`${s} ${thisModule.pluralize("second", s)}`);
	return parts.join(", ");
}

export function toList(input: Set<any> | any[], joiningWord: string = "and"): string {
	const arr = [...input];
	if (arr.length === 0) return "";
	if (arr.length === 1) return arr[0].toString();
	if (arr.length === 2) return `${arr[0]} ${joiningWord} ${arr[1]}`;
	const last = arr.pop();
	return `${arr.join(", ")}, ${joiningWord} ${last}`;
}
