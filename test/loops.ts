import { test } from 'node:test';
import * as assert from 'node:assert/strict';
import { findRepeatedIndex } from '../src/helpers/loops.ts';
import { ASTElementNode, ASTNode } from '../src/types.ts';

interface TestDefinition {
	tree: ASTNode[];
	index: number;
	elementCount: number;
}

async function runTest(def: TestDefinition) {
	const index = findRepeatedIndex(def.tree);

	assert.deepStrictEqual(index, def.index);
	const elements = def.tree
		.slice(0, index + 1)
		.filter((node) => node.type === 'element') as ASTElementNode[];
	assert.deepStrictEqual(elements.length, def.elementCount);
}

test('no diff', () =>
	runTest({
		tree: [
			{
				type: 'element',
				name: 'li',
				attrs: {
					class: {
						type: 'attribute',
						name: 'class',
						value: 'badge badge-red'
					}
				},
				children: [
					{
						type: 'text',
						value: 'lava'
					}
				]
			},
			{
				type: 'text',
				value: '\n\t\t\t\t'
			},
			{
				type: 'element',
				name: 'li',
				attrs: {
					class: {
						type: 'attribute',
						name: 'class',
						value: 'badge badge-green'
					}
				},
				children: [
					{
						type: 'text',
						value: 'walk'
					}
				]
			},
			{
				type: 'text',
				value: '\n\t\t\t\t'
			},
			{
				type: 'element',
				name: 'li',
				attrs: {
					class: {
						type: 'attribute',
						name: 'class',
						value: 'badge badge-navy'
					}
				},
				children: [
					{
						type: 'text',
						value: 'beach'
					}
				]
			},
			{
				type: 'text',
				value: '\n\t\t\t'
			}
		],
		index: 4,
		elementCount: 3
	}));
