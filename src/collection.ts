import File from './file';
import Document, { DocumentContentConfig } from './document';

export interface CollectionOptions {
    name: string;
    subPath: string;
    include?: string[] | null | void;
    exclude?: string[] | null | void;
    content?: DocumentContentConfig;
}

export interface CollectionResponse {
    pages: object[];
    layout: object;
}

export default class Collection {
    options: CollectionOptions;
    files: File[];

    constructor(files: File[], options: CollectionOptions) {
        this.files = files;
        this.options = options;
    }

    async build(): Promise<CollectionResponse> {
        const htmlFiles = this.files.filter((file) => {
            if (file.extension() !== '.html') {
                return false;
            }

            const { pathname } = file.options;
            if (this.options.include?.includes(pathname)) {
                return true;
            }

            if (this.options.exclude?.includes(pathname)) {
                return false;
            }

            return pathname.startsWith(this.options.subPath);
        });

        const documents = await Promise.all(htmlFiles.map(async (file) => {
            const html = await file.read();

            return new Document({
                pathname: file.name(),
                data: {},
                content: html,
                config: {
                    content: this.options.content
                }
            })
        }));

        if (documents.length === 1) {
            throw new Error("Only 1 html file detected");
        }

        const baseDoc = documents[0];
        let current = baseDoc.buildAstTree(documents[1]);
        for (let i = 2; i < documents.length; i++) {
            const next = baseDoc.buildAstTree(documents[i]);

            // Merge the next and current bases
            const base = current.base.merge(next.base);

            // Merge current pages with the next base
            const oldPages = current.pages.map((currentPage) => currentPage.merge(next.base));

            // Merge the next pages with the current base
            const newPages = next.pages.map((newPage) => newPage.merge(current.base));

            // Merge the next and current layouts
            const layout = current.layout.merge(next.layout);

            current = {
                base,
                pages: [...oldPages, ...newPages],
                layout,
            }
        }

        return {
            pages: [
                current.base.toJSON(),
                ...current.pages.map((page) => page.toJSON())
            ],
            layout: current.layout.toJSON()
        }
    }
}