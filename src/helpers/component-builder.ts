import { ASTElementNode, ASTNode, ASTAttributeList } from '../types';
import { invalidLoopTags, findRepeatedIndex } from './loops';
import Data from './Data';
import {
	findEndOfMarkdownIndex,
	invalidMarkdownParentTags,
	isMarkdownElement,
	isMarkdownInlineTree,
	markdownify,
	validMarkdownBlockTags,
	validMarkdownInlineTags
} from './markdown';
import { diffNodes } from './dom-diff';
import { Logger, nodeDebugString } from '../logger';

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
	logger?: Logger
): ASTAttributeList {
	const converted = {} as ASTAttributeList;
	Object.keys(element.attrs).forEach((attrName) => {
		const attr = element.attrs[attrName];
		if (attr && attr.type === 'attribute' && editableAttrs[attrName]) {
			const variableName = data.getVariableName([element], '', attrName);
			data.set(variableName, attr.value);
			converted[attrName] = {
				type: 'variable-attribute',
				name: attrName,
				reference: data.getChain(variableName)
			};
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
	config: ComponentBuilderConfig = {},
	logger?: Logger
): Loop | null {
	const data = [] as Data[];
	const base = elements[0];
	let current: LoopState | null = null;
	for (let i = 1; i < elements.length; i++) {
		const loopEl = elements[i];
		const newBaseData = new Data([], {});
		const otherData = new Data([], {});
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
			logger?.log(
				'🤔 Diffing loop templates',
				nodeDebugString(current.template, 0, 4),
				'vs',
				nodeDebugString(template, 0, 4)
			);
			logger?.log('🐓', nodeDebugString(current.template, 0, 4));
			logger?.log('🐄', nodeDebugString(template, 0, 4));
			logger?.log('🥂', nodeDebugString(merged, 0, 4));
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
	logger?: Logger
): ASTElementNode {
	return {
		type: 'element',
		name: element.name,
		attrs: config.disableAttributeVariables
			? element.attrs
			: convertAttrsToVariables(data, element, logger),
		children: convertTreeToComponents(
			data,
			element.children,
			[...parentElements, element],
			config,
			logger
		)
	};
}

export function convertTreeToComponents(
	data: Data,
	tree: ASTNode[],
	parentElements: ASTElementNode[] = [],
	config: ComponentBuilderConfig = {},
	logger?: Logger
): ASTNode[] {
	const parent = parentElements[parentElements.length - 1];
	if (parent && validMarkdownBlockTags[parent?.name] && !config.disableInlineMarkdown) {
		if (tree.length > 0 && isMarkdownInlineTree(tree, validMarkdownInlineTags, true)) {
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
						const loopData = buildLoop(
							repeatedElements,
							parentElements,
							config,
							logger
						);
						if (loopData) {
							const { itemData, template } = loopData;
							const variableName = data.getVariableName(parentElements, '', 'items');
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

			converted.push(convertElementToComponent(data, node, parentElements, config, logger));
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
			converted.push(node);
			index += 1;
		}
	}

	return converted;
}
