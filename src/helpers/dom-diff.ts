import { ASTElementNode, ASTNode, ASTAttributeList, ASTValueNode } from '../types';
import { invalidLoopTags, findRepeatedIndex } from './loops';
import { isAttrEquivalent } from './node-helper';
import { nodeEquivalencyScore, isBestMatch, loopThreshold } from './node-equivalency';
import Data from './Data';

export function diffBasicNode(
	firstData: Data,
	secondData: Data,
	firstNode: ASTValueNode,
	secondNode: ASTValueNode,
	parentElements: ASTElementNode[]
): ASTNode {
	const valuesMatch = firstNode.value.trim() === secondNode.value.trim();
	if (valuesMatch) {
		return firstNode;
	}

	const variableName = firstData.getVariableName(parentElements);
	firstData.set(variableName, firstNode.value.trim());
	secondData.set(variableName, secondNode.value.trim());
	return {
		type: 'variable',
		reference: firstData.getChain(variableName)
	};
}

export function diffElementNode(
	depth: number,
	firstData: Data,
	secondData: Data,
	firstElement: ASTElementNode,
	secondElement: ASTElementNode,
	parentElements: ASTElementNode[]
): ASTNode {
	const tagsMatch = firstElement.name === secondElement.name;
	if (!tagsMatch) {
		throw new Error(`Mismatched node names ${firstElement.name}, ${secondElement.name}`);
	}

	const node = structuredClone(firstElement) as ASTElementNode;
	node.attrs = mergeAttrs(firstData, secondData, firstElement, secondElement);
	node.children = mergeTree(
		depth + 1,
		firstData,
		secondData,
		firstElement.children,
		secondElement.children,
		[...parentElements, firstElement]
	);
	return node;
}

export function diffNodes(
	depth: number,
	firstData: Data,
	secondData: Data,
	firstNode: ASTNode,
	secondNode: ASTNode,
	parentElements: ASTElementNode[]
): ASTNode {
	const typesMatch = firstNode.type === secondNode.type;
	if (!typesMatch) {
		throw new Error(`Mismatched node types ${firstNode.type}, ${secondNode.type}`);
	}

	switch (firstNode.type) {
		case 'content':
			return firstNode;
		case 'comment':
		case 'cdata':
		case 'text':
		case 'doctype':
			return diffBasicNode(
				firstData,
				secondData,
				firstNode,
				secondNode as ASTValueNode,
				parentElements
			);
		case 'element':
			return diffElementNode(
				depth,
				firstData,
				secondData,
				firstNode,
				secondNode as ASTElementNode,
				parentElements
			);

		default:
			break;
	}

	throw new Error(`Unknown node type ${secondNode.type}`);
}

export function mergeAttrs(
	firstData: Data,
	secondData: Data,
	firstElement: ASTElementNode,
	secondElement: ASTElementNode
): ASTAttributeList {
	const firstAttrs = firstElement.attrs;
	const secondAttrs = secondElement.attrs;
	const combined = {} as ASTAttributeList;

	const variableName = firstData.getVariableName([firstElement]);
	const firstAttrsData = firstData.createSubdata(variableName);
	const secondAttrsData = secondData.createSubdata(variableName);
	Object.keys(firstAttrs).forEach((attrName) => {
		if (!secondAttrs[attrName]) {
			firstAttrsData.set(attrName, firstAttrs[attrName].value);
			secondAttrsData.set(attrName, null);
			combined[attrName] = {
				type: 'conditional-attribute',
				name: attrName,
				reference: firstAttrsData.getChain(attrName)
			};
			return;
		}

		if (isAttrEquivalent(attrName, firstAttrs[attrName], secondAttrs[attrName])) {
			combined[attrName] = {
				type: 'attribute',
				name: attrName,
				value: secondAttrs[attrName].value
			};
		} else {
			firstAttrsData.set(attrName, firstAttrs[attrName].value);
			secondAttrsData.set(attrName, secondAttrs[attrName].value);
			combined[attrName] = {
				type: 'variable-attribute',
				name: attrName,
				reference: firstAttrsData.getChain(attrName)
			};
		}
	});

	Object.keys(secondAttrs).forEach((attrName) => {
		if (!combined[attrName]) {
			return;
		}

		if (!firstAttrs[attrName]) {
			firstAttrsData.set(attrName, null);
			secondAttrsData.set(attrName, secondAttrs[attrName].value);
			combined[attrName] = {
				type: 'conditional-attribute',
				name: attrName,
				reference: firstAttrsData.getChain(attrName)
			};
		}
	});

	if (!secondAttrsData.empty()) {
		firstData.set(variableName, firstAttrsData.data);
		secondData.set(variableName, secondAttrsData.data);
	}

	return combined;
}

interface Loop {
	firstItems: Data[];
	secondItems: Data[];
	template: ASTNode;
}

