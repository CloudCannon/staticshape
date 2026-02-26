import { test } from 'node:test';
import * as assert from 'node:assert/strict';
import Site from '../src/site.ts';
import * as path from 'path';
import * as fs from 'fs';
import { TestLogger } from './helpers/test-logger.ts';

async function buildSite(testName: string) {
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
	return site.build();
}

test('SVGs with different content should be extracted as variables', async () => {
	const output = await buildSite('two-pages-svg-variable');
	const pages = output.collections.pages;
	const layoutStr = JSON.stringify(pages.layout);

	assert.ok(
		!layoutStr.includes('circle'),
		'Layout should not hardcode the circle SVG from one page'
	);
	assert.ok(
		!layoutStr.includes('rect'),
		'Layout should not hardcode the rect SVG from another page'
	);

	const pageA = pages.pages.find((p) => p.pathname === 'index.html');
	const pageB = pages.pages.find((p) => p.pathname === 'about.html');
	assert.ok(pageA, 'Page A should exist');
	assert.ok(pageB, 'Page B should exist');

	const dataA = JSON.stringify(pageA!.data);
	const dataB = JSON.stringify(pageB!.data);
	assert.ok(dataA.includes('circle'), 'Page A data should contain circle SVG content');
	assert.ok(dataB.includes('rect'), 'Page B data should contain rect SVG content');
});

test('elements with different class attributes should extract class as variable', async () => {
	const output = await buildSite('two-pages-class-variable');
	const pages = output.collections.pages;

	const pageA = pages.pages.find((p) => p.pathname === 'index.html');
	const pageB = pages.pages.find((p) => p.pathname === 'about.html');
	assert.ok(pageA, 'Page A should exist');
	assert.ok(pageB, 'Page B should exist');

	const hasClassVarA = Object.values(pageA!.data).some(
		(v) => typeof v === 'string' && v.includes('badge-green')
	);
	const hasClassVarB = Object.values(pageB!.data).some(
		(v) => typeof v === 'string' && v.includes('badge-navy')
	);

	assert.ok(hasClassVarA, 'Page A data should contain badge-green class value');
	assert.ok(hasClassVarB, 'Page B data should contain badge-navy class value');
});

test('srcset attribute values should be preserved in data', async () => {
	const output = await buildSite('two-pages-srcset');
	const pages = output.collections.pages;

	const pageA = pages.pages.find((p) => p.pathname === 'index.html');
	const pageB = pages.pages.find((p) => p.pathname === 'about.html');
	assert.ok(pageA, 'Page A should exist');
	assert.ok(pageB, 'Page B should exist');

	const dataA = JSON.stringify(pageA!.data);
	const dataB = JSON.stringify(pageB!.data);

	assert.ok(
		dataA.includes('hero-480w.jpg 480w'),
		'Page A data should contain full srcset with width descriptor'
	);
	assert.ok(
		dataA.includes('hero-800w.jpg 800w'),
		'Page A data should contain second srcset entry'
	);
	assert.ok(
		dataB.includes('about-480w.jpg 480w'),
		'Page B data should contain its srcset values'
	);
});

test('image alt text should be preserved in markdown conversion', async () => {
	const output = await buildSite('two-pages-markdown-image');
	const pages = output.collections.pages;

	const pageA = pages.pages.find((p) => p.pathname === 'index.html');
	const pageB = pages.pages.find((p) => p.pathname === 'about.html');
	assert.ok(pageA, 'Page A should exist');
	assert.ok(pageB, 'Page B should exist');

	const dataA = JSON.stringify(pageA!.data);
	const dataB = JSON.stringify(pageB!.data);

	assert.ok(
		dataA.includes('Home photo'),
		'Page A data should preserve image alt text'
	);
	assert.ok(
		dataA.includes('home-photo.jpg'),
		'Page A data should preserve image src'
	);
	assert.ok(
		dataB.includes('About photo'),
		'Page B data should preserve image alt text'
	);
	assert.ok(
		dataB.includes('about-photo.jpg'),
		'Page B data should preserve image src'
	);
});
