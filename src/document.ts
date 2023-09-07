import { parse } from 'angular-html-parser';
import Page from './page';
import Layout from './layout';
import { ASTNode } from './types'

import { ParseTreeResult } from 'angular-html-parser/lib/compiler/src/ml_parser/parser';
import { DocType, Element, Node } from 'angular-html-parser/lib/compiler/src/ml_parser/ast';
import { formatNode, generateAstDiff, printAstTree } from './helpers/dom-helper';

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
    pageContent: ASTNode[];

    constructor(options: DocumentOptions) {
        this.options = options;
        this.dom = parse(this.options.content);
        this.data = {};
        this.pageContent = [];
    }

    diff(other: Document): ASTTree {
        const sourceDoctype = this.dom.rootNodes.find((node : Node) => node.type === 'docType') as DocType;
        const otherDoctype = other.dom.rootNodes.find((node : Node) => node.type === 'docType') as DocType;

        if (sourceDoctype?.value !== otherDoctype?.value) {
            throw new Error(`doctype does not match. ${sourceDoctype.value} !== ${otherDoctype.value}`)
        }
        
        const sourceHtml = this.dom.rootNodes.find((node : Node) => node.type === 'element' && node.name === 'html') as Element;
        const otherHtml = other.dom.rootNodes.find((node : Node) => node.type === 'element' && node.name === 'html') as Element;

        const htmlNode = generateAstDiff(this.options.config, 0, this, other, sourceHtml, otherHtml, null);

        return {
            base: new Page({
                pathname: this.options.pathname,
                content: this.pageContent,
                data: this.data
            }),
            pages: [new Page({
                pathname: other.options.pathname,
                content: other.pageContent,
                data: other.data
            })],
            layout: new Layout({
                tree: [
                    formatNode(sourceDoctype),
                    htmlNode
                ]
            })
        }
    }

    debug() {
        return {
            pathname: this.options.pathname,
            dom: printAstTree(this.dom.rootNodes.find((node : Node) => node.type === 'element' && node.name === 'html') as Node)
        }
    }
}