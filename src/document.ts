import Page from './page.js';

import { mergeTree } from './helpers/dom-diff.js';
import htmlToAST, { HtmlProcessorConfig, PageContentsConfig } from './helpers/html-parser.js';
import { ASTNode } from './types.js';
import Data from './helpers/Data.js';
import { Logger } from './logger.js';

export interface ASTTree {
	base: Page;
	pages: Page[];
	layout: ASTNode[];
}

export interface DocumentConfig {
	content?: PageContentsConfig;
}

export interface DocumentOptions {
	pathname: string;
	content: string;
	config: DocumentConfig;
	processorConfig: HtmlProcessorConfig;
	logger: Logger;
}

export default class Document {
	logger: Logger;
	pathname: string;
	data: Data;
	layout: ASTNode[];
	contents: ASTNode[];

	constructor(options: DocumentOptions) {
		this.logger = options.logger;
		this.pathname = options.pathname;
		const { layout, contents } = htmlToAST(
			options.content,
			options.config,
			options.processorConfig
		);
		this.layout = layout;
		this.contents = contents;
		this.data = new Data([], {});
	}

	diff(other: Document): ASTTree {
		this.data = new Data([], {});

		this.logger.log(`Comparing ${this.pathname} and ${other.pathname}`);
		const tree = mergeTree(this.data, other.data, this.layout, other.layout, [], this.logger);
		return {
			base: new Page({
				pathname: this.pathname,
				content: this.contents,
				data: this.data
			}),
			pages: [
				new Page({
					pathname: other.pathname,
					content: other.contents,
					data: other.data
				})
			],
			layout: tree
		};
	}
}
