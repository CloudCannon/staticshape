import Directory from './directory.ts';
import Collection, { CollectionResponse, CollectionConfig } from './collection.ts';
import { Logger } from './logger.ts';
import { HtmlProcessorConfig } from './helpers/html-parser.ts';

interface SiteOptions {
	basePath: string;
	collections: CollectionConfig[];
	htmlOptions: HtmlProcessorConfig;
	logger: Logger;
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

		const htmlOptions = this.options.htmlOptions || {
			excludedTypes: ['comment']
		};

		const collectionsConfig = this.options.collections;
		const collections = {} as collectionList;
		for (let i = 0; i < collectionsConfig.length; i++) {
			const config = collectionsConfig[i];
			await this.options.logger.setNamespace(config.name);
			const collection = new Collection(files, htmlOptions, config, {
				logger: this.options.logger
			});

			const collectionResponse = await collection.build();

			collections[config.name] = collectionResponse;
		}

		const staticFiles = files
			.filter((file) => !file.isHtml())
			.map((file) => file.options.pathname);

		await this.options.logger.setNamespace('site-export');
		await Promise.all(
			Object.keys(collections).map((collectionName) => {
				return this.options.logger.writeLog(
					`collection-${collectionName}.json`,
					JSON.stringify(collections[collectionName], null, '\t')
				);
			})
		);
		await this.options.logger.writeLog(
			`staticFiles.json`,
			JSON.stringify(staticFiles, null, '\t')
		);
		return {
			collections,
			staticFiles
		};
	}
}
