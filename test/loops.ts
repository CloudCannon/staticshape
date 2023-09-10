import test, { ExecutionContext } from 'ava';
import { findRepeatedIndex } from '../src/helpers/loops';
import { ASTElementNode, ASTNode } from '../src/types';

interface TestDefinition {
	current: ASTElementNode;
	remaining: ASTNode[];
	index: number;
}

async function runTest(t: ExecutionContext, def: TestDefinition) {
	const index = findRepeatedIndex(def.current, def.remaining);

	t.deepEqual(index, def.index);
}

test('no diff', (t: ExecutionContext) =>
	runTest(t, {
		current: {
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
		remaining: [
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
		index: 4
	}));
