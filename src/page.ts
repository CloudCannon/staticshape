import { ASTNode } from './types.ts';
import Data from './helpers/Data.ts';

interface PageOptions {
	pathname: string;
	data: Data;
	content: ASTNode[];
}

export interface PageJSON {
	pathname: string;
	data: Record<string, any>;
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

	mergeData(data: Data): Page {
		return new Page({
			pathname: this.pathname,
			data: this.data.merge(data),
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
