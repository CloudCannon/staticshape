import Page from './page';
import Layout from './layout';

import { mergeTree } from './helpers/dom-diff';
import htmlToAST from './helpers/html-parser';
import { ASTNode } from './types';

export interface ASTTree {
    base: Page;
    pages: Page[];
    layout: Layout;
}

export interface DocumentContentConfig {
    selector: string;
}

export interface DocumentConfig {
    content?: DocumentContentConfig;
}

export interface DocumentOptions {
    pathname: string;
    data: Record<string, any>;
    content: string;
    config: DocumentConfig;
}

export default class Document {
    options: DocumentOptions;
    data: Record<string, any>;
    layout: ASTNode[];
    contents: ASTNode[];

    constructor(options: DocumentOptions) {
        this.options = options;
        const {
            layout,
            contents
        } = htmlToAST(this.options.content, this.options.config);

        this.layout = layout;
        this.contents = contents;
        this.data = {};
    }

    diff(other: Document): ASTTree {
        const tree = mergeTree(0, this.data, other.data, this.layout, other.layout, null);

        return {
            base: new Page({
                pathname: this.options.pathname,
                content: this.contents,
                data: this.data
            }),
            pages: [new Page({
                pathname: other.options.pathname,
                content: other.contents,
                data: other.data
            })],
            layout: new Layout({
                tree: tree
            })
        }
    }

    debug() {
        return {
            pathname: this.options.pathname,
            layout: this.layout,
            contents: this.contents
        }
    }
}