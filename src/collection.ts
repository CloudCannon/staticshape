import File from './file';
import { PageContentsConfig } from './helpers/html-parser';
import Document from './document';
import { PageJSON } from './page';
import { Logger } from './logger';
import slugify from 'slugify';

export interface CollectionConfig {
	name: string;
	subPath: string;
	only?: string[] | null | void;
	include?: string[] | null | void;
	exclude?: string[] | null | void;
	content?: PageContentsConfig;
}

export interface CollectionOptions {
	logger?: Logger;
}

export interface CollectionResponse {
	pages: PageJSON[];
	layout: object;
}

export default class Collection {
	content?: PageContentsConfig;
	logger?: Logger;
	files: File[];

	constructor(files: File[], config: CollectionConfig, options: CollectionOptions) {
		this.logger = options.logger;
		this.content = config.content;

		this.files = files.filter((file) => {
			if (!file.isHtml()) {
				return false;
			}

			const { pathname } = file.options;
			if (config.only) {
				return config.only.includes(pathname);
			}
			if (config.include?.includes(pathname)) {
				return true;
			}

			if (config.exclude?.includes(pathname)) {
				return false;
			}

			return pathname.startsWith(config.subPath);
		});
	}

	async build(): Promise<CollectionResponse> {
		const documents = await Promise.all(
			this.files.map(async (file) => {
				const html = await file.read();

				return new Document({
					pathname: file.name(),
					content: html,
					config: {
						content: this.content
					},
					logger: this.logger
				});
			})
		);

		if (documents.length === 1) {
			throw new Error('Only 1 html file detected');
		}

		const baseDoc = documents[0];
		let current = baseDoc.diff(documents[1]);
		await this.logger?.writeLog(
			`base-${slugify(baseDoc.pathname)}.json`,
			JSON.stringify(baseDoc.layout, null, '\t')
		);
		await this.logger?.writeLog(
			`${slugify(documents[1].pathname)}.json`,
			JSON.stringify(documents[1].layout, null, '\t')
		);
		await this.logger?.writeLog('layout.json', JSON.stringify(current.layout.tree, null, '\t'));
		for (let i = 2; i < documents.length; i++) {
			await this.logger?.rotateLog();
			const next = baseDoc.diff(documents[i]);
			await this.logger?.writeLog(
				`${slugify(documents[i].pathname)}.json`,
				JSON.stringify(documents[1].layout, null, '\t')
			);
			await this.logger?.writeLog(
				'merged.json',
				JSON.stringify(next.layout.tree, null, '\t')
			);

			// Merge the next and current bases
			const base = current.base.merge(next.base);

			// Merge current pages with the next base
			const oldPages = current.pages.map((currentPage) => currentPage.merge(next.base));

			// Merge the next pages with the current base
			const newPages = next.pages.map((newPage) => newPage.merge(current.base));

			// Merge the next and current layouts
			const layout = current.layout.merge(next.layout);
			await this.logger?.writeLog(
				'layout.json',
				JSON.stringify(current.layout.tree, null, '\t')
			);

			current = {
				base,
				pages: [...oldPages, ...newPages],
				layout
			};
		}
		await this.logger?.rotateLog();

		return {
			pages: [current.base.toJSON(), ...current.pages.map((page) => page.toJSON())],
			layout: current.layout.toJSON()
		};
	}
}