function buildLoop(
	firstEls: ASTElementNode[],
	secondEls: ASTElementNode[],
	parentElements: ASTElementNode[]
): Loop | null {
	const base = firstEls[0];
	let baseData = {};

	const firstItems = [] as Data[];
	const secondItems = [] as Data[];

	// TODO merge template and data like with Page and Layout
	let template = null;
	for (let i = 1; i < firstEls.length; i++) {
		const other = firstEls[i];
		const newBaseData = new Data([], {});
		const otherData = new Data([], {});
		template = diffNodes(0, newBaseData, otherData, base, other, [...parentElements, base]);

		baseData = newBaseData;
		firstItems.push(otherData);
	}

	for (let i = 0; i < secondEls.length; i++) {
		const other = secondEls[i];
		const newBaseData = new Data([], {});
		const otherData = new Data([], {});
		template = diffNodes(0, newBaseData, otherData, base, other, [...parentElements, base]);
		baseData = newBaseData;
		secondItems.push(otherData);
	}

	return template
		? {
				template,
				firstItems: [baseData, ...firstItems],
				secondItems
		  }
		: null;
}

export function mergeTree(
	depth: number,
	firstData: Data,
	secondData: Data,
	firstTree: ASTNode[],
	secondTree: ASTNode[],
	parentElements: ASTElementNode[]
): ASTNode[] {
	const merged = [] as ASTNode[];
	let firstPointer = 0;
	let secondPointer = 0;

	const addConditionalNode = (node: ASTNode, firstData: Data, secondData: Data) => {
		if (node.type === 'text' && !node.value.trim()) {
			merged.push(node);
		} else if (node.type === 'content') {
			merged.push(node);
		} else {
			const variableName = firstData.getVariableName(
				[...parentElements, node as ASTElementNode],
				'show',
				''
			);
			firstData.set(variableName, true);
			secondData.set(variableName, false);
			merged.push({
				type: 'conditional',
				reference: firstData.getChain(variableName),
				child: node
			});
		}
	};

	const addComparisonNode = (current: ASTNode, other: ASTNode) => {
		firstPointer += 1;
		secondPointer += 1;

		if (
			current.type === 'element' &&
			other.type === 'element' &&
			!invalidLoopTags[current.name] &&
			!invalidLoopTags[other.name]
		) {
			const score = nodeEquivalencyScore(current, other);
			if (score > loopThreshold) {
				const firstRemainingNodes = firstTree.slice(firstPointer);
				const secondRemainingNodes = secondTree.slice(secondPointer);

				const firstIndex = findRepeatedIndex(current, firstRemainingNodes);
				const secondIndex = findRepeatedIndex(current, secondRemainingNodes);

				if (firstIndex > 0 || secondIndex > 0) {
					const firstEls = [current, ...firstRemainingNodes.slice(0, firstIndex)].filter(
						(node) => node.type === 'element'
					) as ASTElementNode[];
					const secondEls = [other, ...secondRemainingNodes.slice(0, secondIndex)].filter(
						(node) => node.type === 'element'
					) as ASTElementNode[];

					const loopData = buildLoop(firstEls, secondEls, parentElements);
					if (loopData) {
						const { firstItems, secondItems, template } = loopData;
						const variableName = firstData.getVariableName([current], '', 'items');
						firstData.set(
							variableName,
							firstItems.map((item: Data) => item.toJSON())
						);
						secondData.set(
							variableName,
							secondItems.map((item: Data) => item.toJSON())
						);

						merged.push({
							type: 'loop',
							reference: firstData.getChain(variableName),
							template
						});
						firstPointer += firstIndex;
						secondPointer += secondIndex;
						return;
					}
				}
			}
		}

		merged.push(diffNodes(depth + 1, firstData, secondData, current, other, parentElements));
	};

	while (firstPointer < firstTree.length && secondPointer < secondTree.length) {
		const firstRemaining = firstTree.length - firstPointer;
		const secondRemaining = secondTree.length - secondPointer;

		const firstNode = firstTree[firstPointer];
		const secondNode = secondTree[secondPointer];

		const equivalency = nodeEquivalencyScore(firstNode, secondNode);
		if (equivalency === 1) {
			addComparisonNode(firstNode, secondNode);
		} else if (firstRemaining > secondRemaining) {
			if (
				isBestMatch(
					firstNode,
					secondNode,
					firstTree.slice(firstPointer + 1),
					secondTree.slice(secondPointer)
				)
			) {
				addComparisonNode(firstNode, secondNode);
			} else {
				addConditionalNode(firstNode, firstData, secondData);
				firstPointer += 1;
			}
		} else {
			if (
				isBestMatch(
					secondNode,
					firstNode,
					secondTree.slice(secondPointer + 1),
					firstTree.slice(firstPointer)
				)
			) {
				addComparisonNode(firstNode, secondNode);
			} else {
				addConditionalNode(secondNode, secondData, firstData);
				secondPointer += 1;
			}
		}
	}

	while (firstPointer < firstTree.length) {
		addConditionalNode(firstTree[firstPointer], firstData, secondData);
		firstPointer += 1;
	}

	while (secondPointer < secondTree.length) {
		addConditionalNode(secondTree[secondPointer], secondData, firstData);
		secondPointer += 1;
	}

	return merged;
}
