import { Attribute, Element, Node } from 'angular-html-parser/lib/compiler/src/ml_parser/ast';
import Document, { DocumentConfig } from '../document';
import {
    ASTElementNode,
    ASTAttribute,
    ASTNode,
    ASTStaticAttribute
} from '../types'

function getElementSignature(element: Element) {
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

export function formatNode(node : Node): ASTNode {
    if (node.type === 'text') {
        return {
            "type": 'text',
            "value": node.value
        }
    }

    if (node.type === 'comment') {
        return {
            "type": 'comment',
            "value": node.value || ''
        }
    }

    if (node.type === 'docType') {
        return {
            "type": 'doctype',
            "value": node.value || ''
        }
    }

    const element = node as Element;
    return {
        type: 'element',
        name: element.name,
        attributes: element.attrs.map((attr : Attribute) : ASTAttribute => ({
            type: 'static',
            name: attr.name,
            value: attr.value,
        })) || [],
        children: []
    }
}

function printAstTree(element: Node) : ASTNode {
    const node = formatNode(element);
    if (element.type === 'element') {
        for (let i = 0; i < element.children?.length; i++) {
            const childNode = element.children?.[i];
            (node as ASTElementNode).children.push(printAstTree(childNode));
        }
    }
    return node;
}

export function generateAstDiff(config: DocumentConfig, depth: number, primaryDoc : Document, secondDoc : Document, firstNode: Node, secondNode: Node, parentNode: Element | null) : ASTNode {
    const typesMatch = firstNode.type === secondNode.type;
    if (!typesMatch) {
        throw new Error(`Mismatched node types ${firstNode.type}, ${secondNode.type}`);
    }

    if (firstNode.type === 'text' || firstNode.type === 'docType') {
        const valuesMatch = firstNode.value.trim() === secondNode.value.trim();
        if (valuesMatch) {
            return formatNode(firstNode);
        }
        if (!parentNode) {
            throw new Error(`Can't print variable as a direct child of html (No parentNode)`);
        }

        const variableName = getElementSignature(parentNode);
        primaryDoc.data[variableName] = firstNode.value.trim();
        secondDoc.data[variableName] = secondNode.value.trim();
        return {
            type: 'variable',
            reference: variableName
        };
    }

    if (firstNode.type === 'comment' || secondNode.type === 'comment') {
        return formatNode(firstNode);
    }

    if (firstNode.type !== 'element' || secondNode.type !== 'element') {
        throw new Error(`Unknown node type ${secondNode.type}`);
    }

    const tagsMatch = getElementSignature(firstNode) === getElementSignature(secondNode);
    if (!tagsMatch) {
        throw new Error(`Mismatched node names ${firstNode.name}, ${secondNode.name}`);
    }

    const node = formatNode(firstNode) as ASTElementNode;
    if (config.content?.selector && isSelector(firstNode, config.content?.selector)) {
        primaryDoc.pageContent = (printAstTree(firstNode) as ASTElementNode).children || [];
        secondDoc.pageContent = (printAstTree(secondNode) as ASTElementNode).children || [];
        node.children.push({
            type: 'content'
        })
        return node;
    }

    // TODO merge attributes
    node.children = mergeChildren(config, depth + 1, primaryDoc, secondDoc, firstNode, secondNode);
    return node;
}

export function isEquivalent(first : Node, second: Node) {
    if (first.type === 'text') {
        return second.type === 'text' && second.value === first.value;
    }

    return second.type === first.type
        && getElementSignature(second as Element) === getElementSignature(first as Element);
}

export function mergeChildren(config: DocumentConfig, depth: number, primaryDoc : Document, secondDoc : Document, firstElement: Element, secondElement: Element) {
    let firstPointer = 0;
    let secondPointer = 0;

    const merged = [] as ASTNode[];
    let secondTree = structuredClone(secondElement.children || []);
    let firstTree = structuredClone(firstElement.children || []);

    const addConditionalNode = (node: Node, primaryDoc : Document, secondDoc : Document) => {
        if (node.type === 'text' && !node.value.trim()) {
            merged.push(formatNode(node));
        } else {
            const variableName = `show-${getElementSignature(node)}`;
            primaryDoc.data[variableName] = true;
            secondDoc.data[variableName] = false;
            merged.push({
                type: 'conditional',
                reference: variableName,
                child: printAstTree(node)
            });
        }
    }

    const isBestTextMatch = (current : Node, other : Node, currentTree: Node[], otherTree: Node[]) => {
        if (current.type !== 'text' || other.type !== 'text') {
            return false;
        }

        for (let i = 0; i < currentTree.length; i++) {
            const currentAlternative = currentTree[i];

            for (let j = 0; j < otherTree.length; j++) {
                const otherAlternative = otherTree[j];
                if (isEquivalent(currentAlternative, otherAlternative)) {
                    return false;
                }
            }
        }

        return true;
    }

    const addComparisonNode = (current : Node, other : Node) => {
        firstPointer += 1;
        secondPointer += 1;
        merged.push(generateAstDiff(config, depth + 1, primaryDoc, secondDoc, current, other, firstElement));
    }

    while (firstPointer < firstTree.length && secondPointer < secondTree.length) {
        const firstRemaining = firstTree.length - firstPointer;
        const secondRemaining = secondTree.length - secondPointer;

        const firstNode = firstTree[firstPointer];
        const secondNode = secondTree[secondPointer];

        if (isEquivalent(firstNode, secondNode)) {
            addComparisonNode(firstNode, secondNode);
        } else if (firstRemaining > secondRemaining) {
            if (isBestTextMatch(firstNode, secondNode, firstTree.slice(firstPointer + 1), secondTree.slice(secondPointer))) {
                addComparisonNode(firstNode, secondNode);
            } else {
                addConditionalNode(firstNode, primaryDoc, secondDoc);
                firstPointer += 1;
            }
        } else {
            if (isBestTextMatch(secondNode, firstNode, secondTree.slice(secondPointer + 1), firstTree.slice(firstPointer))) {
                addComparisonNode(firstNode, secondNode);
            } else {
                addConditionalNode(secondNode, secondDoc, primaryDoc);
                secondPointer += 1;
            }
        }
    }

    while (firstPointer < firstTree.length) {
        addConditionalNode(firstTree[firstPointer], primaryDoc, secondDoc)
        firstPointer += 1;
    }

    while (secondPointer < secondTree.length) {
        addConditionalNode(secondTree[secondPointer], secondDoc, primaryDoc)
        secondPointer += 1;
    }

    return merged;
}