import { ASTElementNode, ASTNode, ASTAttributeList } from '../types.ts';
import { invalidLoopTags, findRepeatedIndex } from './loops.ts';
import Data from './Data.ts';
import {
	findEndOfMarkdownIndex,
	invalidMarkdownParentTags,
	isMarkdownElement,
	isMarkdownInlineTree,
	markdownify,
	validMarkdownBlockTags,
	validMarkdownInlineTags
} from './markdown.ts';
import { diffNodes } from './dom-diff.ts';
import { Logger, nodeDebugString } from '../logger.ts';
import { liftVariables } from './variable-lifting.ts';
import { extractStaticContext } from './variation-map.ts';

export interface ComponentBuilderConfig {
	disableMarkdown?: boolean;
	disableInlineMarkdown?: boolean;
	disableTextVariables?: boolean;
	disableAttributeVariables?: boolean;
	disableLoops?: boolean;
}

export const editableAttrs: Record<string, boolean> = {
	href: true,
	src: true,
	srcset: true,
	alt: true,
	title: true
};

export function convertAttrsToVariables(
	data: Data,
	element: ASTElementNode,
	existingData: Data,
	logger: Logger
): ASTAttributeList {
	const converted = {} as ASTAttributeList;
	Object.keys(element.attrs).forEach((attrName) => {
		const attr = element.attrs[attrName];
		if (attr && attr.type === 'attribute' && editableAttrs[attrName]) {
			const variableName = data.getVariableName([element], '', attrName);
			if (data.variationMap) {
				data.variationMap.record(variableName, {
					sourceElement: extractStaticContext(element),
					attrName,
					scope: data.variationScope
				});
			}
			data.set(variableName, attr.value);
			converted[attrName] = {
				type: 'variable-attribute',
				name: attrName,
				reference: data.getChain(variableName)
			};
		} else if (attr && attr.type !== 'attribute') {
			logger.log(
				'📀 Inheriting attribute variables',
				JSON.stringify(attr),
				'from',
				JSON.stringify(existingData)
			);

			const variableName = attr.reference[0];
			if (!existingData.hasKey(variableName)) {
				logger.log(
					'💿 Attr variable missing from data context, skipping inheritance',
					JSON.stringify(attr.reference),
					variableName,
					JSON.stringify(existingData)
				);
				converted[attrName] = attr;
				return;
			}

			if (data !== existingData) {
				logger.log('💿 SETTING ', variableName, `${existingData.getKey(variableName)}`);
				data.set(variableName, existingData.getKey(variableName));
				logger.log('💿 DELETING ', variableName);
				existingData.delete(variableName);
			}
		} else {
			converted[attrName] = attr;
		}
	});
	return converted;
}

interface Loop {
	itemData: Data[];
	template: ASTElementNode;
}

interface LoopState {
	template: ASTElementNode;
	blocks: Data[];
	base: Data;
}

