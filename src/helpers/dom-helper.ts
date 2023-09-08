import { Attribute, Element, Node } from 'angular-html-parser/lib/compiler/src/ml_parser/ast';
import Document, { DocumentConfig } from '../document';
import {
    ASTElementNode,
    ASTAttribute,
    ASTNode,
    ASTStaticAttribute
} from '../types'

function normalizeClassList(value: string) {
    const classList = (value || '').split(' ')
        .reduce((list : string[], className: string) : string[] => {
            const trimmed = className.trim();
            if (trimmed) {
                list.push(trimmed);
            }
            return list;
        }, [] as string[]);
    return classList.sort();
}

function getClassList(element: Element) {
    const classAttr = element.attrs?.find((attr) => attr.name === 'class');
    return normalizeClassList(classAttr?.value || '');
}

function isAttrEquivalent(attrName: string, first: Attribute, second: Attribute) {
    if (attrName === 'class') {
        const firstClassList = normalizeClassList(first?.value || '');
        const secondClassList = normalizeClassList(second?.value || '');

        return firstClassList.join('') === secondClassList.join('');
    }

    return first.value === second.value;
}

function getElementSignature(element: Element) {
    if (element.name === 'meta') {
        const nameAttr = element.attrs.find((attr) => attr.name === 'name');
        const propertyAttr = element.attrs.find((attr) => attr.name === 'property');

        return [element.name, nameAttr?.value || propertyAttr?.value || 'unknown'].join('_');
    }

    if (element.name === 'link') {
        const relAttr = element.attrs.find((attr) => attr.name === 'rel');

        return [element.name, relAttr?.value || 'unknown'].join('_');
    }

    const id = element.attrs?.find((attr) => attr.name === 'id')?.value?.trim();
    if (id) {
        return `#${id}`
    }

    const classList = getClassList(element);
    const classes = classList.length > 0
        ? `.${classList.join('.')}`
        : '';
    return `${element.name}${classes}`;
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
        const classList = getClassList(element);

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
        attrs: element.attrs.map((attr : Attribute) : ASTAttribute => ({
            type: 'attribute',
            name: attr.name,
            value: attr.value,
        })) || [],
        children: []
    }
}

export function printAstTree(element: Node) : ASTNode {
    const node = formatNode(element);
    if (element.type === 'element') {
        for (let i = 0; i < element.children?.length; i++) {
            const childNode = element.children?.[i];
            (node as ASTElementNode).children.push(printAstTree(childNode));
        }
    }
    return node;
}

export function generateAstDiff(config: DocumentConfig, depth: number, firstData : Record<string, any>, secondData : Record<string, any>, firstNode: Node, secondNode: Node, parentNode: Element | null) : ASTNode {
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
        firstData[variableName] = firstNode.value.trim();
        secondData[variableName] = secondNode.value.trim();
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
        firstData['@pageContent'] = (printAstTree(firstNode) as ASTElementNode).children || [];
        secondData['@pageContent'] = (printAstTree(secondNode) as ASTElementNode).children || [];
        node.children.push({
            type: 'content'
        })
        return node;
    }

    node.attrs = mergeAttrs(firstData, secondData, firstNode, secondNode);
    node.children = mergeChildren(config, depth + 1, firstData, secondData, firstNode, secondNode);
    return node;
}

function attrsToObject(attrs: Attribute[]): Record<string, Attribute> {
    return attrs.reduce((memo : Record<string, Attribute>, attr : Attribute) : Record<string, Attribute> => {
        memo[attr.name] = attr;
        return memo;
    }, {})
}

export function mergeAttrs(firstData : Record<string, any>, secondData : Record<string, any>, firstElement: Element, secondElement: Element) : ASTAttribute[] {
    const firstAttrs = attrsToObject(firstElement.attrs);
    const secondAttrs = attrsToObject(secondElement.attrs);
    const combined = {} as Record<string, ASTAttribute>;

    Object.keys(firstAttrs).forEach((attrName) => {
        if (!secondAttrs[attrName]) {
            const variableName = [
                getElementSignature(firstElement),
                attrName
            ].join('_');

            firstData[variableName] = true;
            secondData[variableName] = false;
            combined[attrName] = {
                type: 'conditional-attribute',
                name: attrName,
                reference: variableName
            };
            return;
        }

        if (isAttrEquivalent(attrName, firstAttrs[attrName], secondAttrs[attrName])) {
            combined[attrName] = {
                type: 'attribute',
                name: attrName,
                value: secondAttrs[attrName].value
            };
        } else {
            const variableName = [
                getElementSignature(firstElement),
                attrName
            ].join('_');
            firstData[variableName] = firstAttrs[attrName].value;
            secondData[variableName] = secondAttrs[attrName].value;
            combined[attrName] = {
                type: 'variable-attribute',
                name: attrName,
                reference: variableName
            };
        }
    });

    Object.keys(secondAttrs).forEach((attrName) => {
        if (!combined[attrName]) {
            return;
        }

        if (!firstAttrs[attrName]) {
            const variableName = [
                getElementSignature(firstElement),
                attrName
            ].join('_');
            firstData[variableName] = null;
            secondData[variableName] = secondAttrs[attrName].value;
            combined[attrName] = {
                type: 'conditional-attribute',
                name: attrName,
                reference: variableName
            };
        }
    });

    return Object.values(combined);
}

export function isNodeEquivalent(first : Node, second: Node) : boolean {
    if (first.type === 'text') {
        return second.type === 'text' && second.value === first.value;
    }

    return second.type === first.type
        && getElementSignature(second as Element) === getElementSignature(first as Element);
}

