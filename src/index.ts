import File from './file';
import Directory from './directory';
import Document from './document';
import { AST, ASTLayout, ASTPage, ASTTree } from './types'

interface InverserOptions {
    basePath: string;
}

function mergeData(first : ASTPage, second : ASTPage) : ASTPage {
    return first;
}

function mergeLayouts(first : ASTLayout, second : ASTLayout) : ASTLayout {
    return first;
}

export default class Inverser {
    options: InverserOptions;
    constructor(options: InverserOptions) {
        this.options = options;
    }

    async build(): Promise<AST[]> {
        const htmlFiles = await this.loadHtmlFiles();

        const documents = [];
        await Promise.all(htmlFiles.map(async (file) => {
            const html = await file.read();

            documents.push(new Document({
                pathname: file.name(),
                data: {},
                content: html
            }))
        }));

        if (documents.length === 1) {
            throw new Error("Only 1 html file detected");
        }

        const baseDoc = documents[0];
        let previous = baseDoc.buildSharedAst(documents[1]) as ASTTree;
        for (let i = 2; i < documents.length; i++) {
            const current = baseDoc.buildSharedAst(documents[i]);

            // Merge the current and previous bases
            const base = mergeData(previous.base, current.base);

            // Merge previous pages with the current base
            const oldPages = previous.pages.map((previousPage) => mergeData(previousPage, current.base));

            // Merge the current pages with the previous base
            const newPages = current.pages.map((newPage) => mergeData(newPage, previous.base));

            // Merge the current and previous layouts
            const layout = mergeLayouts(previous.layout, current.layout);

            previous = {
                base,
                pages: [...oldPages, ...newPages],
                layout,
            }
        }

        return [
            previous.base,
            ...previous.pages,
            previous.layout
        ]
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