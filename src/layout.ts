import { ASTNode } from './types';
import { mergeTree } from './helpers/dom-diff';
import Data from './helpers/Data';
import { Logger } from './logger';

interface LayoutOptions {
	logger?: Logger;
	tree: ASTNode[];
}
interface LayoutJSON {
	tree: ASTNode[];
}

export default class Layout {
	logger?: Logger;
	tree: ASTNode[];

	constructor(options: LayoutOptions) {
		this.tree = options.tree;
		this.logger = options.logger;
	}

	merge(other: Layout): Layout {
		const firstData = new Data([], {});
		const secondData = new Data([], {});

		return new Layout({
			logger: this.logger,
			tree: mergeTree(firstData, secondData, this.tree, other.tree, [], this.logger)
		});
	}

	toJSON(): LayoutJSON {
		return {
			tree: this.tree
		};
	}
}
