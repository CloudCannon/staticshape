import File from './file';
import * as fs from 'fs';
import * as path from 'path';
export default class Directory {
    options;
    constructor(options) {
        this.options = options;
    }
    absolutePath() {
        return path.join(this.options.basePath, this.options.pathname);
    }
    async files() {
        const absolutePath = this.absolutePath();
        const items = await fs.promises.readdir(absolutePath);
        const files = [];
        await Promise.all(items.map(async (pathname) => {
            const relativePath = path.join(this.options.pathname, pathname);
            const filePath = path.join(absolutePath, pathname);
            const stat = await fs.promises.stat(filePath);
            if (stat.isDirectory()) {
                const directory = new Directory({
                    basePath: this.options.basePath,
                    pathname: relativePath
                });
                const subfiles = await directory.files();
                files.push(...subfiles);
            }
            else {
                files.push(new File({
                    basePath: this.options.basePath,
                    pathname: relativePath
                }));
            }
        }));
        return files;
    }
}
