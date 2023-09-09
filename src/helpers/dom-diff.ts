import {
    ASTElementNode,
    ASTNode,
    ASTAttributeList
} from '../types'
import { invalidLoopTags } from './loops';
import { getClassList, isAttrEquivalent } from './node-helper';
import { nodeEquivalencyScore, isBestMatch, loopThreshold } from './node-equivalency';

type Data = Record<string, any>;

export function getElementSignature(element: ASTElementNode) {
    if (element.name === 'meta') {
        const nameAttr = element.attrs['name'];
        const propertyAttr = element.attrs['property'];
        const httpEquivAttr = element.attrs['http-equiv'];
        const charsetAttr = element.attrs['charset'];

        return [element.name,
            nameAttr?.value
            || propertyAttr?.value
            || httpEquivAttr?.value
            || charsetAttr?.value
            || 'unknown'
        ].join('_');
    }

    if (element.name === 'link') {
        const relAttr = element.attrs['rel'];

        return [element.name, relAttr?.value || 'unknown'].join('_');
    }

    const id = element.attrs['id']?.value?.trim();
    if (id) {
        return `#${id}`
    }

    const classList = getClassList(element);
    const classes = classList.length > 0
        ? `.${classList.join('.')}`
        : '';
    return `${element.name}${classes}`;
}

