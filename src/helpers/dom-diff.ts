import {
	ASTElementNode,
	ASTNode,
	ASTAttributeList,
	ASTValueNode,
	ASTConditionalNode
} from '../types';
import { invalidLoopTags, findRepeatedIndex } from './loops';
import { isAttrEquivalent } from './node-helper';
import {
	nodeEquivalencyScore,
	isBestMatch,
	loopThreshold,
	nodeTreeEquivalencyScore
} from './node-equivalency';
import Data from './Data';
import {
	findEndOfMarkdownIndex,
	isMarkdownElement,
	markdownify,
	invalidMarkdownParentTags
} from './markdown';
import { booleanAttributes } from './attributes';
import { Logger, nodeDebugString } from '../logger';
import { convertTreeToComponents, convertElementToComponent } from './component-builder';

export function diffBasicNode(
	firstData: Data,
	secondData: Data,
	firstNode: ASTValueNode,
	secondNode: ASTValueNode,
	parentElements: ASTElementNode[],
	logger?: Logger
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
	parentElements: ASTElementNode[],
	logger?: Logger
): ASTNode {
	logger?.log('  '.repeat(parentElements.length), '👀 Diff Element');
	logger?.log('  '.repeat(parentElements.length), nodeDebugString(firstElement));
	logger?.log('  '.repeat(parentElements.length), nodeDebugString(secondElement));
	const tagsMatch = firstElement.name === secondElement.name;
	if (!tagsMatch) {
		throw new Error(`Mismatched node names ${firstElement.name}, ${secondElement.name}`);
	}

	const node = structuredClone(firstElement) as ASTElementNode;
	node.attrs = mergeAttrs(firstData, secondData, firstElement, secondElement, logger);
	node.children = mergeTree(
		firstData,
		secondData,
		firstElement.children,
		secondElement.children,
		[...parentElements, firstElement],
		logger
	);
	return node;
}

