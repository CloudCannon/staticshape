import { distance, closest } from 'fastest-levenshtein';
import { normalizeClassList } from './node-helper';
import { ASTAttributeList, ASTElementNode, ASTNode } from '../types';
import { nodeDebugString } from '../logger';
import { booleanAttributes } from './attributes';
import { Logger } from '../logger';

export const loopThreshold = 0.89;

function diffScore(score: number, max: number) {
	if (max === 0) {
		return 1;
	}
	if (score === 0) {
		return 0;
	}
	return score / max;
}

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
	return diffScore(score, max);
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
		if (!secondAttr) {
			max += 1;
			return;
		}

		if (booleanAttributes[attrName]) {
			max += 1;
			score += 1;
			return;
		}

		if (!firstAttr) {
			return;
		}

		max += 2;
		score += 1;
		if (firstAttr.type !== 'attribute' || secondAttr.type !== 'attribute') {
			score += 1;
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

	return diffScore(score, max);
}

export function elementEquivalencyScore(first: ASTElementNode, second: ASTElementNode): number {
	if (first.name !== second.name) {
		return 0;
	}

	const attrsScores = attributesEquivalencyScore(first.attrs, second.attrs);
	const childScores = nodeTreeEquivalencyScore(first.children, second.children);
	return (1 + attrsScores + childScores) / 3;
}

export function nodeTreeEquivalencyScore(firstTree: ASTNode[], secondTree: ASTNode[]): number {
	const max = Math.max(firstTree.length, secondTree.length);
	let score = 0;
	for (let i = 0; i < max; i++) {
		const node = firstTree[i];
		const other = secondTree[i];

		// TODO best match comparison
		if (node && other) {
			score += nodeEquivalencyScore(node, other);
		}
	}
	return diffScore(score, max);
}

export function nodeEquivalencyScore(first: ASTNode, second: ASTNode): number {
	if (second.type === 'conditional') {
		return nodeEquivalencyScore(first, second.child);
	}

	if (first.type === 'conditional') {
		return nodeEquivalencyScore(first.child, second);
	}

	if (second.type === 'loop') {
		return nodeEquivalencyScore(first, second.template);
	}

	if (first.type === 'loop') {
		return nodeEquivalencyScore(first.template, second);
	}

	if (
		(first.type === 'text' && second.type === 'variable') ||
		(second.type === 'text' && first.type === 'variable') ||
		(first.type === 'text' && second.type === 'inline-markdown-variable') ||
		(second.type === 'text' && first.type === 'inline-markdown-variable')
	) {
		return 1;
	}

	if (
		(first.type === 'variable' && second.type === 'variable') ||
		(first.type === 'markdown-variable' && second.type === 'markdown-variable') ||
		(first.type === 'inline-markdown-variable' && second.type === 'inline-markdown-variable')
	) {
		return first.reference.join('') === second.reference.join('') ? 1 : 0.5;
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

	if (
		!(first.type === 'text' && second.type === 'element') &&
		!(first.type === 'element' && second.type === 'text') &&
		first.type === second.type
	) {
		console.warn(`${first.type} and ${second.type} comparison, not yet implemented`);
	}
	return 0;
}

export const isBestMatch = (currentTree: ASTNode[], otherTree: ASTNode[], logger?: Logger) => {
	const current = currentTree[0];
	const other = otherTree[0];
	const score = nodeEquivalencyScore(current, other);
	if (score === 0) {
		return false;
	}
	if (score === 1) {
		return true;
	}
	logger?.debug(
		'Compare lead nodes',
		nodeDebugString(current, 0, 0),
		'vs',
		nodeDebugString(other, 0, 0),
		score
	);

	for (let i = 1; i < currentTree.length; i++) {
		const currentAlternative = currentTree[i];

		let alternativeScore = nodeEquivalencyScore(currentAlternative, other);
		logger?.debug(
			'Compare current alternatives',
			nodeDebugString(currentAlternative, 0, 0),
			'vs',
			nodeDebugString(other, 0, 0),
			alternativeScore,
			score
		);
		if (alternativeScore > score) {
			return false;
		}
	}
	for (let i = 1; i < otherTree.length; i++) {
		const otherAlternative = otherTree[i];

		let alternativeScore = nodeEquivalencyScore(otherAlternative, current);
		logger?.debug(
			'Compare other alternatives',
			nodeDebugString(otherAlternative, 0, 0),
			'vs',
			nodeDebugString(current, 0, 0),
			alternativeScore,
			score
		);
		if (alternativeScore > score) {
			return false;
		}
	}

	return true;
};
