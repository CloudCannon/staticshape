import { ASTElementNode, ASTNode, ASTAttributeList, ASTValueNode } from '../types';
import { invalidLoopTags, findRepeatedIndex } from './loops';
import { isAttrEquivalent } from './node-helper';
import {
	nodeEquivalencyScore,
	isBestMatch,
	loopThreshold,
	nodeTreeEquivalencyScore
} from './node-equivalency';
import Data from './Data';
import { nodeDebugString } from './debug-helper';
import { findEndOfMarkdownIndex, isMarkdownElement, markdownify } from './markdown';
import { booleanAttributes } from './attributes';

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
		firstData,
		secondData,
		firstElement.children,
		secondElement.children,
		[...parentElements, firstElement]
	);
	return node;
}

export function diffNodes(
	firstData: Data,
	secondData: Data,
	firstNode: ASTNode,
	secondNode: ASTNode,
	parentElements: ASTElementNode[]
): ASTNode {
	const typesMatch = firstNode.type === secondNode.type;
	if (typesMatch) {
		switch (firstNode.type) {
			case 'content':
			case 'variable':
			case 'markdown-variable':
			case 'conditional':
			case 'loop':
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
				if (firstNode.name === 'svg') {
					// TODO handle SVGs as HTML variables
					return firstNode;
				}
				return diffElementNode(
					firstData,
					secondData,
					firstNode,
					secondNode as ASTElementNode,
					parentElements
				);

			default:
				break;
		}

		console.log(`Unknown node type ${secondNode.type}`, secondNode, firstNode);
	}

	if (
		secondNode.type === 'text' &&
		(firstNode.type === 'variable' ||
			firstNode.type === 'conditional' ||
			firstNode.type === 'loop')
	) {
		return firstNode;
	}

	if (
		firstNode.type === 'text' &&
		(secondNode.type === 'variable' ||
			secondNode.type === 'conditional' ||
			secondNode.type === 'loop')
	) {
		return secondNode;
	}

	if (firstNode.type === 'conditional' && secondNode.type === 'loop') {
		return secondNode;
	}

	if (firstNode.type === 'loop' && secondNode.type === 'conditional') {
		return secondNode;
	}

	if (
		secondNode.type === 'element' &&
		firstNode.type === 'conditional'
		// ( || firstNode.type === 'loop')
	) {
		return firstNode;
	}

	if (
		firstNode.type === 'element' &&
		secondNode.type === 'conditional'
		// ( || secondNode.type === 'loop')
	) {
		return secondNode;
	}

	const score = nodeEquivalencyScore(firstNode, secondNode);
	console.log(`Cannot diff nodes ${firstNode.type} and ${secondNode.type}`);
	console.log(firstNode, secondNode, score);

	return {
		type: 'comment',
		value: `Cannot diff nodes ${firstNode.type} and ${secondNode.type}`
	};
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

	Object.keys(firstAttrs).forEach((attrName) => {
		const variableName = firstData.getVariableName([firstElement], '', attrName);
		const firstAttr = firstAttrs[attrName];
		const secondAttr = secondAttrs[attrName];
		if (!firstAttr) {
			console.log(firstAttrs, secondAttrs, attrName);
			return;
		}
		if (firstAttr.type !== 'attribute') {
			combined[attrName] = firstAttr;
			return firstAttr;
		}

		if (secondAttr?.type !== 'attribute') {
			combined[attrName] = secondAttr;
			return secondAttr;
		}

		if (booleanAttributes[attrName]) {
			firstData.set(variableName, !!firstAttr);
			secondData.set(variableName, !!secondAttr);
			combined[attrName] = {
				type: 'conditional-attribute',
				name: attrName,
				reference: firstData.getChain(variableName)
			};
			return;
		}

		if (!secondAttr) {
			firstData.set(variableName, firstAttr.value);
			secondData.set(variableName, null);
			combined[attrName] = {
				type: 'conditional-attribute',
				name: attrName,
				reference: firstData.getChain(variableName)
			};
			return;
		}

		if (isAttrEquivalent(attrName, firstAttr, secondAttr)) {
			combined[attrName] = {
				type: 'attribute',
				name: attrName,
				value: secondAttr.value
			};
		} else {
			firstData.set(variableName, firstAttr.value);
			secondData.set(variableName, secondAttr.value);
			combined[attrName] = {
				type: 'variable-attribute',
				name: attrName,
				reference: firstData.getChain(variableName)
			};
		}
	});

	Object.keys(secondAttrs).forEach((attrName) => {
		const variableName = firstData.getVariableName([firstElement], '', attrName);
		const firstAttr = firstAttrs[attrName];
		const secondAttr = secondAttrs[attrName];
		if (!combined[attrName]) {
			return;
		}
		if (!secondAttr) {
			console.log(firstAttrs, secondAttrs, attrName);
			return;
		}

		if (secondAttr?.type !== 'attribute') {
			combined[attrName] = secondAttr;
			return secondAttr;
		}

		if (!firstAttr) {
			firstData.set(variableName, null);
			secondData.set(variableName, secondAttr.value);
			combined[attrName] = {
				type: 'conditional-attribute',
				name: attrName,
				reference: firstData.getChain(variableName)
			};
		}
	});

	return combined;
}

