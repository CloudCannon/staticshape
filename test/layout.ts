import test, { ExecutionContext } from 'ava';
import * as fs from 'fs';
import { TestLogger } from './helpers/test-logger';
import { mergeTree } from '../src/helpers/dom-diff';
import Data from '../src/helpers/Data';
import { ASTNode } from '../src/types';

function merge(a: ASTNode[], b: ASTNode[], aData: Data, bData: Data) {
	const logger = new TestLogger();

	return mergeTree(aData, bData, a, b, [], logger);
}

async function runTest(t: ExecutionContext, testName: string) {
	const expected = JSON.parse(
		(await fs.promises.readFile(`./test/fixtures/layouts/${testName}/merged.json`)).toString(
			'utf-8'
		)
	);

	const a = JSON.parse(
		(await fs.promises.readFile(`./test/fixtures/layouts/${testName}/a.json`)).toString('utf-8')
	);
	const b = JSON.parse(
		(await fs.promises.readFile(`./test/fixtures/layouts/${testName}/b.json`)).toString('utf-8')
	);
	const aDataContents = fs.existsSync(`./test/fixtures/layouts/${testName}/a-data.json`)
		? JSON.parse(
				(
					await fs.promises.readFile(`./test/fixtures/layouts/${testName}/a-data.json`)
				).toString('utf-8')
		  )
		: {};
	const bDataContents = fs.existsSync(`./test/fixtures/layouts/${testName}/b-data.json`)
		? JSON.parse(
				(
					await fs.promises.readFile(`./test/fixtures/layouts/${testName}/b-data.json`)
				).toString('utf-8')
		  )
		: {};
	let aData = new Data([], structuredClone(aDataContents));
	let bData = new Data([], structuredClone(bDataContents));

	const forwards = merge(a, b, aData, bData);
	t.deepEqual(forwards, expected);

	aData = new Data([], structuredClone(aDataContents));
	bData = new Data([], structuredClone(bDataContents));
	const backwards = merge(b, a, bData, aData);
	t.deepEqual(backwards, expected);
	t.deepEqual(merge(backwards, a, bData, new Data([], structuredClone(aDataContents))), expected);
	t.deepEqual(merge(backwards, b, bData, new Data([], structuredClone(bDataContents))), expected);
	t.deepEqual(merge(forwards, a, bData, new Data([], structuredClone(aDataContents))), expected);
	t.deepEqual(merge(forwards, b, bData, new Data([], structuredClone(bDataContents))), expected);
	t.deepEqual(merge(forwards, backwards, bData, aData), expected);
	t.deepEqual(merge(forwards, forwards, bData, aData), expected);
	t.deepEqual(merge(backwards, forwards, bData, aData), expected);
	t.deepEqual(merge(backwards, backwards, bData, aData), expected);
}

test('no-diff', (t: ExecutionContext) => runTest(t, 'no-diff'));
test('text-to-text', (t: ExecutionContext) => runTest(t, 'text-to-text'));
test('variable-to-text', (t: ExecutionContext) => runTest(t, 'variable-to-text'));
test('conditional', (t: ExecutionContext) => runTest(t, 'conditional'));
test('conditional-whitespace', (t: ExecutionContext) => runTest(t, 'conditional-whitespace'));
test('conditional-to-element', (t: ExecutionContext) => runTest(t, 'conditional-to-element'));
test('conditional-attribute', (t: ExecutionContext) => runTest(t, 'conditional-attribute'));
test('conditional-empty', (t: ExecutionContext) => runTest(t, 'conditional-empty'));
test('loop', (t: ExecutionContext) => runTest(t, 'loop'));
