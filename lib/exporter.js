import File from './file';
import * as path from 'path';
import HugoExportEngine from './export-engines/hugo';
export default class Exporter {
    options;
    engine;
    constructor(options) {
        this.options = options;
        this.engine = this.getExportEngine();
    }
    async run() {
        await this.exportStaticFiles();
        const { collections } = this.options.siteResponse;
        const collectionKeys = Object.keys(collections);
        for (let i = 0; i < collectionKeys.length; i++) {
            const collectionKey = collectionKeys[i];
            const collection = collections[collectionKey];
            const { layout, pages } = collection;
            const layoutFile = this.engine.exportLayout(layout, collection, collectionKey);
            await this.writeFileExport(layoutFile);
            for (let j = 0; j < pages.length; j++) {
                const item = pages[j];
                const itemFile = this.engine.exportCollectionItem(item, collection, collectionKey);
                await this.writeFileExport(itemFile);
            }
        }
        await this.exportEngineConfig();
        await this.exportCloudCannonConfig();
    }
    async exportEngineConfig() {
        const configFile = this.engine.engineConfig();
        return this.writeFileExport(configFile);
    }
    async exportCloudCannonConfig() {
        const configFile = this.engine.cloudCannonConfig();
        return this.writeFileExport(configFile);
    }
    async writeFileExport(fileExport) {
        const file = new File({
            basePath: this.options.exportBasePath,
            pathname: fileExport.pathname
        });
        return file.write(fileExport.contents);
    }
    async exportStaticFiles() {
        const staticDirectory = this.engine.staticDirectory();
        return Promise.all(this.options.siteResponse.staticFiles.map(async (pathname) => {
            const exportPathname = path.join(staticDirectory, pathname);
            const sourceFile = new File({
                basePath: this.options.sourceBasePath,
                pathname
            });
            const file = new File({
                basePath: this.options.exportBasePath,
                pathname: exportPathname
            });
            const contents = await sourceFile.read();
            return file.write(contents);
        }));
    }
    getExportEngine() {
        const options = {
            sourceBasePath: this.options.sourceBasePath,
            exportBasePath: this.options.exportBasePath,
            siteResponse: this.options.siteResponse
        };
        switch (this.options.engine) {
            case 'hugo':
                return new HugoExportEngine(options);
            default:
                break;
        }
        throw new Error(`Unsupported export engine "${this.options.engine}"`);
    }
}