interface Loop {
	firstItems: Data[];
	secondItems: Data[];
	template: ASTNode;
}

interface LoopElements {
	el: ASTElementNode;
	dataSource: Data[];
}

interface LoopState {
	template: ASTNode;
	blocks: Data[];
	base: Data;
}

function buildLoop(
	firstEls: ASTElementNode[],
	secondEls: ASTElementNode[],
	parentElements: ASTElementNode[]
): Loop | null {
	const firstItems = [] as Data[];
	const secondItems = [] as Data[];
	const elements: LoopElements[] = [
		...firstEls.map((el) => ({
			el,
			dataSource: firstItems
		})),
		...secondEls.map((el) => ({
			el,
			dataSource: secondItems
		}))
	];

	if (elements.length < 2) {
		throw new Error('Loop must contain more than 1 element');
	}

	const base = elements[0];
	let current: LoopState | null = null;
	for (let i = 1; i < elements.length; i++) {
		const loopEl = elements[i];
		const newBaseData = new Data([], {});
		const otherData = new Data([], {});
		const template = diffNodes(newBaseData, otherData, base.el, loopEl.el, parentElements);
		loopEl.dataSource.push(otherData);

		if (current === null) {
			current = {
				template,
				blocks: [otherData],
				base: newBaseData
			};
		} else {
			// Merge the bases
			const mergedBase: Data = current.base.merge(newBaseData);

			// Merge current blocks with the new base
			const oldBlocks: Data[] = current.blocks.map((block) => block.merge(newBaseData));

			// Merge the new block with the old base
			const newBlock = otherData.merge(current.base);

			// Merge the two templates
			const merged = diffNodes(
				newBaseData,
				otherData,
				current.template,
				template,
				parentElements
			);
			current = {
				template: merged,
				blocks: [...oldBlocks, newBlock],
				base: mergedBase
			};
		}
	}

	if (current === null) {
		throw new Error('Loop did not produce a template');
	}

	base.dataSource.unshift(current.base);
	return {
		firstItems,
		secondItems,
		template: current.template
	};
}

