import { ASTNode } from '../types';

export function nodeDebugString(node: ASTNode, depth = 0, maxDepth = 1): string {
	switch (node.type) {
		case 'content':
			return `{{ ${node.type} }}`;
		case 'variable':
		case 'markdown-variable':
		case 'conditional':
		case 'loop':
			return `${node.type}: ${JSON.stringify(node.reference)}`;
		case 'comment':
		case 'cdata':
		case 'text':
		case 'doctype':
			return `${node.type}: ${JSON.stringify(node.value)}`;
		case 'element':
			let attrs = Object.values(node.attrs)
				.filter((attr) => !!attr)
				.map((attr) => {
					if (attr.type === 'attribute') {
						return `${attr.name}=${JSON.stringify(attr.value)}`;
					}
					return `${attr.name}="{{ ${attr.reference.join('.')} }}"`;
				})
				.join(' ');
			if (attrs.length > 0) {
				attrs = ` ${attrs}`;
			}

			let children = '';
			if (node.children.length > 0 && maxDepth !== 0) {
				const indent = `\n${'  '.repeat(depth + 1)}⤷ `;
				if (depth > maxDepth) {
					children = `${indent}[${node.children.length} filtered]`;
				} else {
					children = node.children
						.map((child) => `${indent}${nodeDebugString(child, depth + 1, maxDepth)}`)
						.join('');
				}
			}

			return `<${node.name}${attrs}${children ? '' : ' /'}>${children}`;
		default:
			break;
	}
	return JSON.stringify(node);
}

export function nodeListDebugString(nodes: ASTNode[], depth = 0, maxDepth = 1): string {
	return nodes
		.map((node, index) => {
			return `${index} → ${nodeDebugString(node, depth, maxDepth)}`;
		})
		.join('\n');
}
