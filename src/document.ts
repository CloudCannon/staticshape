import { parse } from 'angular-html-parser';
import Page from './page';
import Layout from './layout';
import {
    ASTElementNode,
    ASTAttribute,
    ASTNode,
    ASTStaticAttribute
} from './types'

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

function getElementSignature(element) {
    // TODO include attributes that like <meta name="description"
    return element.name;
}

function isSelector(element: any, selector: string) {
    if (selector.startsWith('#')) {
        const id = element.attrs?.find((attr : ASTStaticAttribute) => attr.name === 'id');

        if (!id) {
            return false;
        }

        return id.value === selector.substring(1);
    }
    if (selector.startsWith('.')) {
        const classList = element.attrs
            ?.find((attr : ASTStaticAttribute) => attr.name === 'class')
            ?.value?.split(' ') || [];

        if (classList.length === 0) {
            return false;
        }

        return classList.includes(selector.substring(1));
    }
    // TODO support more than just a tag selector
    return element.name === selector;
}

function formatNode(node): ASTNode {
    if (node.type === 'text' || node.type === 'docType') {
        return {
            "type": node.type.toLowerCase(),
            "value": node.value
        }
    }

    return {
        type: 'element',
        name: node.name,
        attributes: node.attrs?.map((attr) : ASTAttribute => ({
            type: 'static',
            name: attr.name,
            value: attr.value,
        })) || [],
        children: []
    }
}

function generateNodeTree(element: any) : ASTNode {
    const node = formatNode(element);
    if (element.type === 'element') {
        for (let i = 0; i < element.children?.length; i++) {
            const childNode = element.children?.[i];
            (node as ASTElementNode).children.push(generateNodeTree(childNode));
        }
    }
    return node;
}

function compareNodes(config: DocumentConfig, depth: number, primaryDoc : Document, secondDoc : Document, firstNode: object, secondNode: object, parentNode: object) : ASTNode {
    const typesMatch = firstNode.type === secondNode.type;
    if (!typesMatch) {
        throw new Error(`${firstNode.type} != ${secondNode.type}`);
    }

    if (firstNode.type === 'text' || firstNode.type === 'docType') {
        const valuesMatch = firstNode.value.trim() === secondNode.value.trim();
        if (valuesMatch) {
            return formatNode(firstNode);
        }

        const variableName = getElementSignature(parentNode);
        primaryDoc.data[variableName] = firstNode.value.trim();
        secondDoc.data[variableName] = secondNode.value.trim();
        return {
            type: 'variable',
            reference: variableName
        };
    }

    const tagsMatch = getElementSignature(firstNode) === getElementSignature(secondNode);

    if (!tagsMatch) {
        throw new Error(`${firstNode.name} != ${secondNode.name}`);
    }

    const node = formatNode(firstNode) as ASTElementNode;
    if (config.content?.selector && isSelector(firstNode, config.content?.selector)) {
        primaryDoc.pageContent = (generateNodeTree(firstNode) as ASTElementNode).children || [];
        secondDoc.pageContent = (generateNodeTree(secondNode) as ASTElementNode).children || [];
        node.children.push({
            type: 'content'
        })
        return node;
    }

    // TODO compare attribute variables
    if (!secondNode.children?.length && !firstNode.children?.length) {
        return node;
    }

    let secondChildren = structuredClone(secondNode.children || []);
    const findEquivalentSibling = (first) => {
        // TODO try all elements and calculate the best match
        const index = secondChildren.findIndex((item) => {
            if (first.type === 'text') {
                return item.type === 'text';
            }

            return item.type === first.type
                && getElementSignature(item) === getElementSignature(first);
        })

        if (index >= 0) {
            return secondChildren.splice(index, 1)[0];
        }

        return null;
    }

    for (let i = 0; i < firstNode.children?.length; i++) {
        const childNode = firstNode.children?.[i];
        const equivalentNode = findEquivalentSibling(childNode);
        
        if (equivalentNode) {
            node.children.push(compareNodes(config, depth + 1, primaryDoc, secondDoc, childNode, equivalentNode, firstNode));
        } else if (childNode.type === 'text' && !childNode.value.trim()) {
            node.children.push(formatNode(childNode));
        } else {
            const variableName = `show-${getElementSignature(firstNode)}`;
            primaryDoc.data[variableName] = true;
            secondDoc.data[variableName] = false;
            node.children.push({
                type: 'conditional',
                reference: variableName,
                child: generateNodeTree(childNode)
            });
        }
    }

    // TODO do this all better to ensure the optional orders are merged like a zip
    for (let i = 0; i < secondChildren.length; i++) {
        const leftOverNode = secondChildren[i];
        if (leftOverNode.type === 'text' && !leftOverNode.value.trim()) {
            node.children.push(formatNode(leftOverNode));
        } else {
            const variableName = `show-${getElementSignature(secondNode)}`;
            primaryDoc.data[variableName] = true;
            secondDoc.data[variableName] = false;
            node.children.push({
                type: 'conditional',
                reference: variableName,
                child: generateNodeTree(leftOverNode)
            });
        }
    }

    return node;
}

export default class Document {
    options: DocumentOptions;
    dom: any; // TODO import ParseTreeResult from somewhere
    data: Record<string, any>;
    pageContent: ASTNode[];

    constructor(options: DocumentOptions) {
        this.options = options;
        this.dom = parse(this.options.content);
        this.data = {};
        this.pageContent = [];
    }

    buildAstTree(other: Document): ASTTree {
        const sourceDoctype = this.dom.rootNodes.find((node) => node.type === 'docType');
        const otherDoctype = other.dom.rootNodes.find((node) => node.type === 'docType');

        if (sourceDoctype.value !== otherDoctype.value) {
            throw new Error(`doctype does not match. ${sourceDoctype.value} !== ${otherDoctype.value}`)
        }
        
        const sourceHtml = this.dom.rootNodes.find((node) => node.name === 'html');
        const otherHtml = other.dom.rootNodes.find((node) => node.name === 'html');

        const htmlNode = compareNodes(this.options.config, 0, this, other, sourceHtml, otherHtml, null);

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
}