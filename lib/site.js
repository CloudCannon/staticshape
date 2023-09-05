import Directory from './directory';
import Collection from './collection';
export default class Site {
    options;
    constructor(options) {
        this.options = options;
    }
    async build() {
        const directory = new Directory({
            basePath: this.options.basePath,
            pathname: ''
        });
        const files = await directory.files();
        const { collectionsConfig } = this.options;
        const collections = {};
        for (let i = 0; i < collectionsConfig.length; i++) {
            const config = collectionsConfig[i];
            const collection = new Collection(files, config);
            const collectionResponse = await collection.build();
            collections[config.name] = collectionResponse;
        }
        const staticFiles = files.filter((file) => !file.isHtml())
            .map((file) => file.options.pathname);
        return {
            collections,
            staticFiles
        };
    }
}
