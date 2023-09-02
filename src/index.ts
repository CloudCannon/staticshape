import File from './file';
import Directory from './directory';
import Document from './document';
import { AST } from './types'

interface InverserOptions {
    basePath: string;
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

        if (documents.length > 2) {
            throw new Error("More than two HTML pages not yet implemented");
        }

        const base = documents[0];
        return base.buildSharedAst(documents[1]);
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