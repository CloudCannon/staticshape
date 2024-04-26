import { ASTAttribute, ASTElementNode } from '../types';
import { getElementSignature } from './getElementSignature';
import { getClassList } from './node-helper';

const htmlTagToVariableSuffix: Record<string, string> = {
	ol: 'list',
	ul: 'list',
	img: 'image'
};

const headingVariableNames = ['heading', 'subheading'];

const htmlTagToVariable: Record<string, string[]> = {
	h1: headingVariableNames,
	h2: headingVariableNames,
	h3: headingVariableNames,
	h4: headingVariableNames,
	h5: headingVariableNames,
	li: ['item']
};

function getAttributeSignature(attr: ASTAttribute | undefined): string | null {
	if (attr?.type === 'attribute') {
		return attr.value?.trim();
	}
	return null;
}

/**
 * 
 * @param variable string containing a variable name. 
 * @returns a string that is formatted to work across various ssgs.
 */
function formatVariable(variable: String){
	return variable.replaceAll(/([\-\:])+/g, '_');
}

export function getVariableNames(element: ASTElementNode): string[] {
	if (element.name === 'meta') {
		const nameAttr = element.attrs['name'];
		const propertyAttr = element.attrs['property'];
		const httpEquivAttr = element.attrs['http-equiv'];
		const charsetAttr = element.attrs['charset'];

		const signature = [element.name];
		const extraIdentifier =
			getAttributeSignature(nameAttr) ||
			getAttributeSignature(propertyAttr) ||
			getAttributeSignature(httpEquivAttr) ||
			getAttributeSignature(charsetAttr);
		if (extraIdentifier) {
			signature.push(extraIdentifier);
		}

		return [joinNameParts(signature)];
	}

	if (element.name === 'link') {
		const relAttr = element.attrs['rel'];
		const signature = [element.name];
		const extraIdentifier = getAttributeSignature(relAttr);
		if (extraIdentifier) {
			signature.push(extraIdentifier);
		}

		return [joinNameParts(signature)];
	}

	const options = [];

	if (htmlTagToVariable[element.name]) {
		options.push(...htmlTagToVariable[element.name]);
	}

	const suffix = htmlTagToVariableSuffix[element.name];
	const prefix = !suffix ? element.name : '';

	const id = getAttributeSignature(element.attrs['id']);
	if (id) {
		options.push(joinNameParts([prefix, id, suffix]));
	}

	const classList = getClassList(element);
	classList.forEach((className) => {
		options.push(joinNameParts([prefix, className, suffix]));
	});

	return options;
}

export type Hash = Record<string, any>;

// Merges for loops
export function mergeHash(data: Record<string, any>, other: Record<string, any>) {
	if (!data) {
		return data;
	}
	const clone = structuredClone(data);
	Object.keys(other).forEach((key) => {
		if (!(key in clone)) {
			clone[key] = other[key];
		}

		if (typeof clone[key] === 'object' && other[key]) {
			clone[key] = mergeHash(clone[key], other[key]);
		}
	});
	return clone;
}
export function joinNameParts(parts: string[]) {
	return parts
		.reduce((memo: string[], current: string | null): string[] => {
			if (current?.trim()) {
				memo.push(current.trim());
			}
			return memo;
		}, [])
		.join('_');
}

export default class Data {
	chain: string[];
	data: Record<string, any>;

	constructor(chain: string[], data: Record<string, any>) {
		this.chain = chain;
		this.data = data;
	}

	set(variableName: string, value: any): void {
		this.data[formatVariable(variableName)] = value;
	}

	delete(variableName: string): void {
		delete this.data[formatVariable(variableName)];
	}

	chainSet(variableNames: string[], value: any): void {
		const clone = structuredClone(variableNames);
		const leadName = clone.pop();
		const data = this.chainGet(clone);
		if (leadName && typeof data === 'object') {
			data[formatVariable(leadName)] = value;
		}
	}

	chainGet(variableNames: string[]): any | null {
		let data = this.data;
		for (let i = 0; i < variableNames.length; i++) {
			const variableName = formatVariable(variableNames[i]);
			if (!(variableName in data)) {
				return null;
			}
			data = data[variableName];
		}
		return data;
	}

	empty(): boolean {
		return Object.keys(this.data).length === 0;
	}

	getChain(variableName: string): string[] {
		return [...this.chain, formatVariable(variableName)];
	}

	getVariableName(parentElements: ASTElementNode[], prefix?: string, suffix?: string): string {
		const length = parentElements.length;

		// console.log(parentElements[parentElements.length - 1]);
		// const variableNames =
		// 	length > 0 ? getVariableNames(parentElements[parentElements.length - 1]) : [];
		// for (let i = 0; i < variableNames.length; i++) {
		// 	const element = variableNames[i];
		// 	if (!this.hasKey(element)) {
		// 		return element;
		// 	}
		// }
		const signature =
			length > 0 ? getElementSignature(parentElements[parentElements.length - 1]) : '';
		return this.versionedVarableName(joinNameParts([prefix || '', signature, suffix || '']));
	}

	versionedVarableName(variableName: string): string {
		if (!this.hasKey(formatVariable(variableName))) {
			return formatVariable(variableName);
		}
		for (let i = 0; i < 2000; i++) {
			const suffixed = joinNameParts([formatVariable(variableName), i.toString()]);
			if (!this.hasKey(suffixed)) {
				return suffixed;
			}
		}

		throw new Error('Too many variable collisions');
	}

	hasKey(variableName: string): boolean {
		return this.data && formatVariable(variableName) in this.data;
	}

	getKey(variableName: string): string | Record<string, any> | null | boolean | any[] {
		return this.data[formatVariable(variableName)];
	}

	merge(other: Data): Data {
		const clone = mergeHash(this.data, other.data);
		return new Data(this.chain, clone);
	}

	createSubdata(variableName: string, data?: Record<string, any>): Data {
		return new Data(this.getChain(formatVariable(variableName)), data || {});
	}

	toJSON(): Record<string, any> {
		return this.data;
	}
}
