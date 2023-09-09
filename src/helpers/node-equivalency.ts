import { distance, closest } from 'fastest-levenshtein';
import { normalizeClassList } from './node-helper';
import { ASTAttributeList, ASTElementNode, ASTNode } from '../types';

export const loopThreshold = 0.85;

export function textEquivalencyScore(first: string | null, second: string | null): number {
	second = second || '';
	first = first || '';
	const diff = Math.abs(distance(second, first));
	if (diff === 0) {
		return 1;
	}

	const max = Math.max(second.length, first.length);
	if (diff > max) {
	}
	return 1 - diff / max;
}

export function arrayEquivalencyScore(first: string[], second: string[]): number {
	const max = Math.max(second.length, first.length);
	if (max === 0) {
		return 1;
	}
	let score = 0;
	const unmatched = [] as string[];
	for (let i = 0; i < first.length; i++) {
		const str = first[i];
		const index = second.indexOf(str);
		if (index >= 0) {
			second.splice(index, 1);
			score += 1;
		} else {
			unmatched.push(str);
		}
	}
	for (let i = 0; i < unmatched.length; i++) {
		const str = unmatched[i];
		const closestMatch = closest(str, second);
		if (closestMatch) {
			const index = second.indexOf(closestMatch);
			second.splice(index, 1);
			score += textEquivalencyScore(str, closestMatch);
		}
	}
	return score / max;
}

export function attributesEquivalencyScore(
	firstAttrs: ASTAttributeList,
	secondAttrs: ASTAttributeList
): number {
	let max = 0;
	let score = 0;
	Object.keys(firstAttrs).forEach((attrName) => {
		const firstAttr = firstAttrs[attrName];
		const secondAttr = secondAttrs[attrName];
		if (!secondAttrs[attrName]) {
			max += 1;
			return;
		}

		max += 2;
		score += 1;
		if (firstAttr.type !== 'attribute' || secondAttr.type !== 'attribute') {
			console.warn('non-static attr comparison not implemented', firstAttr, secondAttr);
			return;
		}

		if (attrName === 'class') {
			score += arrayEquivalencyScore(
				normalizeClassList(firstAttr.value),
				normalizeClassList(secondAttr.value || '')
			);
		} else {
			score += textEquivalencyScore(firstAttr.value, secondAttr.value || '');
		}
	});

	Object.keys(secondAttrs).forEach((attrName) => {
		if (!firstAttrs[attrName]) {
			max += 1;
		}
	});

	if (max === 0) {
		return 1;
	}
	if (score === 0) {
		return 0;
	}
	return score / max;
}

export function elementEquivalencyScore(first: ASTElementNode, second: ASTElementNode): number {
	if (first.name !== second.name) {
		return 0;
	}

	const attrsScores = attributesEquivalencyScore(first.attrs, second.attrs);
	// TODO children scores
	return (1 + attrsScores) / 2;
}

export function nodeEquivalencyScore(first: ASTNode, second: ASTNode): number {
	if (second.type === 'conditional') {
		return nodeEquivalencyScore(first, second.child);
	}

	if (first.type === 'conditional') {
		return nodeEquivalencyScore(first.child, second);
	}

	if (
		(first.type === 'text' && second.type === 'variable') ||
		(second.type === 'text' && first.type === 'variable')
	) {
		return 1;
	}

	if (first.type === 'variable' && second.type === 'variable') {
		return first.reference === second.reference ? 1 : 0.5;
	}

	if (first.type === 'element' && second.type === 'element') {
		if (first.name !== second.name) {
			return 0;
		}
		return (1 + elementEquivalencyScore(second, first)) / 2;
	}

	if (first.type === 'content' && second.type === 'content') {
		return 1;
	}

	if (
		(first.type === 'text' && second.type === 'text') ||
		(first.type === 'comment' && second.type === 'comment') ||
		(first.type === 'doctype' && second.type === 'doctype') ||
		(first.type === 'cdata' && second.type === 'cdata')
	) {
		return (1 + textEquivalencyScore(second.value, first.value)) / 2;
	}

	console.warn(`${first.type} and ${second.type} comparison, not yet implemented`);
	return 0;
}

export const isBestMatch = (
	current: ASTNode,
	other: ASTNode,
	currentTree: ASTNode[],
	otherTree: ASTNode[]
) => {
	const score = nodeEquivalencyScore(current, other);
	if (score === 0) {
		return false;
	}

	for (let i = 0; i < currentTree.length; i++) {
		const currentAlternative = currentTree[i];

		let alternativeScore = nodeEquivalencyScore(currentAlternative, other);
		if (alternativeScore > score) {
			return false;
		}
	}

	return true;
};
