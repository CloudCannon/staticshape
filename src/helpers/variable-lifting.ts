import { ASTElementNode } from '../types.ts';
import Data from './Data.ts';

export function liftVariables(elementNode: ASTElementNode, elementData: Data): Record<string, any> {
	let liftedVariables: Record<string, any> = liftAttributeVariables(elementNode, elementData);
	elementNode.children.forEach((childNode) => {
		if (childNode.type === 'element') {
			liftedVariables = {
				...liftedVariables,
				...liftVariables(childNode, elementData),
				...liftAttributeVariables(childNode, elementData)
			};
			return;
		}

		if (
			childNode.type === 'conditional' ||
			childNode.type === 'loop' ||
			childNode.type === 'markdown-variable' ||
			childNode.type === 'variable' ||
			childNode.type === 'inline-markdown-variable'
		) {
			const key = childNode.reference[0];
			liftedVariables[key] = elementData.getKey(key);
		}
	});

	return liftedVariables;
}

function liftAttributeVariables(
	elementNode: ASTElementNode,
	elementData: Data
): Record<string, any> {
	let liftedVariables: Record<string, any> = {};

	Object.values(elementNode.attrs).forEach((attr) => {
		if (attr.type === 'attribute') {
			return;
		}

		const key = attr.reference[0];
		liftedVariables[key] = elementData.getKey(key);
	});

	return liftedVariables;
}
