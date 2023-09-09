import { parse } from 'angular-html-parser';
import Page from './page';
import Layout from './layout';

import { ParseTreeResult } from 'angular-html-parser/lib/compiler/src/ml_parser/parser';
import { DocType, Element, Node } from 'angular-html-parser/lib/compiler/src/ml_parser/ast';
import { formatNode, generateAstDiff } from './helpers/dom-diff';
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
    dom: ParseTreeResult;
    data: Record<string, any>;
    layout: ASTNode[];
    contents: ASTNode[];

    constructor(options: DocumentOptions) {
        this.options = options;
        this.dom = parse(this.options.content);
        const {
            layout,
            contents
        } = htmlToAST(this.options.content, this.options.config);

        this.layout = layout;
        this.contents = contents;
        this.data = {};
    }

    diff(other: Document): ASTTree {
        console.log(this.layout, other.layout);
        const sourceDoctype = this.dom.rootNodes.find((node : Node) => node.type === 'docType') as DocType;
        const otherDoctype = other.dom.rootNodes.find((node : Node) => node.type === 'docType') as DocType;

        if (sourceDoctype?.value !== otherDoctype?.value) {
            console.warn(`doctype does not match. ${sourceDoctype.value} !== ${otherDoctype.value}`)
        }
        
        const sourceHtml = this.dom.rootNodes.find((node : Node) => node.type === 'element' && node.name === 'html') as Element;
        const otherHtml = other.dom.rootNodes.find((node : Node) => node.type === 'element' && node.name === 'html') as Element;

        const htmlNode = generateAstDiff(0, this.data, other.data, sourceHtml, otherHtml, null);

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
                tree: [
                    sourceDoctype ? formatNode(sourceDoctype) : {
                        type: 'doctype',
                        value: 'html'
                    },
                    htmlNode
                ]
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