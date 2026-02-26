import { test } from 'node:test';
import * as assert from 'node:assert/strict';
import * as fs from 'fs';
import { TestLogger } from './helpers/test-logger.ts';
import { mergeTree } from '../src/helpers/dom-diff.ts';
import Data from '../src/helpers/Data.ts';
import { ASTNode } from '../src/types.ts';

function merge(a: ASTNode[], b: ASTNode[], aData: Data, bData: Data) {
	const logger = new TestLogger();

	return mergeTree(aData, bData, a, b, [], logger);
}

async function runTest(testName: string) {
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
	if (!fs.existsSync(`./test/fixtures/layouts/${testName}/merged.json`)) {
		await fs.promises.writeFile(
			`./test/fixtures/layouts/${testName}/merged.json`,
			JSON.stringify(forwards, null, '\t')
		);
	}
	if (!fs.existsSync(`./test/fixtures/layouts/${testName}/a-data-merged.json`)) {
		await fs.promises.writeFile(
			`./test/fixtures/layouts/${testName}/a-data-merged.json`,
			JSON.stringify(aData, null, '\t')
		);
	}
	if (!fs.existsSync(`./test/fixtures/layouts/${testName}/b-data-merged.json`)) {
		await fs.promises.writeFile(
			`./test/fixtures/layouts/${testName}/b-data-merged.json`,
			JSON.stringify(bData, null, '\t')
		);
	}
	const expected = JSON.parse(
		(await fs.promises.readFile(`./test/fixtures/layouts/${testName}/merged.json`)).toString(
			'utf-8'
		)
	);

	assert.deepStrictEqual(forwards, expected);
	const expectedAData = JSON.parse(
		(await fs.promises.readFile(`./test/fixtures/layouts/${testName}/a-data-merged.json`)).toString(
			'utf-8'
		)
	);

	assert.deepStrictEqual(aData.toJSON(), expectedAData);
	const expectedBData = JSON.parse(
		(await fs.promises.readFile(`./test/fixtures/layouts/${testName}/b-data-merged.json`)).toString(
			'utf-8'
		)
	);

	assert.deepStrictEqual(bData.toJSON(), expectedBData);

	aData = new Data([], structuredClone(aDataContents));
	bData = new Data([], structuredClone(bDataContents));
	const backwards = merge(b, a, bData, aData);
	assert.deepStrictEqual(backwards, expected);
	assert.deepStrictEqual(merge(backwards, a, bData, new Data([], structuredClone(aDataContents))), expected);
	assert.deepStrictEqual(merge(backwards, b, bData, new Data([], structuredClone(bDataContents))), expected);
	assert.deepStrictEqual(merge(forwards, a, bData, new Data([], structuredClone(aDataContents))), expected);
	assert.deepStrictEqual(merge(forwards, b, bData, new Data([], structuredClone(bDataContents))), expected);
	assert.deepStrictEqual(merge(forwards, backwards, bData, aData), expected);
	assert.deepStrictEqual(merge(forwards, forwards, bData, aData), expected);
	assert.deepStrictEqual(merge(backwards, forwards, bData, aData), expected);
	assert.deepStrictEqual(merge(backwards, backwards, bData, aData), expected);
}

test('no-diff', () => runTest('no-diff'));
test('text-to-text', () => runTest('text-to-text'));
test('variable-to-text', () => runTest('variable-to-text'));
test('conditional', () => runTest('conditional'));
test('conditional-whitespace', () => runTest('conditional-whitespace'));
test('conditional-to-element', () => runTest('conditional-to-element'));
test('conditional-attribute', () => runTest('conditional-attribute'));
test('conditional-empty', () => runTest('conditional-empty'));
test('loop', () => runTest('loop'));
test('recursive-loop', () => runTest('recursive-loop'));
