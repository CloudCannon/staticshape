import Page from './page.ts';

import { mergeTree } from './helpers/dom-diff.ts';
import htmlToAST, { HtmlProcessorConfig, PageContentsConfig } from './helpers/html-parser.ts';
import { ASTNode } from './types.ts';
import Data from './helpers/Data.ts';
import { Logger } from './logger.ts';
import VariationMap from './helpers/variation-map.ts';

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
	variationMap?: VariationMap;
}

export default class Document {
	logger: Logger;
	pathname: string;
	data: Data;
	layout: ASTNode[];
	contents: ASTNode[];
	variationMap?: VariationMap;

	constructor(options: DocumentOptions) {
		this.logger = options.logger;
		this.pathname = options.pathname;
		this.variationMap = options.variationMap;
		const { layout, contents } = htmlToAST(
			options.content,
			options.config,
			options.processorConfig
		);
		this.layout = layout;
		this.contents = contents;
		this.data = new Data([], {});
		this.data.variationMap = this.variationMap;
	}

	diff(other: Document): ASTTree {
		this.data = new Data([], {});
		this.data.variationMap = this.variationMap;

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
