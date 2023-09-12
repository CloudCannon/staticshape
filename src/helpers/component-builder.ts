import { ASTElementNode, ASTNode, ASTAttributeList } from '../types';
import { invalidLoopTags, findRepeatedIndex } from './loops';
import Data from './Data';
import { findEndOfMarkdownIndex, isMarkdownElement, markdownify } from './markdown';
import { diffNodes } from './dom-diff';
import { nodeDebugString } from './debug-helper';

export const editableAttrs: Record<string, boolean> = {
	href: true,
	src: true,
	srcset: true,
	alt: true,
	title: true
};

export function convertAttrsToVariables(data: Data, element: ASTElementNode): ASTAttributeList {
	const converted = {} as ASTAttributeList;
	console.log(element.attrs);
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
	template: ASTNode;
}

interface LoopState {
	template: ASTNode;
	blocks: Data[];
	base: Data;
}

function buildLoop(elements: ASTElementNode[], parentElements: ASTElementNode[]): Loop | null {
	if (elements.length < 2) {
		throw new Error('Loop must contain more than 1 element');
	}

	const data = [] as Data[];
	const base = elements[0];
	let current: LoopState | null = null;
	for (let i = 1; i < elements.length; i++) {
		const loopEl = elements[i];
		const newBaseData = new Data([], {});
		const otherData = new Data([], {});
		const template = diffNodes(newBaseData, otherData, base, loopEl, parentElements);
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

	data.unshift(current.base);
	return {
		itemData: data,
		template: current.template
	};
}

export function convertElementToComponent(
	data: Data,
	element: ASTElementNode,
	parentElements: ASTElementNode[] = []
): ASTElementNode {
	console.log('convertElementToComponent', nodeDebugString(element, 0, 0));
	return {
		type: 'element',
		name: element.name,
		attrs: convertAttrsToVariables(data, element),
		children: convertTreeToComponents(data, element.children, [...parentElements, element])
	};
}

export function convertTreeToComponents(
	data: Data,
	tree: ASTNode[],
	parentElements: ASTElementNode[] = []
): ASTNode[] {
	const converted = [] as ASTNode[];
	let index = 0;
	console.log(index, tree.length);
	while (index < tree.length) {
		const node = tree[index];
		console.log(index, nodeDebugString(node, 0, 0));
		if (node.type === 'element') {
			if (isMarkdownElement(node)) {
				const remainingNodes = tree.slice(index);

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

			if (!invalidLoopTags[node.name]) {
				const remainingNodes = tree.slice(index);
				const repeatedIndex = findRepeatedIndex(remainingNodes);
				if (repeatedIndex > 0) {
					const repeatedElements = remainingNodes
						.slice(0, repeatedIndex + 1)
						.filter((node) => node.type === 'element') as ASTElementNode[];

					if (repeatedElements.length > 1) {
						const loopData = buildLoop(repeatedElements, parentElements);
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

			converted.push(convertElementToComponent(data, node, parentElements));
			index += 1;
		} else if (node.type === 'text' && node.value.trim()) {
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
