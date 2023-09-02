import { parse } from 'angular-html-parser';

import {
    ASTElementNode,
    ASTAttribute,
    ASTNode,
    AST
} from './types'

export interface DocumentOptions {
    pathname: string;
    data: Record<string, any>,
    content: string
}

function getElementSignature(element) {
    // TODO include attributes that like <meta name="description"
    return element.name;
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

function isEmptyTextNode(node) {
    return node.type === 'text' && node.value.trim().length > 0
}

function traverseNode(depth: number, primaryDoc : Document, secondDoc : Document, firstNode, secondNode: Record<string, any> | void, parentNode) : ASTNode {
    if (!secondNode) {
        const variableName = `show-${getElementSignature(firstNode)}`;
        console.log(firstNode);
        primaryDoc.data[variableName] = true;
        secondDoc.data[variableName] = false;
        return {
            type: 'conditional',
            name: variableName,
            ifChildren: [formatNode(firstNode)],
            elseChildren: [],
        };
    }

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
        node.children.push(traverseNode(depth + 1, primaryDoc, secondDoc, childNode, equivalentNode, firstNode));
    }
    // TODO do this all better to ensure the optional orders are merged like a zip
    for (let i = 0; i < secondChildren.length; i++) {
        const leftOverNode = secondChildren[i];
        node.children.push(traverseNode(depth + 1, secondDoc, primaryDoc, leftOverNode, null, secondNode || firstNode));
    }

    node.children = node.children.filter((node) => node.type !== 'text' || node.value.trim().length > 0)
    return node;
}

export default class Document {
    options: DocumentOptions;
    dom: any; // TODO import ParseTreeResult from somewhere
    data: Record<string, any>; // TODO import ParseTreeResult from somewhere

    constructor(options: DocumentOptions) {
        this.options = options;
        this.dom = parse(this.options.content);
        this.data = {};
    }

    buildSharedAst(other: Document): AST[] {
        const sourceDoctype = this.dom.rootNodes.find((node) => node.type === 'docType');
        const otherDoctype = other.dom.rootNodes.find((node) => node.type === 'docType');

        if (sourceDoctype.value !== otherDoctype.value) {
            throw new Error(`doctype does not match. ${sourceDoctype.value} !== ${otherDoctype.value}`)
        }
        
        const sourceHtml = this.dom.rootNodes.find((node) => node.name === 'html');
        const otherHtml = other.dom.rootNodes.find((node) => node.name === 'html');

        const htmlNode = traverseNode(0, this, other, sourceHtml, otherHtml, null);

        const layoutId = 'default';
        return [
            {
                type: "document",
                pathname: this.options.pathname,
                layout: layoutId,
                data: this.data
            },
            {
                type: "document",
                pathname: other.options.pathname,
                layout: layoutId,
                data: other.data
            },
            {
                id: layoutId,
                type: 'layout',
                tree: [
                    formatNode(sourceDoctype),
                    htmlNode
                ]
            }
        ]
    }
}