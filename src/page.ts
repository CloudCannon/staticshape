import { ASTNode } from './types';
import Data, { Hash } from './helpers/Data';

interface PageOptions {
	pathname: string;
	data: Data;
	content: ASTNode[];
}

export interface PageJSON {
	pathname: string;
	data: Hash;
	content: ASTNode[];
}

export default class Page {
	pathname: string;
	data: Data;
	content: ASTNode[];

	constructor(options: PageOptions) {
		this.pathname = options.pathname;
		this.data = options.data;
		this.content = options.content;
	}

	merge(other: Page): Page {
		return new Page({
			pathname: this.pathname,
			data: this.data.merge(other.data),
			content: this.content
		});
	}

	mergeData(other: Data): Page {
		return new Page({
			pathname: this.pathname,
			data: this.data.merge(other),
			content: this.content
		});
	}

	toJSON(): PageJSON {
		return {
			pathname: this.pathname,
			data: this.data.toJSON(),
			content: this.content
		};
	}
}
