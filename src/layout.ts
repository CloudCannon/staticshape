import { ASTNode } from './types';
import { mergeTree } from './helpers/dom-merge';

interface LayoutOptions {
	tree: ASTNode[];
}

export default class Layout {
	options: LayoutOptions;

	constructor(options: LayoutOptions) {
		this.options = options;
	}

	merge(other: Layout): Layout {
		return new Layout({
			...this.options,
			tree: mergeTree(this.options.tree, other.options.tree)
		});
	}

	toJSON(): object {
		return this.options;
	}
}
