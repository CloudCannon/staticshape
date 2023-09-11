import { ASTNode } from './types';
import { mergeTree } from './helpers/dom-diff';
import Data from './helpers/Data';

interface LayoutOptions {
	tree: ASTNode[];
}

export default class Layout {
	options: LayoutOptions;

	constructor(options: LayoutOptions) {
		this.options = options;
	}

	merge(other: Layout): Layout {
		const firstData = new Data([], {});
		const secondData = new Data([], {});

		return new Layout({
			...this.options,
			tree: mergeTree(firstData, secondData, this.options.tree, other.options.tree)
		});
	}

	toJSON(): object {
		return this.options;
	}
}