export function mergeTree(
	firstData: Data,
	secondData: Data,
	firstTree: ASTNode[],
	secondTree: ASTNode[],
	parentElements: ASTElementNode[] = []
): ASTNode[] {
	const merged = [] as ASTNode[];
	let firstPointer = 0;
	let secondPointer = 0;

	const addConditionalNode = (node: ASTNode, firstData: Data, secondData: Data) => {
		console.error(nodeDebugString(node));
		if (node.type === 'text' && !node.value.trim()) {
			merged.push(node);
		} else if (node.type === 'content') {
			merged.push(node);
		} else if (
			node.type === 'conditional' ||
			node.type === 'variable' ||
			node.type === 'markdown-variable' ||
			node.type === 'loop'
		) {
			merged.push(node);
		} else {
			const parents = [...parentElements];
			if (node.type === 'element') {
				parents.push(node);
			}
			const variableName = firstData.getVariableName(parents, 'show', '');
			firstData.set(variableName, true);
			secondData.set(variableName, false);
			merged.push({
				type: 'conditional',
				reference: firstData.getChain(variableName),
				child: node
			});
		}
	};

	while (firstPointer < firstTree.length && secondPointer < secondTree.length) {
		const firstRemaining = firstTree.length - firstPointer;
		const secondRemaining = secondTree.length - secondPointer;

		const current = firstTree[firstPointer];
		const other = secondTree[secondPointer];

		if (current.type === 'element' && other.type === 'element') {
			if (isMarkdownElement(current) && isMarkdownElement(other)) {
				const firstRemainingNodes = firstTree.slice(firstPointer);
				const secondRemainingNodes = secondTree.slice(secondPointer);

				const firstIndexes = findEndOfMarkdownIndex(firstRemainingNodes);
				const secondIndexes = findEndOfMarkdownIndex(secondRemainingNodes);
				const firstEls = firstRemainingNodes
					.slice(0, firstIndexes.lastElIndex + 1)
					.filter((node) => node.type === 'element') as ASTElementNode[];
				const secondEls = secondRemainingNodes
					.slice(0, secondIndexes.lastElIndex + 1)
					.filter((node) => node.type === 'element') as ASTElementNode[];
				const variableName = firstData.getVariableName(parentElements, '', 'markdown');
				firstData.set(variableName, markdownify(firstEls));
				secondData.set(variableName, markdownify(secondEls));
				merged.push({
					type: 'markdown-variable',
					reference: firstData.getChain(variableName)
				});

				firstPointer += firstIndexes.lastElIndex + 1;
				secondPointer += secondIndexes.lastElIndex + 1;
				continue;
			}

			if (!invalidLoopTags[current.name] && !invalidLoopTags[other.name]) {
				const score = nodeEquivalencyScore(current, other);
				if (score > loopThreshold) {
					const firstRemainingNodes = firstTree.slice(firstPointer);
					const secondRemainingNodes = secondTree.slice(secondPointer);

					const firstIndex = findRepeatedIndex(firstRemainingNodes);
					const secondIndex = findRepeatedIndex(secondRemainingNodes);
					if (firstIndex > 0 || secondIndex > 0) {
						const firstEls = firstRemainingNodes
							.slice(0, firstIndex + 1)
							.filter((node) => node.type === 'element') as ASTElementNode[];
						const secondEls = secondRemainingNodes
							.slice(0, secondIndex + 1)
							.filter((node) => node.type === 'element') as ASTElementNode[];

						if (firstEls.length + secondEls.length > 2) {
							const isExactMatch =
								firstEls.length === secondEls.length &&
								nodeTreeEquivalencyScore(firstEls, secondEls) === 1;

							if (!isExactMatch) {
								const loopData = buildLoop(firstEls, secondEls, parentElements);
								if (loopData) {
									const { firstItems, secondItems, template } = loopData;
									const variableName = firstData.getVariableName(
										parentElements,
										'',
										'items'
									);
									firstData.set(
										variableName,
										firstItems.map((item: Data) => item.toJSON())
									);
									secondData.set(
										variableName,
										secondItems.map((item: Data) => item.toJSON())
									);

									console.error('🔄 Added loop', nodeDebugString(template));
									merged.push({
										type: 'loop',
										reference: firstData.getChain(variableName),
										template
									});
									firstPointer += firstIndex + 1;
									secondPointer += secondIndex + 1;
									continue;
								}
							}
						}
						console.error(
							'🔂 Not enough loop elements',
							score,
							nodeDebugString(current, 0, 0),
							'vs',
							nodeDebugString(other, 0, 0)
						);
					} else {
						console.error(
							'🔂 Not enough loop nodes',
							score,
							nodeDebugString(current, 0, 0),
							'vs',
							nodeDebugString(other, 0, 0)
						);
					}
				}
			}
		}

		if (isBestMatch(firstTree.slice(firstPointer), secondTree.slice(secondPointer))) {
			console.error(
				'👀 Comparing nodes',
				nodeDebugString(current, 0, 0),
				'vs',
				nodeDebugString(other, 0, 0)
			);

			merged.push(diffNodes(firstData, secondData, current, other, parentElements));
			firstPointer += 1;
			secondPointer += 1;
		} else if (firstRemaining > secondRemaining) {
			console.error(`? Conditional first weighted [${firstRemaining}, ${secondRemaining}]`);
			addConditionalNode(current, firstData, secondData);
			firstPointer += 1;
		} else {
			console.error(`? Conditional second weighted [${firstRemaining}, ${secondRemaining}]`);
			addConditionalNode(other, secondData, firstData);
			secondPointer += 1;
		}
	}

	while (firstPointer < firstTree.length) {
		console.error('? Conditional first remaining');
		addConditionalNode(firstTree[firstPointer], firstData, secondData);
		firstPointer += 1;
	}

	while (secondPointer < secondTree.length) {
		console.error('? Conditional second remaining');
		addConditionalNode(secondTree[secondPointer], secondData, firstData);
		secondPointer += 1;
	}

	return merged;
}