export function diffNodes(
	firstData: Data,
	secondData: Data,
	firstNode: ASTNode,
	secondNode: ASTNode,
	parentElements: ASTElementNode[],
	logger?: Logger
): ASTNode {
	const typesMatch = firstNode.type === secondNode.type;
	logger?.log(
		'  '.repeat(parentElements.length),
		'👀 Diff Nodes',
		nodeDebugString(firstNode, 0, 0),
		'vs',
		nodeDebugString(secondNode, 0, 0)
	);
	if (typesMatch) {
		switch (firstNode.type) {
			case 'conditional':
				const secondConditional = secondNode as ASTConditionalNode;
				const newData = new Data([], {});
				const otherData = new Data([], {});
				const template = diffElementNode(
					newData,
					otherData,
					firstNode.child,
					secondConditional.child,
					parentElements
				) as ASTElementNode;
				firstData.chainSet(secondConditional.reference, newData.toJSON());
				secondData.chainSet(secondConditional.reference, otherData.toJSON());
				return {
					...secondConditional,
					child: template
				};
			case 'loop':
			case 'content':
			case 'variable':
			case 'markdown-variable':
			case 'inline-markdown-variable':
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
					parentElements,
					logger
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
					parentElements,
					logger
				);

			default:
				break;
		}

		throw new Error(
			`Cannot diff identical node ${secondNode.type} ${nodeDebugString(
				firstNode
			)} ${nodeDebugString(secondNode)}`
		);
	}

	if (
		secondNode.type === 'text' &&
		(firstNode.type === 'variable' || firstNode.type === 'inline-markdown-variable')
	) {
		secondData.chainSet(firstNode.reference, secondNode.value.trim());
		return firstNode;
	}

	if (
		firstNode.type === 'text' &&
		(secondNode.type === 'variable' || secondNode.type === 'inline-markdown-variable')
	) {
		firstData.chainSet(secondNode.reference, firstNode.value.trim());
		return secondNode;
	}

	if (secondNode.type === 'element' && firstNode.type === 'loop') {
		const newData = new Data([], {});
		const otherData = new Data([], {});
		diffElementNode(newData, otherData, firstNode.template, secondNode, parentElements);
		secondData.chainSet(firstNode.reference, [otherData.toJSON()]);
		return firstNode;
	}

	if (firstNode.type === 'element' && secondNode.type === 'loop') {
		const newData = new Data([], {});
		const otherData = new Data([], {});
		diffElementNode(newData, otherData, firstNode, secondNode.template, parentElements);
		firstData.chainSet(secondNode.reference, [newData.toJSON()]);
		return secondNode;
	}

	if (secondNode.type === 'element' && firstNode.type === 'conditional') {
		const newData = new Data([], {});
		const otherData = new Data([], {});
		const template = diffElementNode(
			newData,
			otherData,
			firstNode.child,
			secondNode,
			parentElements
		) as ASTElementNode;
		firstData.chainSet(firstNode.reference, newData.toJSON());
		secondData.chainSet(firstNode.reference, otherData.toJSON());
		logger?.debug(`Conditional merge ${firstNode.type} and ${secondNode.type}`);
		logger?.debug('First: ', nodeDebugString(firstNode.child, 0, 0));
		logger?.debug('Second: ', nodeDebugString(secondNode, 0, 0));
		logger?.debug('Merged: ', nodeDebugString(template, 0, 0));
		logger?.debug('newData: ', JSON.stringify(newData));
		logger?.debug('otherData: ', JSON.stringify(otherData));

		return {
			...firstNode,
			child: template
		};
	}

	if (firstNode.type === 'element' && secondNode.type === 'conditional') {
		const newData = new Data([], {});
		const otherData = new Data([], {});
		const template = diffElementNode(
			newData,
			otherData,
			firstNode,
			secondNode.child,
			parentElements
		) as ASTElementNode;
		firstData.chainSet(secondNode.reference, newData.toJSON());
		secondData.chainSet(secondNode.reference, otherData.toJSON());
		logger?.debug(`Conditional merge ${firstNode.type} and ${secondNode.type}`);
		logger?.debug('First: ', nodeDebugString(firstNode, 0, 0));
		logger?.debug('Second: ', nodeDebugString(secondNode.child, 0, 0));
		logger?.debug('Merged: ', nodeDebugString(template, 0, 0));
		logger?.debug('newData: ', JSON.stringify(newData));
		logger?.debug('otherData: ', JSON.stringify(otherData));

		return {
			...secondNode,
			child: template
		};
	}

	// if (firstNode.type === 'conditional' && secondNode.type === 'loop') {
	// 	logger?.warn('TODO: merge conditional element and loop template for the new data for both');
	// 	return secondNode;
	// }

	// if (firstNode.type === 'loop' && secondNode.type === 'conditional') {
	// 	logger?.warn('TODO: merge conditional element and loop template for the new data for both');
	// 	return firstNode;
	// }

	const score = nodeEquivalencyScore(firstNode, secondNode);
	logger?.error(`Cannot diff nodes ${firstNode.type} and ${secondNode.type} (${score})`);
	logger?.error('First: ', nodeDebugString(firstNode, 0, 0));
	logger?.error('Second: ', nodeDebugString(secondNode, 0, 0));

	throw new Error(`Cannot diff nodes ${firstNode.type} and ${secondNode.type}`);
}

