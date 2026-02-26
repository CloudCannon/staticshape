import HtmlExportEngine from '../export-engines/html.ts';
import { ASTElementNode, ASTNode } from '../types.ts';
import { findLastNonWhitespaceIndex } from './node-helper.ts';
import * as Turndown from 'turndown';
const TurndownService = (Turndown as any).default;

export const invalidMarkdownParentTags: Record<string, boolean> = {
	body: true
};

const listTags: Record<string, boolean> = {
	ul: true,
	ol: true
};

const listItemTags: Record<string, boolean> = {
	li: true
};

export const validMarkdownBlockTags: Record<string, boolean> = {
	h1: true,
	h2: true,
	h3: true,
	h4: true,
	h5: true,
	p: true,
	img: true,
	...listTags
};

export const validMarkdownInlineTags: Record<string, boolean> = {
	a: true,
	em: true,
	strong: true,
	img: true,
	br: true,
	sup: true,
	sub: true
};

const validInlineListTags: Record<string, boolean> = {
	...validMarkdownInlineTags,
	...listTags
};

const validAttributes: Record<string, Record<string, boolean>> = {
	img: {
		src: true,
		alt: true
	},
	a: {
		href: true
	}
};

export function findEndOfMarkdownIndex(nodes: ASTNode[]): Record<string, number> {
	let firstElIndex = -1;
	let lastElIndex = -1;
	let lastCheckedIndex = -1;
	for (let i = 0; i < nodes.length; i++) {
		const node = nodes[i];

		if (node.type === 'text') {
			if (node.value.trim()) {
				break;
			}
		} else if (node.type === 'element') {
			if (!isMarkdownElement(node)) {
				break;
			}
			if (firstElIndex < 0) {
				firstElIndex = i;
			}
			lastElIndex = i;
		}
		lastCheckedIndex = i;
	}

	return {
		lastElIndex,
		lastCheckedIndex
	};
}

export function isMarkdownInlineTree(
	nodes: ASTNode[],
	validTags: Record<string, boolean>,
	allowText: boolean
): boolean {
	for (let i = 0; i < nodes.length; i++) {
		const node = nodes[i];

		if (node.type === 'element') {
			if (!validTags[node.name]) {
				return false;
			}
		} else if (node.type === 'text') {
			if (node.value.trim() && !allowText) {
				return false;
			}
		} else if (node.type !== 'comment') {
			return false;
		}
	}
	return true;
}

export function isMarkdownTree(nodes: ASTNode[]): boolean {
	const nonWhitespaceIndex = findLastNonWhitespaceIndex(nodes);
	const { lastElIndex, lastCheckedIndex } = findEndOfMarkdownIndex(nodes);

	return lastCheckedIndex === nodes.length - 1;
}

export function isMarkdownElement(el: ASTElementNode): boolean {
	const name = el.name;
	if (!validMarkdownBlockTags[name]) {
		return false;
	}

	const attributesValid = Object.keys(el.attrs).reduce((memo: boolean, attrName) => {
		return memo && validAttributes[name]?.[attrName];
	}, true);

	if (!attributesValid) {
		return false;
	}

	if (listTags[name]) {
		return isMarkdownInlineTree(el.children, listItemTags, false);
	}

	if (listItemTags[name]) {
		return isMarkdownInlineTree(el.children, validInlineListTags, true);
	}

	return isMarkdownInlineTree(el.children, validMarkdownInlineTags, true);
}

// Converts to HTML
export function markdownify(ast: ASTNode[]): string {
	const exportEngine = new HtmlExportEngine();
	const html = ast.map((node) => exportEngine.renderASTNode(node, '')).join('');
	const service = new TurndownService({
		headingStyle: 'atx'
	});
	return service.turndown(html);
}
