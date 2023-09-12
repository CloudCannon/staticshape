import Directory from './directory';
import Collection, { CollectionResponse, CollectionConfig } from './collection';
import { Logger } from './logger';

interface SiteOptions {
	basePath: string;
	collectionsConfig: CollectionConfig[];
	logger?: Logger;
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
			const collection = new Collection(files, config, {
				logger: this.options.logger
			});

			const collectionResponse = await collection.build();

			collections[config.name] = collectionResponse;
			await this.options.logger?.writeLog(
				`collection-${config.name}.json`,
				JSON.stringify(collectionResponse, null, '\t')
			);
		}

		const staticFiles = files
			.filter((file) => !file.isHtml())
			.map((file) => file.options.pathname);

		await this.options.logger?.writeLog(
			`staticFiles.json`,
			JSON.stringify(staticFiles, null, '\t')
		);
		return {
			collections,
			staticFiles
		};
	}
}