function findRepeatedIndex(signature: string, remainingNodes: Node[]) : number {
    let matchFound = false;
    for (let i = 0; i < remainingNodes.length; i++) {
        const node = remainingNodes[i];

        if (node.type === 'text') {
            if (node.value.trim()) {
                return i - 1;
            }
        } else if (node.type === 'element') {
            if (signature !== getElementSignature(node)) {
                return i - 1;
            }
            matchFound = true;
        }
    }
    return matchFound ? remainingNodes.length : 0;
}

interface Loop {
    firstItems: Record<string, any>[];
    secondItems: Record<string, any>[];
    template: ASTNode | null;
}

function buildLoop(firstEls: Element[], secondEls: Element[], parentElement: Element) : Loop {
    const base = firstEls[0];
    let baseData = {};
    const firstItems = [] as Record<string, any>[];
    const secondItems = [] as Record<string, any>[];

    // TODO merge template and data like with Page and Layout
    let template = null;
    for (let i = 1; i < firstEls.length; i++) {
        const other = firstEls[i];
        const newBaseData = {};
        const otherData = {};
        template = generateAstDiff({}, 0, newBaseData, otherData, base, other, parentElement);

        baseData = newBaseData;
        firstItems.push(otherData);
    }

    for (let i = 0; i < secondEls.length; i++) {
        const other = secondEls[i];
        const newBaseData = {};
        const otherData = {};
        template = generateAstDiff({}, 0, newBaseData, otherData, base, other, parentElement);
        baseData = newBaseData;
        secondItems.push(otherData);
    }

    return {
        template,
        firstItems: [
            baseData,
            ...firstItems
        ],
        secondItems
    };
}

export function mergeChildren(config: DocumentConfig, depth: number, firstData : Record<string, any>, secondData : Record<string, any>, firstElement: Element, secondElement: Element) : ASTNode[] {
    let firstPointer = 0;
    let secondPointer = 0;

    const merged = [] as ASTNode[];
    let secondTree = structuredClone(secondElement.children || []);
    let firstTree = structuredClone(firstElement.children || []);

    const addConditionalNode = (node: Node, firstData : Record<string, any>, secondData : Record<string, any>) => {
        if (node.type === 'text' && !node.value.trim()) {
            merged.push(formatNode(node));
        } else {
            const variableName = `show-${getElementSignature(node)}`;
            firstData[variableName] = true;
            secondData[variableName] = false;
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
                if (isNodeEquivalent(currentAlternative, otherAlternative)) {
                    return false;
                }
            }
        }

        return true;
    }

    const addComparisonNode = (current : Node, other : Node) => {
        firstPointer += 1;
        secondPointer += 1;

        if (current.type === 'element' && other.type === 'element') {
            const currentSignature = getElementSignature(current as Element);
            const otherSignature = getElementSignature(other as Element);
            if (currentSignature === otherSignature) {
                const firstRemainingNodes = firstTree.slice(firstPointer);
                const secondRemainingNodes = secondTree.slice(secondPointer);

                const firstIndex = findRepeatedIndex(currentSignature, firstRemainingNodes);
                const secondIndex = findRepeatedIndex(currentSignature, secondRemainingNodes);

                if (firstIndex > 0 || secondIndex > 0) {
                    const firstEls = [
                        current,
                        ...firstRemainingNodes.slice(0, firstIndex)
                    ].filter((node) => node.type === 'element') as Element[];
                    const secondEls = [
                        other,
                        ...secondRemainingNodes.slice(0, secondIndex)
                    ].filter((node) => node.type === 'element') as Element[];
                    
                    const loopData = buildLoop(firstEls, secondEls, firstElement);
                    if (loopData) {
                        const { firstItems, secondItems, template } = loopData;
                        const variableName = `${currentSignature}_items`;
                        firstData[variableName] = firstItems;
                        secondData[variableName] = secondItems;
    
                        merged.push({
                            type: 'loop',
                            reference: variableName,
                            template: template,
                        })
                        firstPointer += firstIndex;
                        secondPointer += secondIndex;
                        return;
                    }
                }
            }
        }

        merged.push(generateAstDiff(config, depth + 1, firstData, secondData, current, other, firstElement));
    }

    while (firstPointer < firstTree.length && secondPointer < secondTree.length) {
        const firstRemaining = firstTree.length - firstPointer;
        const secondRemaining = secondTree.length - secondPointer;

        const firstNode = firstTree[firstPointer];
        const secondNode = secondTree[secondPointer];

        if (isNodeEquivalent(firstNode, secondNode)) {
            addComparisonNode(firstNode, secondNode);
        } else if (firstRemaining > secondRemaining) {
            if (isBestTextMatch(firstNode, secondNode, firstTree.slice(firstPointer + 1), secondTree.slice(secondPointer))) {
                addComparisonNode(firstNode, secondNode);
            } else {
                addConditionalNode(firstNode, firstData, secondData);
                firstPointer += 1;
            }
        } else {
            if (isBestTextMatch(secondNode, firstNode, secondTree.slice(secondPointer + 1), firstTree.slice(firstPointer))) {
                addComparisonNode(firstNode, secondNode);
            } else {
                addConditionalNode(secondNode, secondData, firstData);
                secondPointer += 1;
            }
        }
    }

    while (firstPointer < firstTree.length) {
        addConditionalNode(firstTree[firstPointer], firstData, secondData)
        firstPointer += 1;
    }

    while (secondPointer < secondTree.length) {
        addConditionalNode(secondTree[secondPointer], secondData, firstData)
        secondPointer += 1;
    }

    return merged;
}