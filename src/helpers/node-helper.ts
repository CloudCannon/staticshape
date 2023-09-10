import { ASTElementNode, ASTStaticAttribute } from '../types';

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

export function getClassList(element: ASTElementNode): string[] {
	const classAttr = element.attrs['class'];
	if (!classAttr) {
		return [];
	}
	if (classAttr.type === 'attribute') {
		return normalizeClassList(classAttr.value || '');
	}
	return classAttr.reference;
}

export function isAttrEquivalent(
	attrName: string,
	first: ASTStaticAttribute,
	second: ASTStaticAttribute
) {
	if (attrName === 'class') {
		const firstClassList = normalizeClassList(first?.value || '');
		const secondClassList = normalizeClassList(second?.value || '');

		return firstClassList.join('') === secondClassList.join('');
	}

	return first.value === second.value;
}
