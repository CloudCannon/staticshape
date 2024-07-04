import { ASTAttribute, ASTElementNode } from '../types.js';
import { getClassList } from './node-helper.js';

function getAttributeSignature(attr: ASTAttribute | undefined): string | null {
	if (attr?.type === 'attribute') {
		return attr.value?.trim();
	}
	return null;
}

export function getElementSignature(element: ASTElementNode) {
	if (element.name === 'meta') {
		const nameAttr = element.attrs['name'];
		const propertyAttr = element.attrs['property'];
		const httpEquivAttr = element.attrs['http-equiv'];
		const charsetAttr = element.attrs['charset'];

		return [
			element.name,
			getAttributeSignature(nameAttr) ||
				getAttributeSignature(propertyAttr) ||
				getAttributeSignature(httpEquivAttr) ||
				getAttributeSignature(charsetAttr) ||
				'unknown'
		].join('_');
	}

	if (element.name === 'link') {
		const relAttr = element.attrs['rel'];

		return [element.name, getAttributeSignature(relAttr) || 'unknown'].join('_');
	}

	const id = getAttributeSignature(element.attrs['id']);
	if (id) {
		return `${element.name}_${id}`;
	}

	const classList = getClassList(element);
	const classes = classList.length > 0 ? `_${classList.join('_')}` : '';
	return `${element.name}${classes}`;
}
