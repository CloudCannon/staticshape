import { ASTAttributeList, ASTNode } from '../types';
import { nodeEquivalencyScore } from './node-equivalency';

function mergeAttributes(
	firstAttrs: ASTAttributeList,
	secondAttrs: ASTAttributeList
): ASTAttributeList {
	const merged = {} as ASTAttributeList;

	Object.keys(firstAttrs).forEach((attrName) => {
		if (!secondAttrs[attrName]) {
			if (firstAttrs[attrName].type === 'conditional-attribute') {
				merged[attrName] = firstAttrs[attrName];
			} else {
				console.log('unhandled extra attr', attrName, firstAttrs, secondAttrs);
			}
			return;
		}

		if (firstAttrs[attrName].type === 'variable-attribute') {
			merged[attrName] = firstAttrs[attrName];
		} else {
			merged[attrName] = secondAttrs[attrName];
		}
		delete secondAttrs[attrName];
	});

	Object.keys(secondAttrs).forEach((attrName) => {
		if (secondAttrs[attrName].type === 'conditional-attribute') {
			merged[attrName] = secondAttrs[attrName];
		} else {
			console.log('unhandled extra attr', attrName, secondAttrs, firstAttrs);
		}
	});

	return merged;
}

export function mergeTree(firstTree: ASTNode[], secondTree: ASTNode[]): ASTNode[] {
	let firstPointer = 0;
	let secondPointer = 0;

	const merged = [];
	while (firstPointer < firstTree.length && secondPointer < secondTree.length) {
		const firstRemaining = firstTree.length - firstPointer;
		const secondRemaining = secondTree.length - secondPointer;

		const firstNode = firstTree[firstPointer];
		const secondNode = secondTree[secondPointer];

		if (nodeEquivalencyScore(firstNode, secondNode) === 1) {
			firstPointer += 1;
			secondPointer += 1;

			if (firstNode.type === 'variable' || firstNode.type === 'conditional') {
				merged.push(firstNode);
			} else if (secondNode.type === 'variable' || secondNode.type === 'conditional') {
				merged.push(secondNode);
			} else if (firstNode.type === 'element' && secondNode.type === 'element') {
				merged.push({
					...firstNode,
					attrs: mergeAttributes(firstNode.attrs, secondNode.attrs),
					children: mergeTree(firstNode.children, secondNode.children)
				});
			} else {
				merged.push(firstNode);
			}
		} else if (firstRemaining > secondRemaining) {
			merged.push(firstNode);
			firstPointer += 1;
		} else {
			merged.push(secondNode);
			secondPointer += 1;
		}
	}

	while (firstPointer < firstTree.length) {
		const remainingNode = firstTree[firstPointer];
		merged.push(remainingNode);
		firstPointer += 1;
	}

	while (secondPointer < secondTree.length) {
		const remainingNode = secondTree[secondPointer];
		merged.push(remainingNode);
		secondPointer += 1;
	}

	return merged;
}
