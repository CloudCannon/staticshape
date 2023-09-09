import { ASTElementNode } from '../types';
import { getClassList } from './node-helper';

export function getElementSignature(element: ASTElementNode) {
	if (element.name === 'meta') {
		const nameAttr = element.attrs['name'];
		const propertyAttr = element.attrs['property'];
		const httpEquivAttr = element.attrs['http-equiv'];
		const charsetAttr = element.attrs['charset'];

		return [
			element.name,
			nameAttr?.value ||
				propertyAttr?.value ||
				httpEquivAttr?.value ||
				charsetAttr?.value ||
				'unknown'
		].join('_');
	}

	if (element.name === 'link') {
		const relAttr = element.attrs['rel'];

		return [element.name, relAttr?.value || 'unknown'].join('_');
	}

	const id = element.attrs['id']?.value?.trim();
	if (id) {
		return `#${id}`;
	}

	const classList = getClassList(element);
	const classes = classList.length > 0 ? `.${classList.join('.')}` : '';
	return `${element.name}${classes}`;
}
