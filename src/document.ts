import Page from './page';
import Layout from './layout';

import { mergeTree } from './helpers/dom-diff';
import htmlToAST, { PageContentsConfig } from './helpers/html-parser';
import { ASTNode } from './types';
import Data from './helpers/Data';

export interface ASTTree {
	base: Page;
	pages: Page[];
	layout: Layout;
}

export interface DocumentConfig {
	content?: PageContentsConfig;
}

export interface DocumentOptions {
	pathname: string;
	content: string;
	config: DocumentConfig;
}

export default class Document {
	pathname: string;
	data: Data;
	layout: ASTNode[];
	contents: ASTNode[];

	constructor(options: DocumentOptions) {
		this.pathname = options.pathname;
		const { layout, contents } = htmlToAST(options.content, options.config);

		this.layout = layout;
		this.contents = contents;
		this.data = new Data([], {});
	}

	diff(other: Document): ASTTree {
		this.data = new Data([], {});
		const tree = mergeTree(0, this.data, other.data, this.layout, other.layout, []);

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
			layout: new Layout({
				tree: tree
			})
		};
	}

	debug() {
		return {
			pathname: this.pathname,
			layout: this.layout,
			contents: this.contents
		};
	}
}
