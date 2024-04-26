import test, { ExecutionContext } from 'ava';
import Site from '../src/site';
import * as path from 'path';
import * as fs from 'fs';
import { CollectionResponse } from '../src/collection';
import { TestLogger } from './helpers/test-logger';

function sortCollectionPages(collections: Record<string, CollectionResponse>) {
	Object.keys(collections).forEach((key) => {
		const collection = collections[key];
		collection.pages = collection.pages.sort((a, b) => {
			const nameA = a.pathname;
			const nameB = b.pathname;
			if (nameA < nameB) {
				return -1;
			}
			if (nameA > nameB) {
				return 1;
			}

			return 0;
		});
	});
}

async function runTest(t: ExecutionContext, testName: string) {
	const basePath = path.resolve(`./test/fixtures/sites/${testName}/files`);
	const config = JSON.parse(
		(await fs.promises.readFile(`./test/fixtures/sites/${testName}/config.json`)).toString(
			'utf-8'
		)
	);
	const site = new Site({
		basePath,
		...config,
		logger: new TestLogger()
	});

	const output = await site.build();
	if (!fs.existsSync(`./test/fixtures/sites/${testName}/collection.json`)) {
		await fs.promises.writeFile(
			`./test/fixtures/sites/${testName}/collection.json`,
			JSON.stringify(output, null, '\t')
		);
	}

	const expected = JSON.parse(
		(await fs.promises.readFile(`./test/fixtures/sites/${testName}/collection.json`)).toString(
			'utf-8'
		)
	);
	sortCollectionPages(output.collections);
	sortCollectionPages(expected.collections);

	output.staticFiles = output.staticFiles
		.filter((pathname) => !pathname.toLowerCase().endsWith('.ds_store'))
		.sort();
	expected.staticFiles = expected.staticFiles.sort();
	t.deepEqual(output, expected);
}

test('two-pages', (t: ExecutionContext) => runTest(t, 'two-pages'));
test('two-pages-title-variable', (t: ExecutionContext) => runTest(t, 'two-pages-title-variable'));
test('two-pages-attr-variable', (t: ExecutionContext) => runTest(t, 'two-pages-attr-variable'));
test('two-pages-body-content', (t: ExecutionContext) => runTest(t, 'two-pages-body-content'));
test('two-pages-conditional', (t: ExecutionContext) => runTest(t, 'two-pages-conditional'));
test('two-pages-not-loop', (t: ExecutionContext) => runTest(t, 'two-pages-not-loop'));
test('two-pages-markdown-variable', (t: ExecutionContext) =>
	runTest(t, 'two-pages-markdown-variable'));
test('two-pages-loop', (t: ExecutionContext) => runTest(t, 'two-pages-loop'));

test('two-pages-conditional-object', (t: ExecutionContext) =>
	runTest(t, 'two-pages-conditional-object'));
test('two-pages-conditional-loop', (t: ExecutionContext) =>
	runTest(t, 'two-pages-conditional-loop'));

// TODO the following items work but have alternating variable names between tests
// test('two-pages-fuzzy-image', (t: ExecutionContext) => runTest(t, 'two-pages-fuzzy-image'));
// test('two-pages-fuzzy-loop', (t: ExecutionContext) => runTest(t, 'two-pages-fuzzy-loop'));

test('three-pages', (t: ExecutionContext) => runTest(t, 'three-pages'));
test('three-pages-title-variable', (t: ExecutionContext) =>
	runTest(t, 'three-pages-title-variable'));
test('three-pages-attr-variable', (t: ExecutionContext) => runTest(t, 'three-pages-attr-variable'));
test('three-pages-body-content', (t: ExecutionContext) => runTest(t, 'three-pages-body-content'));
test('three-pages-conditional', (t: ExecutionContext) => runTest(t, 'three-pages-conditional'));
test('four-pages-conditional', (t: ExecutionContext) => runTest(t, 'four-pages-conditional'));

// test('three-pages-xkcd-news', (t: ExecutionContext) => runTest(t, 'three-pages-xkcd-news'));