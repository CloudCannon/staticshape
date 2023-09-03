import { ASTNode } from "./types";

interface LayoutOptions {
    tree: ASTNode[]
}

export default class Layout {
    options: LayoutOptions;

    constructor(options: LayoutOptions) {
        this.options = options;
    }

    merge(other: Layout) : Layout {
        return other;
    }

    toJSON() : object {
        return {
            type: 'layout',
            ...this.options
        };
    }
}