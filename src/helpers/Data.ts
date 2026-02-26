import { ASTAttribute, ASTElementNode } from '../types.ts';
import { getElementSignature } from './getElementSignature.ts';
import { getClassList } from './node-helper.ts';
import VariationMap, { extractStaticContext } from './variation-map.ts';

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
	return variable.replaceAll(/([\[\]\(\)%—,\-\:])+/g, '_');
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
	variationMap?: VariationMap;
	variationScope: string;

	constructor(chain: string[], data: Record<string, any>) {
		this.chain = chain;
		this.data = data;
		this.variationScope = '';
	}

	set(variableName: string, value: any): void {
		const formatted = formatVariable(variableName);
		this.data[formatted] = value;
		this.variationMap?.recordValue(formatted, value, this.variationScope);
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
		const lastElement = length > 0 ? parentElements[length - 1] : undefined;

		const signature = lastElement ? getElementSignature(lastElement) : '';
		const key = this.versionedVarableName(joinNameParts([prefix || '', signature, suffix || '']));

		if (this.variationMap && lastElement) {
			this.variationMap.record(key, {
				sourceElement: extractStaticContext(lastElement),
				suffix: suffix || undefined,
				scope: this.variationScope
			});
		}

		return key;
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
		const merged = new Data(this.chain, clone);
		merged.variationMap = this.variationMap ?? other.variationMap;
		merged.variationScope = this.variationScope;
		return merged;
	}

	createSubdata(variableName: string, data?: Record<string, any>): Data {
		const sub = new Data(this.getChain(formatVariable(variableName)), data || {});
		sub.variationMap = this.variationMap;
		sub.variationScope = formatVariable(variableName);
		return sub;
	}

	withVariationMap(map: VariationMap): Data {
		this.variationMap = map;
		return this;
	}

	withScope(scope: string): Data {
		this.variationScope = scope;
		return this;
	}

	toJSON(): Record<string, any> {
		return this.data;
	}
}