export function generateAstDiff(depth: number, firstData : Data, secondData : Data, firstNode: ASTNode, secondNode: ASTNode, parentNode: ASTElementNode | null) : ASTNode {
    const typesMatch = firstNode.type === secondNode.type;
    if (!typesMatch) {
        throw new Error(`Mismatched node types ${firstNode.type}, ${secondNode.type}`);
    }

    if (firstNode.type === 'text' || firstNode.type === 'doctype') {
        const valuesMatch = firstNode.value.trim() === secondNode.value.trim();
        if (valuesMatch) {
            return structuredClone(firstNode);
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
        return firstNode;
    }

    if (firstNode.type === 'content' || secondNode.type === 'content') {
        return firstNode;
    }

    if (firstNode.type !== 'element' || secondNode.type !== 'element') {
        throw new Error(`Unknown node type ${secondNode.type}`);
    }

    const tagsMatch = firstNode.name === secondNode.name;
    if (!tagsMatch) {
        throw new Error(`Mismatched node names ${firstNode.name}, ${secondNode.name}`);
    }

    const node = structuredClone(firstNode) as ASTElementNode;
    node.attrs = mergeAttrs(firstData, secondData, firstNode, secondNode);
    node.children = mergeChildren(depth + 1, firstData, secondData, firstNode, secondNode);
    return node;
}

export function mergeAttrs(firstData : Data, secondData : Data, firstElement: ASTElementNode, secondElement: ASTElementNode) : ASTAttributeList {
    const firstAttrs = firstElement.attrs;
    const secondAttrs = secondElement.attrs;
    const combined = {} as ASTAttributeList;

    Object.keys(firstAttrs).forEach((attrName) => {
        if (!secondAttrs[attrName]) {
            const variableName = [
                getElementSignature(firstElement),
                attrName
            ].join('_');

            firstData[variableName] = firstAttrs[attrName].value;
            secondData[variableName] = null;
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

    return combined;
}

function findRepeatedIndex(current: ASTElementNode, remainingNodes: ASTNode[]) : number {
    let matchFound = false;
    for (let i = 0; i < remainingNodes.length; i++) {
        const node = remainingNodes[i];

        if (node.type === 'text') {
            if (node.value.trim()) {
                return i - 1;
            }
        } else if (node.type === 'element') {
            const score = nodeEquivalencyScore(current, node);
            if (score <= loopThreshold) {
                return i - 1;
            }
            matchFound = true;
        }
    }
    return matchFound ? remainingNodes.length : 0;
}

interface Loop {
    firstItems: Data[];
    secondItems: Data[];
    template: ASTNode;
}

function buildLoop(firstEls: ASTElementNode[], secondEls: ASTElementNode[], parentElement: ASTElementNode | null) : Loop | null {
    const base = firstEls[0];
    let baseData = {};
    const firstItems = [] as Data[];
    const secondItems = [] as Data[];

    // TODO merge template and data like with Page and Layout
    let template = null;
    for (let i = 1; i < firstEls.length; i++) {
        const other = firstEls[i];
        const newBaseData = {};
        const otherData = {};
        template = generateAstDiff(0, newBaseData, otherData, base, other, parentElement);

        baseData = newBaseData;
        firstItems.push(otherData);
    }

    for (let i = 0; i < secondEls.length; i++) {
        const other = secondEls[i];
        const newBaseData = {};
        const otherData = {};
        template = generateAstDiff(0, newBaseData, otherData, base, other, parentElement);
        baseData = newBaseData;
        secondItems.push(otherData);
    }

    return template ? {
        template,
        firstItems: [
            baseData,
            ...firstItems
        ],
        secondItems
    } : null;
}

export function mergeChildren(depth: number, firstData : Data, secondData : Data, firstElement: ASTElementNode, secondElement: ASTElementNode) : ASTNode[] {
    return mergeTree(depth, firstData, secondData, firstElement.children, secondElement.children, firstElement);
}

export function mergeTree(depth: number, firstData : Data, secondData : Data, firstTree: ASTNode[], secondTree: ASTNode[], parentElement: ASTElementNode | null) : ASTNode[] {
    const merged = [] as ASTNode[];
    let firstPointer = 0;
    let secondPointer = 0;

    const addConditionalNode = (node: ASTNode, firstData : Data, secondData : Data) => {
        if (node.type === 'text' && !node.value.trim()) {
            merged.push(node);
        } else if (node.type === 'content') {
            merged.push(node);
        } else {
            const variableName = `show-${getElementSignature(node)}`;
            firstData[variableName] = true;
            secondData[variableName] = false;
            merged.push({
                type: 'conditional',
                reference: variableName,
                child: structuredClone(node)
            });
        }
    }

    const addComparisonNode = (current : ASTNode, other : ASTNode) => {
        firstPointer += 1;
        secondPointer += 1;

        if (current.type === 'element' && other.type === 'element' && 
            !invalidLoopTags[current.name] && !invalidLoopTags[other.name]) {
            const currentSignature = getElementSignature(current);

            const score = nodeEquivalencyScore(current, other);
            if (score > loopThreshold) {
                const firstRemainingNodes = firstTree.slice(firstPointer);
                const secondRemainingNodes = secondTree.slice(secondPointer);

                const firstIndex = findRepeatedIndex(current, firstRemainingNodes);
                const secondIndex = findRepeatedIndex(current, secondRemainingNodes);

                if (firstIndex > 0 || secondIndex > 0) {
                    const firstEls = [
                        current,
                        ...firstRemainingNodes.slice(0, firstIndex)
                    ].filter((node) => node.type === 'element') as ASTElementNode[];
                    const secondEls = [
                        other,
                        ...secondRemainingNodes.slice(0, secondIndex)
                    ].filter((node) => node.type === 'element') as ASTElementNode[];
                    
                    const loopData = buildLoop(firstEls, secondEls, parentElement);
                    if (loopData) {
                        const { firstItems, secondItems, template } = loopData;
                        const variableName = `${currentSignature}_items`;
                        firstData[variableName] = firstItems;
                        secondData[variableName] = secondItems;
    
                        merged.push({
                            type: 'loop',
                            reference: variableName,
                            template,
                        })
                        firstPointer += firstIndex;
                        secondPointer += secondIndex;
                        return;
                    }
                }
            }
        }

        merged.push(generateAstDiff(depth + 1, firstData, secondData, current, other, parentElement));
    }

    while (firstPointer < firstTree.length && secondPointer < secondTree.length) {
        const firstRemaining = firstTree.length - firstPointer;
        const secondRemaining = secondTree.length - secondPointer;

        const firstNode = firstTree[firstPointer];
        const secondNode = secondTree[secondPointer];

        const equivalency = nodeEquivalencyScore(firstNode, secondNode)
        if (equivalency === 1) {
            addComparisonNode(firstNode, secondNode);
        } else if (firstRemaining > secondRemaining) {
            if (isBestMatch(firstNode, secondNode, firstTree.slice(firstPointer + 1), secondTree.slice(secondPointer))) {
                addComparisonNode(firstNode, secondNode);
            } else {
                addConditionalNode(firstNode, firstData, secondData);
                firstPointer += 1;
            }
        } else {
            if (isBestMatch(secondNode, firstNode, secondTree.slice(secondPointer + 1), firstTree.slice(firstPointer))) {
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