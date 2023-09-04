import { ASTNode } from "./types";

interface PageOptions {
    pathname: string,
    data: Record<string, any>;
    content: ASTNode[];
}

export default class Page {
    options: PageOptions;

    constructor(options: PageOptions) {
        this.options = options;
    }

    merge(other: Page) : Page {
        const data = structuredClone(this.options.data);
        Object.keys(other.options.data).forEach((key) => {
            if (!data[key]) {
                data[key] = other.options.data[key];
            }
        });

        return new Page({
            ...this.options,
            data
        });
    }

    toJSON() : object {
        return this.options;
    }
}