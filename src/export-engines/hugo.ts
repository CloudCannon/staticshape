import { CollectionResponse } from '../collection';
import {
	ASTConditionalAttribute,
	ASTConditionalNode,
	ASTContentNode,
	ASTInlineMarkdownNode,
	ASTLoopNode,
	ASTMarkdownNode,
	ASTNode,
	ASTVariableAttribute,
	ASTVariableNode
} from '../types';
import HtmlExportEngine, { FileExport } from './html';
import { dump } from 'js-yaml';

function renderFrontMatter(data: Record<string, any>) {
	return `---\n${dump(data, {
		noRefs: true,
		sortKeys: true
	})}---`;
}

/**
 * 
 * @param node 
 * @returns a string that is hugo formatted
 */
function formatParam(node: ASTVariableNode | ASTMarkdownNode | ASTInlineMarkdownNode | ASTConditionalNode | ASTLoopNode | ASTVariableAttribute | ASTConditionalAttribute){
	return node.reference.join('.').replaceAll(/([\-\:])+/g, '_');
}

export default class HugoExportEngine extends HtmlExportEngine {
	staticDirectory(): string {
		return 'static';
	}

	engineConfig(): FileExport {
		return {
			pathname: 'hugo.yaml',
			contents: "baseURL: ''"
		};
	}

	cloudCannonConfig(): FileExport {
		return {
			pathname: 'cloudcannon.config.yaml',
			contents: 'todo: true'
		};
	}

	exportLayout(
		layout: ASTNode[],
		collection: CollectionResponse,
		collectionKey: string
	): FileExport {
		return {
			pathname: `layouts/_default/${collectionKey}.html`,
			contents: this.renderAST(layout)
		};
	}

	exportCollectionItem(
		item: Record<string, any>,
		collection: CollectionResponse,
		collectionKey: string
	): FileExport {
		const folder = collectionKey !== 'pages' ? `${collectionKey}/` : '';

		const frontMatter = {
			...item.data,
			layout: collectionKey
		};
		return {
			pathname: `content/${folder}${item.pathname}`,
			contents: [renderFrontMatter(frontMatter), this.renderAST(item.content)].join('\n')
		};
	}
	
	renderVariable(node: ASTVariableNode): string {
		return `{{ .Params.${formatParam(node)} }}`;
	}

	renderMarkdownVariable(node: ASTMarkdownNode): string {
		return `{{ .Params.${formatParam(node)} | markdownify }}`;
	}

	renderInlineMarkdownVariable(node: ASTInlineMarkdownNode): string {
		// return `{{ .Params.${formatParam(node)} | fake_inline_markdownify_filter }}`;
		// TODO: fix fake_inline_markdownify_filter
		return `{{ .Params.${formatParam(node)} | markdownify }}`;

	}

	renderConditional(node: ASTConditionalNode): string {
		return `{{ if .Params.${formatParam(node)} }} ${this.renderASTNode(
			node.child
		)}{{ end }}`;
	}

	renderLoop(node: ASTLoopNode): string {
		return `{{ range .Params.${formatParam(node)} }}${this.renderASTNode(
			node.template
		)}{{ end }}`;
	}

	renderContent(_node: ASTContentNode): string {
		// TODO: support different render types (markdown vs blocks vs basic)
		return `{{ content }}`; // TODO: make this the actual render
	}

	renderVariableAttribute(attr: ASTVariableAttribute | ASTConditionalAttribute): string {
		return [attr.name, `"{{ .Params.${formatParam(attr)} }}"`].join('=');
	}
	
	// TODO: get this running
	renderConditionalAttribute(attr: ASTConditionalAttribute): string {
		return `{{ if .Params.${formatParam(attr)} }}${this.renderVariableAttribute(
			attr
		)}{{ end }}`;
	}
}
