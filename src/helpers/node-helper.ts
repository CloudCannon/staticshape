import { ASTAttribute, ASTElementNode } from '../types';

export function normalizeClassList(value: string) {
	const classList = (value || '')
		.split(' ')
		.reduce((list: string[], className: string): string[] => {
			const trimmed = className.trim();
			if (trimmed) {
				list.push(trimmed);
			}
			return list;
		}, [] as string[]);
	return classList.sort();
}

export function getClassList(element: ASTElementNode) {
	const classAttr = element.attrs['class'];
	return normalizeClassList(classAttr?.value || '');
}

export function isAttrEquivalent(attrName: string, first: ASTAttribute, second: ASTAttribute) {
	if (attrName === 'class') {
		const firstClassList = normalizeClassList(first?.value || '');
		const secondClassList = normalizeClassList(second?.value || '');

		return firstClassList.join('') === secondClassList.join('');
	}

	return first.value === second.value;
}
