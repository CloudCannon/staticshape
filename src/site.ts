import Directory from './directory';
import Collection, { CollectionResponse, CollectionOptions } from './collection';

interface SiteOptions {
    basePath: string;
    collectionsConfig: CollectionOptions[];
}

type collectionList = Record<string, CollectionResponse>;

interface SiteResponse {
    collections: collectionList;
}

export default class Site {
    options: SiteOptions;
    constructor(options: SiteOptions) {
        this.options = options;
    }

    async build(): Promise<SiteResponse> {
        const directory = new Directory({
            basePath: this.options.basePath,
            pathname: ''
        })

        const files = await directory.files();

        const { collectionsConfig } = this.options;
        const collections = {} as collectionList;
        for (let i = 0; i < collectionsConfig.length; i++) {
            const config = collectionsConfig[i];
            const collection = new Collection(files, config);

            const collectionResponse = await collection.build();

            collections[config.name] = collectionResponse;
        }

        return {
            collections
        };
    }
}