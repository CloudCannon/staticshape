import { test } from 'node:test';
import * as assert from 'node:assert/strict';
import * as fs from 'fs';
import { convertElementToComponent } from '../src/helpers/component-builder.ts';
import htmlToAST from '../src/helpers/html-parser.ts';
import { ASTElementNode } from '../src/types.ts';
import Data from '../src/helpers/Data.ts';
import { TestLogger } from './helpers/test-logger.ts';

async function runTest(testName: string) {
	const html = (
		await fs.promises.readFile(`./test/fixtures/components/${testName}/component.html`)
	).toString('utf-8');
	const { layout } = htmlToAST(html, {}, {});
	const htmlEl = layout.find(
		(node) => node.type === 'element' && node.name === 'html'
	) as ASTElementNode;
	const bodyEl = htmlEl.children.find(
		(node) => node.type === 'element' && node.name === 'body'
	) as ASTElementNode;

	const ast = bodyEl.children;
	const element = ast.find((node) => node.type === 'element') as ASTElementNode;

	const data = new Data([], {});
	const existingData = new Data([], {});
	const component = convertElementToComponent(
		data,
		element,
		[],
		{},
		existingData,
		new TestLogger()
	);

	if (!fs.existsSync(`./test/fixtures/components/${testName}/component.json`)) {
		await fs.promises.writeFile(
			`./test/fixtures/components/${testName}/component.json`,
			JSON.stringify(component, null, '\t')
		);
	}

	if (!fs.existsSync(`./test/fixtures/components/${testName}/data.json`)) {
		await fs.promises.writeFile(
			`./test/fixtures/components/${testName}/data.json`,
			JSON.stringify(data.toJSON(), null, '\t')
		);
	}

	const expectedComponent = JSON.parse(
		(
			await fs.promises.readFile(`./test/fixtures/components/${testName}/component.json`)
		).toString('utf-8')
	);
	const expectedData = JSON.parse(
		(await fs.promises.readFile(`./test/fixtures/components/${testName}/data.json`)).toString(
			'utf-8'
		)
	);

	assert.deepStrictEqual(component, expectedComponent);
	assert.deepStrictEqual(data.toJSON(), expectedData);
}

test('p', () => runTest('p'));
test('ul', () => runTest('ul'));
test('img', () => runTest('img'));
test('markdown', () => runTest('markdown'));
test('logo-row', () => runTest('logo-row'));
test('recursive-loop', () => runTest('recursive-loop'));
test('dunedinattractions-grid', () => runTest('dunedinattractions-grid'));
test('hugo-showcase', () => runTest('hugo-showcase'));
test('hugo-testimonials', () => runTest('hugo-testimonials'));
