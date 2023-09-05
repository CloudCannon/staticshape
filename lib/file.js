import * as fs from 'fs';
import * as path from 'path';
export default class File {
    options;
    constructor(options) {
        this.options = options;
    }
    absolutePath() {
        return path.join(this.options.basePath, this.options.pathname);
    }
    name() {
        return this.options.pathname;
    }
    extension() {
        return path.extname(this.options.pathname);
    }
    isHtml() {
        return this.extension() === '.html';
    }
    async write(contents) {
        const absolutePath = this.absolutePath();
        const dirname = path.dirname(absolutePath);
        await fs.promises.mkdir(dirname, { recursive: true });
        return fs.promises.writeFile(absolutePath, contents);
    }
    async read() {
        const buffer = await fs.promises.readFile(this.absolutePath());
        return buffer.toString('utf-8');
    }
}
