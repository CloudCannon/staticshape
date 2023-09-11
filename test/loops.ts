import test, { ExecutionContext } from 'ava';
import { findRepeatedIndex } from '../src/helpers/loops';
import { ASTElementNode, ASTNode } from '../src/types';

interface TestDefinition {
	tree: ASTNode[];
	index: number;
	elementCount: number;
}

async function runTest(t: ExecutionContext, def: TestDefinition) {
	const index = findRepeatedIndex(def.tree);

	t.deepEqual(index, def.index);
	const elements = def.tree
		.slice(0, index + 1)
		.filter((node) => node.type === 'element') as ASTElementNode[];
	t.deepEqual(elements.length, def.elementCount);
}

test('no diff', (t: ExecutionContext) =>
	runTest(t, {
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
