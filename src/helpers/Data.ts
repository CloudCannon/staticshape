import { ASTElementNode } from '../types';
import { getElementSignature } from './getElementSignature';

export type Hash = Record<string, any>;

export function mergeHash(data: Hash, other: Hash) {
	const clone = structuredClone(data);
	Object.keys(other).forEach((key) => {
		if (!clone[key]) {
			clone[key] = other[key];
		}

		if (typeof clone[key] === 'object' && other[key]) {
			mergeHash(clone[key], other[key]);
		}
	});
	return clone;
}
export function joinNameParts(parts: string[]) {
	return parts
		.reduce((memo: string[], current: string): string[] => {
			if (current.trim()) {
				memo.push(current.trim());
			}
			return memo;
		}, [])
		.join('_');
}

export default class Data {
	chain: string[];
	data: Hash;

	constructor(chain: string[], data: Hash) {
		this.chain = chain;
		this.data = data;
	}

	set(variableName: string, value: any): void {
		this.data[variableName] = value;
	}

	empty(): boolean {
		return Object.keys(this.data).length === 0;
	}

	getChain(variableName: string): string[] {
		return [...this.chain, variableName];
	}

	getVariableName(parentElements: ASTElementNode[], prefix?: string, suffix?: string): string {
		const length = parentElements.length;
		const signature =
			length > 0 ? getElementSignature(parentElements[parentElements.length - 1]) : '';
		return this.versionedVarableName(joinNameParts([prefix || '', signature, suffix || '']));
	}

	versionedVarableName(variableName: string): string {
		if (!this.hasKey(variableName)) {
			return variableName;
		}
		for (let i = 0; i < 2000; i++) {
			const suffixed = joinNameParts([variableName, i.toString()]);
			if (!this.hasKey(suffixed)) {
				return suffixed;
			}
		}

		throw new Error('Too many variable collisions');
	}

	hasKey(variableName: string): boolean {
		return variableName in this.data;
	}

	merge(other: Data): Data {
		const clone = mergeHash(this.data, other.data);
		return new Data(this.chain, clone);
	}

	createSubdata(variableName: string, data?: Hash): Data {
		return new Data(this.getChain(variableName), data || {});
	}

	toJSON(): Hash {
		return this.data;
	}
}
