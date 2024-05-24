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
	return node.reference.join('.').replaceAll(/([\-\:\s\@])+/g, '_');
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
			// TODO: this logic is currently fixed to use a default layout (list.html)
			pathname: `layouts/${collectionKey}/list.html`,
			contents: this.renderAST(layout, ".Params.")
		};
	}

	exportCollectionItem(
		item: Record<string, any>,
		collection: CollectionResponse,
		collectionKey: string
	): FileExport {
		const folder = collectionKey !== 'pages' ? `${collectionKey}/` : '';
		// TODO: the layout is currenty fixed to use the default layout
		const frontMatter = {
			...item.data,
			type: collectionKey
		};
		return {
			pathname: `content/${folder}${item.pathname.replace('index', '_index')}`,
			contents: [renderFrontMatter(frontMatter), this.renderAST(item.content, ".Params.")].join('\n')
		};
	}
	
	renderVariable(node: ASTVariableNode, variableScope: string): string {
		return `{{ ${variableScope}${formatParam(node)} }}`;
	}

	renderMarkdownVariable(node: ASTMarkdownNode, variableScope: string): string {
		return `{{ ${variableScope}${formatParam(node)} | markdownify }}`;
	}

	renderInlineMarkdownVariable(node: ASTInlineMarkdownNode, variableScope: string): string {
		// return `{{ .Params.${formatParam(node)} | fake_inline_markdownify_filter }}`;
		// TODO: fix fake_inline_markdownify_filter
		return `{{ ${variableScope}${formatParam(node)} | markdownify }}`;

	}

	renderConditional(node: ASTConditionalNode, variableScope: string): string {
		return `{{ with ${variableScope}${formatParam(node)} }} ${this.renderASTNode(
			node.child, "."
		)}{{ end }}`;
	}

	renderLoop(node: ASTLoopNode, variableScope: string): string {
		return `{{ range ${variableScope}${formatParam(node)} }}${this.renderASTNode(
			node.template, "."
		)}{{ end }}`;
	}

	renderContent(_node: ASTContentNode, variableScope: string): string {
		return `{{ .Content }}`; 
	}

	renderVariableAttribute(attr: ASTVariableAttribute | ASTConditionalAttribute, variableScope: string): string {
		return [attr.name, `"{{ ${variableScope}${formatParam(attr)} }}"`].join('=');
	}
	
	renderConditionalAttribute(attr: ASTConditionalAttribute, variableScope: string): string {
		return `{{ with ${variableScope}${formatParam(attr)} }}{{ . }}{{ end }}`;
	}
}
