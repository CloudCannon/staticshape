import { ASTNode } from "./types";

interface PageOptions {
    pathname: string,
    data: Record<string, any>;
    content: ASTNode[];
}

function mergeData(data: Record<string, any>, other : Record<string, any>) {
    const clone = structuredClone(data);
    Object.keys(other).forEach((key) => {
        if (!clone[key]) {
            clone[key] = other[key];
        }

        if (typeof clone[key] === 'object' && other[key]) {
            mergeData(clone[key], other[key])
        }
    });
    return clone;
}

export default class Page {
    options: PageOptions;

    constructor(options: PageOptions) {
        this.options = options;
    }

    merge(other: Page) : Page {
        return new Page({
            ...this.options,
            data: mergeData(this.options.data, other.options.data)
        });
    }

    toJSON() : object {
        return this.options;
    }
}