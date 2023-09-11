import Directory from './directory';
import Collection, { CollectionResponse, CollectionOptions } from './collection';

interface SiteOptions {
	basePath: string;
	collectionsConfig: CollectionOptions[];
}

type collectionList = Record<string, CollectionResponse>;

export interface SiteResponse {
	collections: collectionList;
	staticFiles: string[];
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
		});

		const files = await directory.files();

		const { collectionsConfig } = this.options;
		const collections = {} as collectionList;
		for (let i = 0; i < collectionsConfig.length; i++) {
			const config = collectionsConfig[i];
			const collection = new Collection(files, config);

			const collectionResponse = await collection.build();

			collections[config.name] = collectionResponse;
		}

		const staticFiles = files
			.filter((file) => !file.isHtml())
			.map((file) => file.options.pathname);

		return {
			collections,
			staticFiles
		};
	}
}
