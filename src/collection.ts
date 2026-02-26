import File from './file.ts';
import { HtmlProcessorConfig, PageContentsConfig } from './helpers/html-parser.ts';
import Document from './document.ts';
import { PageJSON } from './page.ts';
import { Logger } from './logger.ts';
import * as _slugify from 'slugify';
const slugify = (_slugify as any).default as (str: string) => string;
import Data from './helpers/Data.ts';
import { mergeTree } from './helpers/dom-diff.ts';
import { ASTNode } from './types.ts';

export interface CollectionConfig {
	name: string;
	subPath?: string;
	only?: string[] | null | void;
	include?: string[] | null | void;
	exclude?: string[] | null | void;
	content?: PageContentsConfig;
}

export interface CollectionOptions {
	logger: Logger;
}

export interface CollectionResponse {
	pages: PageJSON[];
	layout: ASTNode[];
}

export default class Collection {
	content?: PageContentsConfig;
	processorConfig?: HtmlProcessorConfig;
	logger: Logger;
	files: File[];

	constructor(
		files: File[],
		processorConfig: HtmlProcessorConfig,
		config: CollectionConfig,
		options: CollectionOptions
	) {
		this.logger = options.logger;
		this.content = config.content;
		this.processorConfig = processorConfig;

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

			return pathname.startsWith(config.subPath ?? '');
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
					processorConfig: this.processorConfig || {},
					logger: this.logger
				});
			})
		);

		if (documents.length === 0) {
			throw new Error(
				'No HTML files found in this collection. Check your subPath, include, exclude, and only settings.'
			);
		}
		if (documents.length === 1) {
			throw new Error(
				'Only 1 HTML file found in this collection. At least 2 are needed to detect a shared layout.'
			);
		}

		const baseDoc = documents[0];
		let current = baseDoc.diff(documents[1]);
		await this.logger.writeLog(
			`base-${slugify(baseDoc.pathname)}.json`,
			JSON.stringify(baseDoc.layout, null, '\t')
		);
		await this.logger.writeLog(
			`${slugify(documents[1].pathname)}.json`,
			JSON.stringify(documents[1].layout, null, '\t')
		);
		await this.logger.writeLog('layout.json', JSON.stringify(current.layout, null, '\t'));
		for (let i = 2; i < documents.length; i++) {
			await this.logger.rotateLog();
			try
			{
				const next = baseDoc.diff(documents[i]);
				await this.logger.writeLog(
					`${slugify(documents[i].pathname)}.json`,
					JSON.stringify(documents[1].layout, null, '\t')
				);
				await this.logger.writeLog('diffed.json', JSON.stringify(next, null, '\t'));
				this.logger.log(`Comparing layouts`);

				const currentPreMergeData = structuredClone(current.base.data.data);
				const nextPreMergeData = structuredClone(next.base.data.data);
				// Merge the next and current bases
				const layout = mergeTree(
					current.base.data,
					next.base.data,
					current.layout,
					next.layout,
					[],
					this.logger
				);

				for (let i = 0; i < current.pages.length; i++) {
					const page = current.pages[i];
					const nextData = new Data([], structuredClone(nextPreMergeData));
					mergeTree(page.data, nextData, current.layout, next.layout, [], this.logger);
				}

				for (let i = 0; i < next.pages.length; i++) {
					const page = next.pages[i];
					const currentData = new Data([], structuredClone(currentPreMergeData));
					mergeTree(page.data, currentData, next.layout, current.layout, [], this.logger);
				}

				await this.logger.writeLog('merged.json', JSON.stringify(current, null, '\t'));

				current = {
					base: current.base,
					pages: [...current.pages, ...next.pages],
					layout
				};
			}
			catch(err){
				console.error("Error hit exporting log")
				await this.logger.rotateLog();
				throw err;
			}
		}
		await this.logger.rotateLog();

		return {
			pages: [current.base.toJSON(), ...current.pages.map((page) => page.toJSON())],
			layout: current.layout
		};
	}
}
