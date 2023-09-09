import File from './file';
import Document, { DocumentContentConfig } from './document';

export interface CollectionOptions {
	name: string;
	subPath: string;
	only?: string[] | null | void;
	include?: string[] | null | void;
	exclude?: string[] | null | void;
	content?: DocumentContentConfig;
}

export interface CollectionResponse {
	pages: object[];
	layout: object;
}

export interface CollectionDebug {
	base: object | null;
	rounds: object[];
	files: string[];
}

export default class Collection {
	options: CollectionOptions;
	files: File[];
	debug: CollectionDebug;

	constructor(files: File[], options: CollectionOptions) {
		this.files = files;
		this.options = options;
		this.debug = {
			base: null,
			files: [],
			rounds: []
		};
	}

	async build(): Promise<CollectionResponse> {
		const collectionFiles = this.files.filter((file) => {
			if (!file.isHtml()) {
				return false;
			}

			const { pathname } = file.options;
			if (this.options.only) {
				return this.options.only.includes(pathname);
			}
			if (this.options.include?.includes(pathname)) {
				return true;
			}

			if (this.options.exclude?.includes(pathname)) {
				return false;
			}

			return pathname.startsWith(this.options.subPath);
		});

		this.debug.files = collectionFiles.map((file) => file.name());
		const documents = await Promise.all(
			collectionFiles.map(async (file) => {
				const html = await file.read();

				return new Document({
					pathname: file.name(),
					content: html,
					config: {
						content: this.options.content
					}
				});
			})
		);

		if (documents.length === 1) {
			throw new Error('Only 1 html file detected');
		}

		const baseDoc = documents[0];
		let current = baseDoc.diff(documents[1]);
		this.debug.base = baseDoc.debug();
		this.debug.rounds.push({
			doc: documents[1].debug(),
			result: current
		});
		for (let i = 2; i < documents.length; i++) {
			const next = baseDoc.diff(documents[i]);

			// Merge the next and current bases
			const base = current.base.merge(next.base);

			// Merge current pages with the next base
			const oldPages = current.pages.map((currentPage) => currentPage.merge(next.base));

			// Merge the next pages with the current base
			const newPages = next.pages.map((newPage) => newPage.merge(current.base));

			// Merge the next and current layouts
			const layout = current.layout.merge(next.layout);

			current = {
				base,
				pages: [...oldPages, ...newPages],
				layout
			};

			this.debug.rounds.push({
				doc: documents[i].debug(),
				result: next,
				current
			});
		}

		return {
			pages: [current.base.toJSON(), ...current.pages.map((page) => page.toJSON())],
			layout: current.layout.toJSON()
		};
	}
}
