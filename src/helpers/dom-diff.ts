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

	const variableName = firstData.getVariableName([firstElement]);
	const firstAttrsData = firstData.createSubdata(variableName);
	const secondAttrsData = secondData.createSubdata(variableName);
	Object.keys(firstAttrs).forEach((attrName) => {
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

		if (!secondAttr) {
			firstAttrsData.set(attrName, firstAttr.value);
			secondAttrsData.set(attrName, null);
			combined[attrName] = {
				type: 'conditional-attribute',
				name: attrName,
				reference: firstAttrsData.getChain(attrName)
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
			firstAttrsData.set(attrName, firstAttr.value);
			secondAttrsData.set(attrName, secondAttr.value);
			combined[attrName] = {
				type: 'variable-attribute',
				name: attrName,
				reference: firstAttrsData.getChain(attrName)
			};
		}
	});

	Object.keys(secondAttrs).forEach((attrName) => {
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
			firstAttrsData.set(attrName, null);
			secondAttrsData.set(attrName, secondAttr.value);
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
		const template = diffNodes(0, newBaseData, otherData, base.el, loopEl.el, parentElements);
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
				0,
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

	base.dataSource.push(current.base);
	return {
		firstItems,
		secondItems,
		template: current.template
	};
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
					const firstEls = [
						current,
						...firstRemainingNodes.slice(0, firstIndex + 1)
					].filter((node) => node.type === 'element') as ASTElementNode[];
					const secondEls = [
						other,
						...secondRemainingNodes.slice(0, secondIndex + 1)
					].filter((node) => node.type === 'element') as ASTElementNode[];
					console.log(
						{ firstIndex, secondIndex },
						firstRemainingNodes,
						secondRemainingNodes,
						firstEls,
						secondEls
					);

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
