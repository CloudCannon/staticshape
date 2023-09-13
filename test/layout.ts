import test, { ExecutionContext } from 'ava';
import * as fs from 'fs';
import Layout from '../src/layout';

async function runTest(t: ExecutionContext, testName: string) {
	const expected = JSON.parse(
		(await fs.promises.readFile(`./test/fixtures/layouts/${testName}/merged.json`)).toString(
			'utf-8'
		)
	);

	const a = new Layout({
		tree: JSON.parse(
			(await fs.promises.readFile(`./test/fixtures/layouts/${testName}/a.json`)).toString(
				'utf-8'
			)
		)
	});
	const b = new Layout({
		tree: JSON.parse(
			(await fs.promises.readFile(`./test/fixtures/layouts/${testName}/b.json`)).toString(
				'utf-8'
			)
		)
	});

	const forwards = a.merge(b);
	t.deepEqual(forwards.tree, expected);

	const backwards = b.merge(a);
	t.deepEqual(backwards.tree, expected);
	t.deepEqual(backwards.merge(a).tree, expected);
	t.deepEqual(backwards.merge(b).tree, expected);
	t.deepEqual(forwards.merge(a).tree, expected);
	t.deepEqual(forwards.merge(b).tree, expected);
	t.deepEqual(forwards.merge(backwards).tree, expected);
	t.deepEqual(forwards.merge(forwards).tree, expected);
	t.deepEqual(backwards.merge(forwards).tree, expected);
	t.deepEqual(backwards.merge(backwards).tree, expected);
}

test('conditional', (t: ExecutionContext) => runTest(t, 'conditional'));
test('conditional-whitespace', (t: ExecutionContext) => runTest(t, 'conditional-whitespace'));
test('loop', (t: ExecutionContext) => runTest(t, 'loop'));
test('no-diff', (t: ExecutionContext) => runTest(t, 'no-diff'));
test('text-to-text', (t: ExecutionContext) => runTest(t, 'text-to-text'));
test('variable-to-text', (t: ExecutionContext) => runTest(t, 'variable-to-text'));