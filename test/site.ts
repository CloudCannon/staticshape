import { test } from 'node:test';
import * as assert from 'node:assert/strict';
import Site from '../src/site.ts';
import * as path from 'path';
import * as fs from 'fs';
import { CollectionResponse } from '../src/collection.ts';
import { TestLogger } from './helpers/test-logger.ts';

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

async function runTest(testName: string) {
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
	assert.deepStrictEqual(output, expected);
}

test('two-pages', () => runTest('two-pages'));
test('two-pages-title-variable', () => runTest('two-pages-title-variable'));
test('two-pages-attr-variable', () => runTest('two-pages-attr-variable'));
test('two-pages-body-content', () => runTest('two-pages-body-content'));
test('two-pages-conditional', () => runTest('two-pages-conditional'));
test('two-pages-not-loop', () => runTest('two-pages-not-loop'));
test('two-pages-markdown-variable', () => runTest('two-pages-markdown-variable'));
test('two-pages-loop', () => runTest('two-pages-loop'));

test('two-pages-conditional-object', () => runTest('two-pages-conditional-object'));
test('two-pages-conditional-loop', () => runTest('two-pages-conditional-loop'));
test('two-pages-recursive-loop', () => runTest('two-pages-recursive-loop'));

// TODO the following items work but have alternating variable names between tests
// test('two-pages-fuzzy-image', () => runTest('two-pages-fuzzy-image'));
// test('two-pages-fuzzy-loop', () => runTest('two-pages-fuzzy-loop'));

test('three-pages', () => runTest('three-pages'));
test('three-pages-title-variable', () => runTest('three-pages-title-variable'));
test('three-pages-attr-variable', () => runTest('three-pages-attr-variable'));
test('three-pages-body-content', () => runTest('three-pages-body-content'));
test('three-pages-conditional', () => runTest('three-pages-conditional'));
test('three-pages-conditional-alternative-order', () =>
	runTest('three-pages-conditional-alternative-order'));
test('four-pages-conditional', () => runTest('four-pages-conditional'));
test('three-pages-conditional-loop-crash', () => runTest('three-pages-conditional-loop-crash'));
test('conditional-to-loop', () => runTest('conditional-to-loop'));
test('loop-to-conditional', () => runTest('loop-to-conditional'));

// test('three-pages-xkcd-news', () => runTest('three-pages-xkcd-news'));
