import { JSDOM } from 'jsdom';
import {
	ASTAttribute,
	ASTCDataNode,
	ASTCommentNode,
	ASTContentNode,
	ASTDoctypeNode,
	ASTElementNode,
	ASTNode,
	ASTTextNode
} from '../types';
import { DocumentConfig } from '../document';

// https://developer.mozilla.org/en-US/docs/Web/API/Node/nodeType
const nodeTypes = {
	1: 'element',
	2: 'attribute',
	3: 'text',
	4: 'cdata',
	7: 'PROCESSING_INSTRUCTION_NODE',
	8: 'comment',
	9: 'DOCUMENT_NODE',
	10: 'docType',
	11: 'DOCUMENT_FRAGMENT_NODE'
} as Record<number, string>;

export interface PageContentsConfig {
	selector?: string;
	afterSelector?: string;
	beforeSelector?: string;
}

class htmlProcessor {
	contentsConfig: PageContentsConfig | null;
	contents: ASTNode[];

	constructor(contentsConfig?: PageContentsConfig) {
		this.contentsConfig = contentsConfig || null;
		this.contents = [];
	}

	parse(html: string): ASTNode[] {
		const dom = new JSDOM(html);
		const nodes = [] as ASTNode[];
		for (const node of dom.window.document.childNodes) {
			nodes.push(this.formatNode(node));
		}

		return nodes;
	}

	formatNode(node: Node): ASTNode {
		const type = nodeTypes[node.nodeType];
		if (type === 'text') {
			return formatTextNode(node as Text);
		}
		if (type === 'docType') {
			return formatDoctypeNode(node as DocumentType);
		}
		if (type === 'comment') {
			return formatCommentNode(node as Comment);
		}
		if (type === 'cdata') {
			return formatCDATANode(node as CDATASection);
		}
		if (type === 'element') {
			return this.formatElement(node as HTMLElement);
		}

		throw new Error(`Unsupported node type: ${type || node.nodeType}`);
	}

	formatElement(element: HTMLElement): ASTElementNode | ASTContentNode {
		const attributes = {} as Record<string, ASTAttribute>;
		if (element.hasAttributes()) {
			for (const attr of element.attributes) {
				const formatted = formatAttribute(attr);
				attributes[formatted.name] = formatted;
			}
		}

		let children = [] as ASTNode[];
		let pageContents = [] as ASTNode[];

		let readingPageContents = false;
		if (this.contentsConfig?.selector && element.matches(this.contentsConfig?.selector)) {
			readingPageContents = true;
			children.push({ type: 'content' });
		}
		for (const node of element.childNodes) {
			const formattedNode = this.formatNode(node);

			const type = nodeTypes[node.nodeType];
			if (type === 'element') {
				const element = node as HTMLElement;
				if (
					readingPageContents &&
					this.contentsConfig?.beforeSelector &&
					element.matches(this.contentsConfig?.beforeSelector)
				) {
					readingPageContents = false;
					const lastItem = pageContents[pageContents.length - 1];
					if (lastItem?.type === 'text' && !lastItem.value.trim()) {
						children.push({ ...lastItem });
						lastItem.value = '\n';
					}
				}
			}

			if (readingPageContents) {
				if (
					formattedNode.type === 'text' &&
					!formattedNode.value.trim() &&
					pageContents.length === 0
				) {
					children.splice(children.length - 1, 0, formattedNode);
				} else {
					pageContents.push(formattedNode);
				}
			} else {
				children.push(formattedNode);
			}

			if (type === 'element') {
				const element = node as HTMLElement;
				if (
					!readingPageContents &&
					this.contentsConfig?.afterSelector &&
					element.matches(this.contentsConfig?.afterSelector)
				) {
					readingPageContents = true;
					children.push({ type: 'content' });
				}
			}
		}

		if (pageContents.length > 0) {
			if (this.contents.length > 0) {
				throw new Error('Duplicate contents parent found');
			}
			const lastItem = pageContents[pageContents.length - 1];
			if (lastItem?.type === 'text' && !lastItem.value.trim()) {
				children.push({ ...lastItem });
				lastItem.value = '\n';
			}
			this.contents = pageContents;
		}

		return {
			type: 'element',
			name: element.localName,
			attrs: attributes,
			children: children
		};
	}
}

interface HTMLProcessorResponse {
	layout: ASTNode[];
	contents: ASTNode[];
}

export default function htmlToAST(html: string, config: DocumentConfig): HTMLProcessorResponse {
	const processor = new htmlProcessor(config.content);
	const layout = processor.parse(html);

	return {
		layout,
		contents: processor.contents
	};
}

function formatTextNode(node: Text): ASTTextNode {
	return {
		type: 'text',
		value: node.wholeText
	};
}

function formatAttribute(attr: Attr): ASTAttribute {
	return {
		type: 'attribute',
		name: attr.name,
		value: attr.value
	};
}

function formatCommentNode(node: Comment): ASTCommentNode {
	return {
		type: 'comment',
		value: node.data || ''
	};
}

function formatDoctypeNode(node: DocumentType): ASTDoctypeNode {
	return {
		type: 'doctype',
		value: node?.name || 'html'
	};
}

function formatCDATANode(node: CDATASection): ASTCDataNode {
	return {
		type: 'cdata',
		value: node.data || ''
	};
}
