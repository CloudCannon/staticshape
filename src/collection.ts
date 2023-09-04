import File from './file';
import Directory from './directory';
import Document from './document';

interface CollectionOptions {
    basePath: string;
}

interface CollectionResponse {
    pages: object[];
    layout: object;
}

export default class Collection {
    options: CollectionOptions;
    constructor(options: CollectionOptions) {
        this.options = options;
    }

    async build(): Promise<CollectionResponse> {
        const htmlFiles = await this.loadHtmlFiles();

        const documents = await Promise.all(htmlFiles.map(async (file) => {
            const html = await file.read();

            return new Document({
                pathname: file.name(),
                data: {},
                content: html
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

    async loadHtmlFiles(): Promise<File[]> {
        const directory = new Directory({
            basePath: this.options.basePath,
            pathname: ''
        })

        const files = await directory.files();
        return files.filter((file) => file.extension() === '.html');
    }
}