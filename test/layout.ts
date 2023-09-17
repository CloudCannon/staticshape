import test, { ExecutionContext } from 'ava';
import * as fs from 'fs';
import { TestLogger } from './helpers/test-logger';
import { mergeTree } from '../src/helpers/dom-diff';
import Data from '../src/helpers/Data';
import { ASTNode } from '../src/types';

function merge(a: ASTNode[], b: ASTNode[]) {
	const logger = new TestLogger();
	const firstData = new Data([], {});
	const secondData = new Data([], {});

	return mergeTree(firstData, secondData, a, b, [], logger);
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

	const forwards = merge(a, b);
	t.deepEqual(forwards, expected);

	const backwards = merge(b, a);
	t.deepEqual(backwards, expected);
	t.deepEqual(merge(backwards, a), expected);
	t.deepEqual(merge(backwards, b), expected);
	t.deepEqual(merge(forwards, a), expected);
	t.deepEqual(merge(forwards, b), expected);
	t.deepEqual(merge(forwards, backwards), expected);
	t.deepEqual(merge(forwards, forwards), expected);
	t.deepEqual(merge(backwards, forwards), expected);
	t.deepEqual(merge(backwards, backwards), expected);
}

test('no-diff', (t: ExecutionContext) => runTest(t, 'no-diff'));
test('text-to-text', (t: ExecutionContext) => runTest(t, 'text-to-text'));
test('variable-to-text', (t: ExecutionContext) => runTest(t, 'variable-to-text'));
test('conditional', (t: ExecutionContext) => runTest(t, 'conditional'));
test('conditional-whitespace', (t: ExecutionContext) => runTest(t, 'conditional-whitespace'));
test('conditional-to-element', (t: ExecutionContext) => runTest(t, 'conditional-to-element'));
test('loop', (t: ExecutionContext) => runTest(t, 'loop'));
