import * as fs from 'fs';
import * as path from 'path';

interface FileOptions {
    basePath: string;
    pathname: string;
}

export default class File {
    options: FileOptions;

    constructor(options: FileOptions) {
        this.options = options;
    }

    absolutePath() : string {
        return path.join(this.options.basePath, this.options.pathname);
    }

    name() : string {
        return this.options.pathname;
    }

    extension() : string {
        return path.extname(this.options.pathname);
    }

    async write(contents: string | Buffer): Promise<void> {
        const absolutePath = this.absolutePath();
        const dirname = path.dirname(absolutePath);
        await fs.promises.mkdir(dirname, { recursive: true })
        return fs.promises.writeFile(absolutePath, contents);
    }

    async read(): Promise<string> {
        const buffer = await fs.promises.readFile(this.absolutePath())
        return buffer.toString('utf-8');
    }
}