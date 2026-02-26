import { CollectionResponse } from '../collection.ts';
import Page from '../page.ts';
import { SiteResponse } from '../site.ts';
import {
	ASTConditionalNode,
	ASTContentNode,
	ASTDoctypeNode,
	ASTElementNode,
	ASTNode,
	ASTTextNode,
	ASTVariableNode,
	ASTCommentNode,
	ASTVariableAttribute,
	ASTConditionalAttribute,
	ASTStaticAttribute,
	ASTLoopNode,
	ASTAttributeList,
	ASTMarkdownNode,
	ASTInlineMarkdownNode
} from '../types.ts';

interface ExportEngineOptions {
	sourceBasePath: string;
	exportBasePath: string;
	siteResponse: SiteResponse;
}

export interface FileExport {
	pathname: string;
	contents: string;
}

export default class HtmlExportEngine {
	options: ExportEngineOptions | null;
	constructor(options?: ExportEngineOptions) {
		this.options = options ?? null;
	}

	staticDirectory(): string {
		throw new Error('Not yet implemented');
	}

	engineConfig(): FileExport {
		throw new Error('Not yet implemented');
	}

	cloudCannonConfig(): FileExport {
		throw new Error('Not yet implemented');
	}

	exportLayout(
		_layout: ASTNode[],
		_collection: CollectionResponse,
		_collectionKey: string
	): FileExport {
		throw new Error('Not yet implemented');
	}

	exportCollectionItem(
		_item: Page,
		_collection: CollectionResponse,
		_collectionKey: string
	): FileExport {
		throw new Error('Not yet implemented');
	}

	renderAST(tree: ASTNode[], variableScope: string): string {
		return tree.map((node) => this.renderASTNode(node, variableScope)).join('');
	}

	renderASTNode(node: ASTNode, variableScope: string): string {
		switch (node.type) {
			case 'doctype':
				return this.renderDoctype(node, variableScope);
			case 'element':
				return this.renderElement(node, variableScope);
			case 'text':
				return this.renderText(node, variableScope);
			case 'comment':
				return this.renderComment(node, variableScope);
			case 'variable':
				return this.renderVariable(node, variableScope);
			case 'markdown-variable':
				return this.renderMarkdownVariable(node, variableScope);
			case 'inline-markdown-variable':
				return this.renderInlineMarkdownVariable(node, variableScope);
			case 'conditional':
				return this.renderConditional(node, variableScope);
			case 'loop':
				return this.renderLoop(node, variableScope);
			case 'content':
				return this.renderContent(node, variableScope);
			default:
				break;
		}
		throw new Error(`${node.type} render: not yet implemented`);
	}

	renderDoctype(doctype: ASTDoctypeNode, variableScope: string): string {
		return `<!DOCTYPE ${doctype.value}>`;
	}

	renderAttributes(attrMap: ASTAttributeList, variableScope: string): string {
		const attrs = Object.values(attrMap).filter((attr) => !!attr);
		if (attrs.length === 0) {
			return '';
		}

		return ` ${attrs
			.map((attr) => {
				if (attr.type === 'variable-attribute') {
					return this.renderVariableAttribute(attr, variableScope);
				}
				if (attr.type === 'conditional-attribute') {
					return this.renderConditionalAttribute(attr, variableScope);
				}
				return this.renderAttribute(attr, variableScope);
			})
			.join(' ')}`;
	}

	renderAttribute(attr: ASTStaticAttribute, variableScope: string): string {
		return [attr.name, `"${attr.value}"`].join('=');
	}

	renderVariableAttribute(_attr: ASTVariableAttribute | ASTConditionalAttribute, variableScope: string): string {
		throw new Error('Not yet implemented');
	}

	renderConditionalAttribute(_attr: ASTConditionalAttribute, variableScope: string): string {
		throw new Error('Not yet implemented');
	}

	renderElement(element: ASTElementNode, variableScope: string): string {
		let { name } = element;

		if (name.startsWith(':svg:')) {
			name = name.substring(5);
		}

		// Elements that don't need closing tags 
		if(name === "meta" || name === "link" || name === "img"){
			return `<${name}${this.renderAttributes(element.attrs, variableScope)}>${this.renderAST(element.children, variableScope)}`;
		}
		// // TODO: Fix style tags 
		// if(name === "style"){
		// 	return `<!-- Style was here -->`;
		// }

		// TODO: Fix scripts
		if(name === "script"){
			return `<!-- Script was here -->`;
		}
		return `<${name}${this.renderAttributes(element.attrs, variableScope)}>${this.renderAST(
			element.children, variableScope
		)}</${name}>`;
	}

	renderText(text: ASTTextNode, variableScope: string): string {
		return text.value;
	}

	renderComment(text: ASTCommentNode, variableScope: string): string {
		return `<!-- ${text.value} -->`;
	}

	renderVariable(_node: ASTVariableNode, variableScope: string): string {
		throw new Error('Variable render not yet implemented');
	}

	renderMarkdownVariable(_node: ASTMarkdownNode, variableScope: string): string {
		throw new Error('Markdown render not yet implemented');
	}

	renderInlineMarkdownVariable(_node: ASTInlineMarkdownNode, variableScope: string): string {
		throw new Error('Inline markdown render not yet implemented');
	}

	renderConditional(_node: ASTConditionalNode, variableScope: string): string {
		throw new Error('Conditional render not yet implemented');
	}

	renderLoop(_node: ASTLoopNode, variableScope: string): string {
		throw new Error('Loop render not yet implemented');
	}

	renderContent(_node: ASTContentNode, variableScope: string): string {
		throw new Error('Content render not yet implemented');
	}
}