export function mergeAttrs(
	firstData: Data,
	secondData: Data,
	firstElement: ASTElementNode,
	secondElement: ASTElementNode,
	logger?: Logger
): ASTAttributeList {
	const firstAttrs = firstElement.attrs;
	const secondAttrs = secondElement.attrs;
	const combined = {} as ASTAttributeList;

	logger?.debug('🏷️ Merging attrs');
	logger?.debug(JSON.stringify(firstAttrs));
	logger?.debug(JSON.stringify(secondAttrs));
	Object.keys(firstAttrs).forEach((attrName) => {
		const variableName = firstData.getVariableName([firstElement], '', attrName);
		const firstAttr = firstAttrs[attrName];
		const secondAttr = secondAttrs[attrName];
		if (!firstAttr) {
			return;
		}
		if (firstAttr.type !== 'attribute') {
			logger?.warn('TODO: add relevant null state for !secondAttr');
			if (secondAttr?.type === 'attribute') {
				secondData.chainSet(firstAttr.reference, secondAttr.value);
			}
			combined[attrName] = firstAttr;
			return;
		}

		if (secondAttr && secondAttr.type !== 'attribute') {
			if (firstAttr.type === 'attribute') {
				firstData.chainSet(secondAttr.reference, firstAttr.value);
			}
			combined[attrName] = secondAttr;
			return;
		}

		if (booleanAttributes[attrName] && !isAttrEquivalent(attrName, firstAttr, secondAttr)) {
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
			firstData.set(variableName, firstAttr.value.trim());
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
			firstData.set(variableName, firstAttr.value.trim());
			secondData.set(variableName, secondAttr.value.trim());
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
		if (combined[attrName] || !secondAttr) {
			return;
		}

		if (secondAttr && secondAttr.type !== 'attribute') {
			logger?.warn('TODO: add relevant null state for !secondAttr');
			if (firstAttr?.type === 'attribute') {
				firstData.chainSet(secondAttr.reference, firstAttr.value.trim());
			}
			combined[attrName] = secondAttr;
			return secondAttr;
		}

		firstData.set(variableName, null);
		secondData.set(variableName, secondAttr.value.trim());
		combined[attrName] = {
			type: 'conditional-attribute',
			name: attrName,
			reference: firstData.getChain(variableName)
		};
	});

	logger?.debug(JSON.stringify(combined));
	return combined;
}

interface Loop {
	firstItems: Data[];
	secondItems: Data[];
	template: ASTElementNode;
}

interface LoopElements {
	el: ASTElementNode;
	dataSource: Data[];
}

interface LoopState {
	template: ASTElementNode;
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
		const template = diffNodes(
			newBaseData,
			otherData,
			base.el,
			loopEl.el,
			parentElements
		) as ASTElementNode;
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
			) as ASTElementNode;
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
	rawFirstTree: ASTNode[],
	rawSecondTree: ASTNode[],
	parentElements: ASTElementNode[] = [],
	logger?: Logger
): ASTNode[] {
	const parent = parentElements[parentElements.length - 1];
	const componentConfig = {
		disableTextVariables: true,
		disableAttributeVariables: true,
		// TODO: loops?
		disableLoops: false
	};
	const firstTree = convertTreeToComponents(
		firstData,
		rawFirstTree,
		parentElements,
		componentConfig
	);
	const secondTree = convertTreeToComponents(
		secondData,
		rawSecondTree,
		parentElements,
		componentConfig
	);

	const merged = [] as ASTNode[];
	let firstPointer = 0;
	let secondPointer = 0;
	const addConditionalNode = (node: ASTNode, firstData: Data, secondData: Data) => {
		logger?.log('Adding conditional node', nodeDebugString(node));
		if (node.type === 'text') {
			const trimmed = node.value.trim();
			if (trimmed.length === 0) {
				merged.push(node);
				return;
			}
			const variableName = firstData.getVariableName(parentElements);
			firstData.set(variableName, trimmed);
			secondData.set(variableName, '');
			merged.push({
				type: 'variable',
				reference: firstData.getChain(variableName)
			});
			return;
		}

		if (node.type === 'content') {
			// TODO potentially throw an error...
			merged.push(node);
			return;
		}

		if (node.type === 'conditional') {
			secondData.chainSet(node.reference, null);
			merged.push(node);
			return;
		}

		if (
			node.type === 'variable' ||
			node.type === 'markdown-variable' ||
			node.type === 'inline-markdown-variable'
		) {
			secondData.chainSet(node.reference, '');
			merged.push(node);
			return;
		}

		if (node.type === 'loop') {
			secondData.chainSet(node.reference, []);
			merged.push(node);
			return;
		}

		const parents = [...parentElements];
		if (node.type === 'element') {
			parents.push(node);
			const newData = new Data([], {});
			const template = convertElementToComponent(newData, node, []);
			const variableName = firstData.getVariableName(parents);
			firstData.set(variableName, newData.toJSON());
			secondData.set(variableName, null);
			merged.push({
				type: 'conditional',
				reference: firstData.getChain(variableName),
				child: template
			});
			return;
		}

		throw new Error(`Unknown conditional node ${node.type}, ${nodeDebugString(node)}`);
	};

	function addMarkdownTree() {
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
	}

	while (firstPointer < firstTree.length && secondPointer < secondTree.length) {
		const firstRemaining = firstTree.length - firstPointer;
		const secondRemaining = secondTree.length - secondPointer;

		const current = firstTree[firstPointer];
		const other = secondTree[secondPointer];

		const firstRemainingNodes = firstTree.slice(firstPointer);
		const secondRemainingNodes = secondTree.slice(secondPointer);

		if (current.type === 'element' && other.type === 'element') {
			if (parent && !invalidMarkdownParentTags[parent.name]) {
				if (isMarkdownElement(current) && isMarkdownElement(other)) {
					addMarkdownTree();
					continue;
				}
			}

			if (!invalidLoopTags[current.name] && !invalidLoopTags[other.name]) {
				const score = nodeEquivalencyScore(current, other);
				if (score >= loopThreshold) {
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

								// TODO: Object building
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

									logger?.log('🔄 Added loop', nodeDebugString(template));
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
						logger?.log(
							'🔂 Not enough loop elements',
							score,
							nodeDebugString(current, 0, 0),
							'vs',
							nodeDebugString(other, 0, 0)
						);
					} else {
						logger?.log(
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

		if (isBestMatch(firstRemainingNodes, secondRemainingNodes, logger)) {
			logger?.log(
				'👀 Comparing nodes',
				nodeDebugString(current, 0, 0),
				'vs',
				nodeDebugString(other, 0, 0)
			);

			if (current.type === 'element' && other.type === 'loop') {
				const repeatedIndex = findRepeatedIndex(firstRemainingNodes);
				if (repeatedIndex > 0) {
					const elements = firstRemainingNodes
						.slice(0, repeatedIndex + 1)
						.filter((node) => node.type === 'element') as ASTElementNode[];
					if (elements.length > 1) {
						const loopData = buildLoop(elements, [], parentElements);
						if (loopData) {
							const { firstItems, template } = loopData;
							firstData.chainSet(
								other.reference,
								firstItems.map((item: Data) => item.toJSON())
							);

							logger?.log(
								'🔄 Added diffed loop',
								nodeDebugString(template),
								JSON.stringify(firstItems)
							);
							merged.push(
								diffNodes(
									firstData,
									secondData,
									{
										type: 'loop',
										reference: other.reference,
										template
									},
									other,
									parentElements,
									logger
								)
							);
							firstPointer += repeatedIndex + 1;
							secondPointer += 1;
							continue;
						}
					}
				}
			}

			if (other.type === 'element' && current.type === 'loop') {
				const repeatedIndex = findRepeatedIndex(secondRemainingNodes);

				const elements = secondRemainingNodes
					.slice(0, repeatedIndex + 1)
					.filter((node) => node.type === 'element') as ASTElementNode[];
				if (elements.length > 1) {
					const loopData = buildLoop(elements, [], parentElements);
					if (loopData) {
						const { secondItems, template } = loopData;
						secondData.chainSet(
							current.reference,
							secondItems.map((item: Data) => item.toJSON())
						);

						logger?.log(
							'🔄 Added diffed loop',
							nodeDebugString(template),
							JSON.stringify(secondItems)
						);
						merged.push(
							diffNodes(
								firstData,
								secondData,
								current,
								{
									type: 'loop',
									reference: current.reference,
									template
								},
								parentElements,
								logger
							)
						);
						secondPointer += repeatedIndex + 1;
						firstPointer += 1;
						continue;
					}
				}
			}

			merged.push(diffNodes(firstData, secondData, current, other, parentElements, logger));
			firstPointer += 1;
			secondPointer += 1;
		} else if (firstRemaining > secondRemaining) {
			logger?.log(`? Conditional first weighted [${firstRemaining}, ${secondRemaining}]`);
			addConditionalNode(current, firstData, secondData);
			firstPointer += 1;
		} else {
			logger?.log(`? Conditional second weighted [${firstRemaining}, ${secondRemaining}]`);
			addConditionalNode(other, secondData, firstData);
			secondPointer += 1;
		}
	}

	while (firstPointer < firstTree.length) {
		logger?.log('? Conditional first remaining');
		addConditionalNode(firstTree[firstPointer], firstData, secondData);
		firstPointer += 1;
	}

	while (secondPointer < secondTree.length) {
		logger?.log('? Conditional second remaining');
		addConditionalNode(secondTree[secondPointer], secondData, firstData);
		secondPointer += 1;
	}

	return merged;
}
