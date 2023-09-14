import test, { ExecutionContext } from 'ava';
import * as fs from 'fs';
import { convertElementToComponent } from '../src/helpers/component-builder';
import htmlToAST from '../src/helpers/html-parser';
import { ASTElementNode } from '../src/types';
import Data from '../src/helpers/Data';
import { TestLogger } from './test-logger';

async function runTest(t: ExecutionContext, testName: string) {
	const html = (
		await fs.promises.readFile(`./test/fixtures/components/${testName}/component.html`)
	).toString('utf-8');
	const { layout } = htmlToAST(html, {});
	const htmlEl = layout.find(
		(node) => node.type === 'element' && node.name === 'html'
	) as ASTElementNode;
	const bodyEl = htmlEl.children.find(
		(node) => node.type === 'element' && node.name === 'body'
	) as ASTElementNode;

	const ast = bodyEl.children;
	const element = ast.find((node) => node.type === 'element') as ASTElementNode;

	const data = new Data([], {});
	const component = convertElementToComponent(data, element, [], {}, new TestLogger());

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

	t.deepEqual(component, expectedComponent);
	t.deepEqual(data.toJSON(), expectedData);
}

test('p', (t: ExecutionContext) => runTest(t, 'p'));
test('ul', (t: ExecutionContext) => runTest(t, 'ul'));
test('img', (t: ExecutionContext) => runTest(t, 'img'));
test('markdown', (t: ExecutionContext) => runTest(t, 'markdown'));
test('logo-row', (t: ExecutionContext) => runTest(t, 'logo-row'));
test('dunedinattractions-grid', (t: ExecutionContext) => runTest(t, 'dunedinattractions-grid'));
test('hugo-showcase', (t: ExecutionContext) => runTest(t, 'hugo-showcase'));
test('hugo-testimonials', (t: ExecutionContext) => runTest(t, 'hugo-testimonials'));