function buildLoop(
	elements: ASTElementNode[],
	parentElements: ASTElementNode[],
	inputData: Data,
	outputData: Data,
	_config: ComponentBuilderConfig,
	logger: Logger,
	scopeHint?: string
): Loop | null {
	const data = [] as Data[];
	const base = elements[0];
	let current: LoopState | null = null;

	let inputBaseData: Record<string, any> = {};

	const baseLiftedVariables = liftVariables(base, inputData);
	Object.keys(baseLiftedVariables).forEach((variableName) => {
		inputBaseData[variableName] = inputData.getKey(variableName);
		outputData.delete(variableName);
	});

	for (let i = 1; i < elements.length; i++) {
		const loopEl = elements[i];
		const newBaseData = new Data([], structuredClone(inputBaseData));
		newBaseData.variationMap = outputData.variationMap;
		if (scopeHint) newBaseData.variationScope = scopeHint;
		const inputLoopData: Record<string, any> = {};
		const liftedVariables = liftVariables(loopEl, inputData);
		Object.keys(liftedVariables).forEach((variableName) => {
			inputLoopData[variableName] = inputData.getKey(variableName);
			outputData.delete(variableName);
		});

		const otherData = new Data([], structuredClone(inputLoopData));
		otherData.variationMap = outputData.variationMap;
		if (scopeHint) otherData.variationScope = scopeHint;
		const template = diffNodes(
			newBaseData,
			otherData,
			base,
			loopEl,
			parentElements,
			logger
		) as ASTElementNode;
		data.push(otherData);

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
			logger.log(
				'🤔 Diffing loop templates',
				nodeDebugString(current.template, 0, 4),
				'vs',
				nodeDebugString(template, 0, 4)
			);
			logger.log('🐓', nodeDebugString(current.template, 0, 4));
			logger.log('🐄', nodeDebugString(template, 0, 4));
			logger.log('🥂', nodeDebugString(merged, 0, 4));
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

	data.unshift(current.base);
	return {
		itemData: data,
		template: current.template
	};
}

export function convertElementToComponent(
	data: Data,
	element: ASTElementNode,
	parentElements: ASTElementNode[] = [],
	config: ComponentBuilderConfig = {},
	existingData: Data,
	logger: Logger
): ASTElementNode {
	return {
		type: 'element',
		name: element.name,
		attrs: config.disableAttributeVariables
			? element.attrs
			: convertAttrsToVariables(data, element, existingData, logger),
		children: convertTreeToComponents(
			data,
			element.children,
			[...parentElements, element],
			config,
			existingData,
			logger
		)
	};
}

export function convertTreeToComponents(
	data: Data,
	tree: ASTNode[],
	parentElements: ASTElementNode[] = [],
	config: ComponentBuilderConfig = {},
	existingData: Data,
	logger: Logger
): ASTNode[] {
	const parent = parentElements[parentElements.length - 1];
	if (parent && validMarkdownBlockTags[parent?.name] && !config.disableInlineMarkdown) {
		if (tree.length > 0 && isMarkdownInlineTree(tree, validMarkdownInlineTags, true)) {
			logger.log(
				'📀 Inheriting markdown variables',
				JSON.stringify(tree),
				'from',
				JSON.stringify(existingData)
			);
			const variableName = data.getVariableName(parentElements, '', 'inline_markdown');
			data.set(variableName, markdownify(tree));
			return [
				{
					type: 'inline-markdown-variable',
					reference: data.getChain(variableName)
				}
			];
		}
	}

	const converted = [] as ASTNode[];
	let index = 0;
	while (index < tree.length) {
		const node = tree[index];
		logger.log('📀 Componenting', nodeDebugString(node));
		logger.log(JSON.stringify(existingData));

		const remainingNodes = tree.slice(index);
		if (node.type === 'element') {
			if (
				isMarkdownElement(node) &&
				parent &&
				!invalidMarkdownParentTags[parent.name] &&
				!config.disableMarkdown
			) {
				const indexes = findEndOfMarkdownIndex(remainingNodes);
				const markdownElements = remainingNodes
					.slice(0, indexes.lastElIndex + 1)
					.filter((node) => node.type === 'element') as ASTElementNode[];
				const variableName = data.getVariableName(parentElements, '', 'markdown');
				data.set(variableName, markdownify(markdownElements));
				converted.push({
					type: 'markdown-variable',
					reference: data.getChain(variableName)
				});

				index += indexes.lastElIndex + 1;
				continue;
			}

			if (!invalidLoopTags[node.name] && !config.disableLoops) {
				const repeatedIndex = findRepeatedIndex(remainingNodes);
				if (repeatedIndex > 0) {
					const repeatedElements = remainingNodes
						.slice(0, repeatedIndex + 1)
						.filter((node) => node.type === 'element') as ASTElementNode[];

					if (repeatedElements.length > 1) {
						const anticipatedLoopVar = data.getVariableName(
							parentElements,
							'',
							'items'
						);
						const loopData = buildLoop(
							repeatedElements,
							parentElements,
							existingData,
							data,
							config,
							logger,
							anticipatedLoopVar
						);
						if (loopData) {
							const { itemData, template } = loopData;
							const variableName = anticipatedLoopVar;
							data.set(
								variableName,
								itemData.map((item: Data) => item.toJSON())
							);

							converted.push({
								type: 'loop',
								reference: data.getChain(variableName),
								template
							});
							index += repeatedIndex + 1;
							continue;
						}
					}
				}
			}

			converted.push(
				convertElementToComponent(data, node, parentElements, config, existingData, logger)
			);
			index += 1;
		} else if (node.type === 'text' && node.value.trim() && !config.disableTextVariables) {
			const variableName = data.getVariableName(parentElements);
			data.set(variableName, node.value);
			converted.push({
				type: 'variable',
				reference: data.getChain(variableName)
			});
			index += 1;
		} else {
			if (
				node.type === 'conditional' ||
				node.type === 'markdown-variable' ||
				node.type === 'variable' ||
				node.type === 'loop' ||
				node.type === 'inline-markdown-variable'
			) {
				logger.log(
					'📀 Inheriting node variables',
					JSON.stringify(node),
					'from',
					JSON.stringify(existingData)
				);

				const variableName = node.reference[0];
				if (existingData.hasKey(variableName) && data !== existingData) {
					logger.log('💿 SETTING ', variableName, `${existingData.getKey(variableName)}`);
					data.set(variableName, existingData.getKey(variableName));
					logger.log('💿 DELETING ', variableName);
					existingData.delete(variableName);
				}
			}
			converted.push(node);
			index += 1;
		}
	}

	return converted;
}
