import {
	ASTElementNode,
	ASTNode,
	ASTAttributeList,
	ASTValueNode,
	ASTConditionalNode,
	ASTLoopNode,
	ASTTextNode,
	ASTVariableNode,
	ASTInlineMarkdownNode,
	ASTAttribute
} from '../types.ts';
import { invalidLoopTags, findRepeatedIndex } from './loops.ts';
import { isAttrEquivalent } from './node-helper.ts';
import {
	nodeEquivalencyScore,
	isBestMatch,
	loopThreshold,
	nodeTreeEquivalencyScore
} from './node-equivalency.ts';
import Data from './Data.ts';
import {
	findEndOfMarkdownIndex,
	isMarkdownElement,
	markdownify,
	invalidMarkdownParentTags
} from './markdown.ts';
import { booleanAttributes } from './attributes.ts';
import { Logger, nodeDebugString } from '../logger.ts';
import { convertTreeToComponents, convertElementToComponent } from './component-builder.ts';
import { liftVariables } from './variable-lifting.ts';

export function diffBasicNode(
	firstData: Data,
	secondData: Data,
	firstNode: ASTValueNode,
	secondNode: ASTValueNode,
	parentElements: ASTElementNode[],
	logger: Logger
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
	logger: Logger
): ASTNode {
	logger.log('  '.repeat(parentElements.length), '👀 Diff Element');
	logger.log('  '.repeat(parentElements.length), nodeDebugString(firstElement));
	logger.log('  '.repeat(parentElements.length), nodeDebugString(secondElement));
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
	logger: Logger
): ASTNode {
	const typesMatch = firstNode.type === secondNode.type;
	logger.log(
		'  '.repeat(parentElements.length),
		'👀 Diff Nodes',
		nodeDebugString(firstNode, 0, 0),
		'vs',
		nodeDebugString(secondNode, 0, 0)
	);
	if (typesMatch) {
		switch (firstNode.type) {
			case 'conditional':
				return diffConditionalNodes(
					firstNode,
					secondNode as ASTConditionalNode,
					firstData,
					secondData,
					parentElements,
					logger
				);
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
		return diffTextAndVariableNode(secondNode, firstNode, secondData);
	}

	if (
		firstNode.type === 'text' &&
		(secondNode.type === 'variable' || secondNode.type === 'inline-markdown-variable')
	) {
		return diffTextAndVariableNode(firstNode, secondNode, firstData);
	}

	if (secondNode.type === 'element' && firstNode.type === 'loop') {
		return diffLoopAndElementNode(
			firstNode,
			secondNode,
			firstData,
			secondData,
			parentElements,
			logger
		);
	}

	if (firstNode.type === 'element' && secondNode.type === 'loop') {
		return diffLoopAndElementNode(
			secondNode,
			firstNode,
			secondData,
			firstData,
			parentElements,
			logger
		);
	}

	if (secondNode.type === 'element' && firstNode.type === 'conditional') {
		return diffConditionalAndElementNode(
			firstNode,
			secondNode,
			firstData,
			secondData,
			parentElements,
			logger
		);
	}

	if (firstNode.type === 'element' && secondNode.type === 'conditional') {
		return diffConditionalAndElementNode(
			secondNode,
			firstNode,
			secondData,
			firstData,
			parentElements,
			logger
		);
	}

	if (firstNode.type === 'conditional' && secondNode.type === 'loop') {
		return diffConditionalAndLoopNode(
			firstNode,
			secondNode,
			firstData,
			secondData,
			parentElements,
			logger
		);
	}

	if (firstNode.type === 'loop' && secondNode.type === 'conditional') {
		return diffConditionalAndLoopNode(
			secondNode,
			firstNode,
			secondData,
			firstData,
			parentElements,
			logger
		);
	}

	const score = nodeEquivalencyScore(firstNode, secondNode);
	logger.error(`Cannot diff nodes ${firstNode.type} and ${secondNode.type} (${score})`);
	logger.error('First: ', nodeDebugString(firstNode, 0, 0));
	logger.error('Second: ', nodeDebugString(secondNode, 0, 0));

	throw new Error(`Cannot diff nodes ${firstNode.type} and ${secondNode.type}`);
}

function diffTextAndVariableNode(
	textNode: ASTTextNode,
	variableNode: ASTVariableNode | ASTInlineMarkdownNode,
	textNodeData: Data
): ASTVariableNode | ASTInlineMarkdownNode {
	textNodeData.chainSet(variableNode.reference, textNode.value.trim());
	return variableNode;
}

function diffConditionalAndElementNode(
	conditionalNode: ASTConditionalNode,
	elementNode: ASTElementNode,
	conditionalData: Data,
	elementData: Data,
	parentElements: ASTElementNode[],
	logger: Logger
): ASTConditionalNode {
	const variableName = conditionalNode.reference[0];
	if (!conditionalData.hasKey(variableName)) {
		logger.log(
			'💿 Conditional variable missing from data context, treating as absent',
			JSON.stringify(conditionalNode.reference),
			variableName,
			JSON.stringify(conditionalData)
		);
		elementData.chainSet(conditionalNode.reference, null);
		return conditionalNode;
	}

	const existingValue = conditionalData.getKey(variableName);
	if (existingValue === null || typeof existingValue !== 'object') {
		return conditionalNode;
	}
	const liftedVariables = liftVariables(elementNode, elementData);
	Object.keys(liftedVariables).forEach((variableName) => {
		elementData.delete(variableName);
	});

	const existingData = new Data([], structuredClone(existingValue));
	const newData = new Data([], structuredClone(liftedVariables));

	const template = diffElementNode(
		existingData,
		newData,
		conditionalNode.template,
		elementNode,
		parentElements,
		logger
	) as ASTElementNode;

	conditionalData.chainSet(conditionalNode.reference, existingData.toJSON());
	elementData.chainSet(conditionalNode.reference, newData.toJSON());

	return {
		...conditionalNode,
		template
	};
}

function diffConditionalNodes(
	firstNode: ASTConditionalNode,
	secondNode: ASTConditionalNode,
	firstData: Data,
	secondData: Data,
	parentElements: ASTElementNode[],
	logger: Logger
) {
	const variableName = firstNode.reference[0];
	if (variableName !== secondNode.reference[0]) {
		throw new Error('Conditional diff mismatched variable names');
	}

	if (!firstData.hasKey(variableName)) {
		logger.log(
			'💿 Failed value inheritance',
			JSON.stringify(firstNode.reference),
			variableName,
			JSON.stringify(firstData)
		);
		throw new Error('Found conditional variable but could not find existing value');
	}

	if (!secondData.hasKey(variableName)) {
		logger.log(
			'💿 Failed value inheritance',
			JSON.stringify(secondNode.reference),
			variableName,
			JSON.stringify(secondData)
		);
		throw new Error('Found conditional variable but could not find existing value');
	}

	const firstSubData = firstData.getKey(variableName);
	const secondSubData = secondData.getKey(variableName);

	const newData = new Data(
		[],
		firstSubData === null || typeof firstSubData !== 'object' ? {} : firstSubData
	);
	const otherData = new Data(
		[],
		secondSubData === null || typeof secondSubData !== 'object' ? {} : secondSubData
	);

	const template = diffElementNode(
		newData,
		otherData,
		firstNode.template,
		secondNode.template,
		parentElements,
		logger
	) as ASTElementNode;
	firstData.chainSet(secondNode.reference, firstSubData ? newData.toJSON() : null);
	secondData.chainSet(secondNode.reference, secondSubData ? otherData.toJSON() : null);
	return {
		...secondNode,
		template
	};
}

function diffLoopAndElementNode(
	loopNode: ASTLoopNode,
	elementNode: ASTElementNode,
	loopData: Data,
	elementData: Data,
	parentElements: ASTElementNode[],
	logger: Logger
): ASTLoopNode {
	logger.log(
		'📀 Inheriting loop variables',
		JSON.stringify(loopNode),
		'from',
		JSON.stringify(loopData)
	);

	const variableName = loopNode.reference[0];
	if (!loopData.hasKey(variableName)) {
		logger.log(
			'💿 Loop variable missing from data context, treating as absent',
			JSON.stringify(loopNode.reference),
			variableName,
			JSON.stringify(loopData)
		);
		elementData.chainSet(loopNode.reference, null);
		return loopNode;
	}

	const existingItems = loopData.getKey(variableName);

	if (!Array.isArray(existingItems)) {
		throw new Error('Found loop variable that is not array');
	}
	const liftedVariables = liftVariables(elementNode, elementData);
	Object.keys(liftedVariables).forEach((variableName) => {
		elementData.delete(variableName);
		loopData.delete(variableName);
	});

	const existingData = new Data([], existingItems[0]);
	const newData = new Data([], structuredClone(liftedVariables));

	diffElementNode(existingData, newData, loopNode.template, elementNode, parentElements, logger);
	elementData.chainSet(loopNode.reference, [newData.toJSON()]);
	return loopNode;
}

function diffConditionalAndLoopNode(
	conditionalNode: ASTConditionalNode,
	loopNode: ASTLoopNode,
	conditionalData: Data,
	loopData: Data,
	parentElements: ASTElementNode[],
	logger: Logger
): ASTLoopNode {
	const variableName = conditionalNode.reference[0];
	if (conditionalData.hasKey(variableName)) {
		const existingValue = conditionalData.getKey(variableName);
		conditionalData.set(
			variableName,
			existingValue != null ? [existingValue] : []
		);
	}

	const promotedLoop: ASTLoopNode = {
		type: 'loop',
		reference: conditionalNode.reference,
		template: conditionalNode.template
	};

	return diffNodes(
		conditionalData,
		loopData,
		promotedLoop,
		loopNode,
		parentElements,
		logger
	) as ASTLoopNode;
}

function mergeAttribute(
	attrName: string,
	element: ASTElementNode,
	firstAttr: ASTAttribute,
	secondAttr: ASTAttribute | undefined,
	firstData: Data,
	secondData: Data,
	logger: Logger
): ASTAttribute {
	const variableName = firstData.getVariableName([element], '', attrName);
	if (firstAttr.type !== 'attribute') {
		logger?.warn('TODO: add relevant null state for !secondAttr');
		if (secondAttr?.type === 'attribute') {
			secondData.chainSet(firstAttr.reference, secondAttr.value);
		}
		return firstAttr;
	}

	if (secondAttr && secondAttr.type !== 'attribute') {
		if (firstAttr.type === 'attribute') {
			firstData.chainSet(secondAttr.reference, firstAttr.value);
		}
		return secondAttr;
	}

	if (
		booleanAttributes[attrName] &&
		(!secondAttr || !isAttrEquivalent(attrName, firstAttr, secondAttr))
	) {
		firstData.set(variableName, !!firstAttr);
		secondData.set(variableName, !!secondAttr);
		return {
			type: 'conditional-attribute',
			name: attrName,
			reference: firstData.getChain(variableName)
		};
	}

	if (!secondAttr) {
		firstData.set(variableName, firstAttr.value.trim());
		secondData.set(variableName, null);
		return {
			type: 'conditional-attribute',
			name: attrName,
			reference: firstData.getChain(variableName)
		};
	}

	if (isAttrEquivalent(attrName, firstAttr, secondAttr)) {
		return {
			type: 'attribute',
			name: attrName,
			value: secondAttr.value
		};
	}

	firstData.set(variableName, firstAttr.value.trim());
	secondData.set(variableName, secondAttr.value.trim());
	return {
		type: 'variable-attribute',
		name: attrName,
		reference: firstData.getChain(variableName)
	};
}

export function mergeAttrs(
	firstData: Data,
	secondData: Data,
	firstElement: ASTElementNode,
	secondElement: ASTElementNode,
	logger: Logger
): ASTAttributeList {
	const firstAttrs = firstElement.attrs;
	const secondAttrs = secondElement.attrs;
	const combined = {} as ASTAttributeList;

	Object.keys(firstAttrs).forEach((attrName) => {
		const firstAttr = firstAttrs[attrName];
		const secondAttr = secondAttrs[attrName];
		if (!firstAttr) {
			return;
		}

		combined[attrName] = mergeAttribute(
			attrName,
			firstElement,
			firstAttr,
			secondAttr,
			firstData,
			secondData,
			logger
		);
	});

	Object.keys(secondAttrs).forEach((attrName) => {
		const firstAttr = firstAttrs[attrName];
		const secondAttr = secondAttrs[attrName];
		if (combined[attrName] || !secondAttr) {
			return;
		}

		combined[attrName] = mergeAttribute(
			attrName,
			firstElement,
			secondAttr,
			firstAttr,
			secondData,
			firstData,
			logger
		);
	});

	logger.debug(JSON.stringify(combined));
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
	parentElements: ASTElementNode[],
	logger: Logger
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
			parentElements,
			logger
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
				parentElements,
				logger
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
	logger: Logger
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
		componentConfig,
		firstData,
		logger
	);

	logger.log('--------------------- second tree');
	const secondTree = convertTreeToComponents(
		secondData,
		rawSecondTree,
		parentElements,
		componentConfig,
		secondData,
		logger
	);

	const merged = [] as ASTNode[];
	let firstPointer = 0;
	let secondPointer = 0;
	const addConditionalNode = (node: ASTNode, firstData: Data, secondData: Data) => {
		logger.log('Adding conditional node', nodeDebugString(node));
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
			const config = {}; // TODO pass component config
			const template = convertElementToComponent(
				newData,
				node,
				[],
				config,
				firstData,
				logger
			);
			const variableName = firstData.getVariableName(parents);
			firstData.set(variableName, newData.toJSON());
			secondData.set(variableName, null);
			merged.push({
				type: 'conditional',
				reference: firstData.getChain(variableName),
				template
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
								const loopData = buildLoop(
									firstEls,
									secondEls,
									parentElements,
									logger
								);
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

									logger.log('🔄 Added loop', nodeDebugString(template));
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
						logger.log(
							'🔂 Not enough loop elements',
							score,
							nodeDebugString(current, 0, 0),
							'vs',
							nodeDebugString(other, 0, 0)
						);
					} else {
						logger.log(
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
			logger.log(
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
						const loopData = buildLoop(elements, [], parentElements, logger);
						if (loopData) {
							const { firstItems, template } = loopData;
							firstData.chainSet(
								other.reference,
								firstItems.map((item: Data) => item.toJSON())
							);

							logger.log(
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
					const loopData = buildLoop(elements, [], parentElements, logger);
					if (loopData) {
						const { secondItems, template } = loopData;
						secondData.chainSet(
							current.reference,
							secondItems.map((item: Data) => item.toJSON())
						);

						logger.log(
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

			if (other.type === 'loop' && current.type === 'loop') {
				logger.log(
					'🤔 ?????????????????????????',
					JSON.stringify(current),
					'\nvs\n',
					JSON.stringify(other),
					'?????????????????????????'
					);
			}

			merged.push(diffNodes(firstData, secondData, current, other, parentElements, logger));
			firstPointer += 1;
			secondPointer += 1;
		} else if (firstRemaining > secondRemaining) {
			logger.log(`? Conditional first weighted [${firstRemaining}, ${secondRemaining}]`);
			addConditionalNode(current, firstData, secondData);
			firstPointer += 1;
		} else {
			logger.log(`? Conditional second weighted [${firstRemaining}, ${secondRemaining}]`);
			addConditionalNode(other, secondData, firstData);
			secondPointer += 1;
		}
	}

	while (firstPointer < firstTree.length) {
		logger.log('? Conditional first remaining');
		addConditionalNode(firstTree[firstPointer], firstData, secondData);
		firstPointer += 1;
	}

	while (secondPointer < secondTree.length) {
		logger.log('? Conditional second remaining');
		addConditionalNode(secondTree[secondPointer], secondData, firstData);
		secondPointer += 1;
	}

	return merged;
}
