import { ASTNode } from "./types";

interface LayoutOptions {
    tree: ASTNode[]
}

function isEquivalent(first, second) {
    if (second.type === 'conditional') {
        return isEquivalent(first, second.child);
    }
    
    if (first.type === 'conditional') {
        return isEquivalent(first.child, second);
    }

    if ((first.type === 'text' && second.type === 'variable')
        || (second.type === 'text' && first.type === 'variable')) {
        return true;
    }
    
    if (first.type !== second.type) {
        return false;
    }

    if (first.type === 'doctype') {
        return first.value === second.value;
    }
    
    if (first.type === 'element') {
        // TODO compare element attributes
        return first.name === second.name;
    }

    return true;
}

function mergeTree(firstTree: ASTNode[], secondTree: ASTNode[]) : ASTNode[] {
    let firstPointer = 0;
    let secondPointer = 0;

    const merged = [];
    while (firstPointer < firstTree.length && secondPointer < secondTree.length) {
        const firstRemaining = firstTree.length - firstPointer;
        const secondRemaining = secondTree.length - secondPointer;

        const firstNode = firstTree[firstPointer];
        const secondNode = secondTree[secondPointer];

        if (isEquivalent(firstNode, secondNode)) {
            firstPointer += 1;
            secondPointer += 1;

            if (firstNode.type === 'variable' || firstNode.type === 'conditional') {
                merged.push(firstNode);
            } else if (secondNode.type === 'variable' || secondNode.type === 'conditional') {
                merged.push(secondNode);
            } else if (firstNode.type === 'element' && secondNode.type === 'element') {
                merged.push({
                    ...firstNode,
                    children: mergeTree(firstNode.children, secondNode.children)
                });
            } else {
                merged.push(firstNode);
            }
        } else if (firstRemaining > secondRemaining) {
            merged.push(firstNode);
            firstPointer += 1;
        } else {
            merged.push(secondNode);
            secondPointer += 1;
        }
    }

    while (firstPointer < firstTree.length) {
        const remainingNode = firstTree[firstPointer];
        merged.push(remainingNode);
        firstPointer += 1;
    }

    while (secondPointer < secondTree.length) {
        const remainingNode = secondTree[secondPointer];
        merged.push(remainingNode);
        secondPointer += 1;
    }

    return merged;
}

export default class Layout {
    options: LayoutOptions;

    constructor(options: LayoutOptions) {
        this.options = options;
    }

    merge(other: Layout) : Layout {
        return new Layout({
            ...this.options,
            tree: mergeTree(this.options.tree, other.options.tree)
        });
    }

    toJSON() : object {
        return this.options;
    }
}