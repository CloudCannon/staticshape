import test, { ExecutionContext } from 'ava';
import { mergeTree } from '../src/helpers/dom-diff';
import { ASTNode } from '../src/types';
import Data from '../src/helpers/Data';

interface TestDefinition {
	primary: ASTNode[];
	secondary: ASTNode[];
	merged: ASTNode[];
	expectedPrimaryData?: Record<string, any>;
	expectedSecondaryData?: Record<string, any>;
	expectedPrimaryContents?: ASTNode[];
	expectedSecondaryContents?: ASTNode[];
}

async function runTest(t: ExecutionContext, def: TestDefinition) {
	const primaryData = new Data([], {});
	const secondaryData = new Data([], {});

	const tree = mergeTree(0, primaryData, secondaryData, def.primary, def.secondary, [
		{
			type: 'element',
			name: 'div',
			attrs: {},
			children: def.primary
		}
	]);

	t.deepEqual(tree, def.merged);
	t.deepEqual(primaryData.toJSON(), def.expectedPrimaryData || {});
	t.deepEqual(secondaryData.toJSON(), def.expectedSecondaryData || {});
}

test('no diff', (t: ExecutionContext) =>
	runTest(t, {
		primary: [
			{
				type: 'text',
				value: 'Hi'
			}
		],
		secondary: [
			{
				type: 'text',
				value: 'Hi'
			}
		],
		merged: [
			{
				type: 'text',
				value: 'Hi'
			}
		]
	}));

test('variable diff', (t: ExecutionContext) =>
	runTest(t, {
		primary: [
			{
				type: 'text',
				value: 'Primary'
			}
		],
		secondary: [
			{
				type: 'text',
				value: 'Secondary'
			}
		],
		merged: [
			{
				type: 'variable',
				reference: ['div']
			}
		],
		expectedPrimaryData: {
			div: 'Primary'
		},
		expectedSecondaryData: {
			div: 'Secondary'
		}
	}));

test('conditional meta - no whitespace', (t: ExecutionContext) =>
	runTest(t, {
		primary: [
			{
				type: 'element',
				name: 'title',
				attrs: {},
				children: [{ type: 'text', value: 'Primary' }]
			}
		],
		secondary: [
			{
				type: 'element',
				name: 'title',
				attrs: {},
				children: [{ type: 'text', value: 'Secondary' }]
			},
			{
				type: 'element',
				name: 'meta',
				attrs: {
					name: {
						type: 'attribute',
						name: 'name',
						value: 'description'
					},
					content: {
						type: 'attribute',
						name: 'content',
						value: 'Home'
					}
				},
				children: []
			}
		],
		merged: [
			{
				type: 'element',
				name: 'title',
				attrs: {},
				children: [{ type: 'variable', reference: ['title'] }]
			},
			{
				type: 'conditional',
				reference: ['show_meta_description'],
				child: {
					type: 'element',
					name: 'meta',
					attrs: {
						name: {
							type: 'attribute',
							name: 'name',
							value: 'description'
						},
						content: {
							type: 'attribute',
							name: 'content',
							value: 'Home'
						}
					},
					children: []
				}
			}
		],
		expectedPrimaryData: {
			title: 'Primary',
			show_meta_description: false
		},
		expectedSecondaryData: {
			title: 'Secondary',
			show_meta_description: true
		}
	}));

test('conditional meta - with whitespace', (t: ExecutionContext) =>
	runTest(t, {
		primary: [
			{ type: 'text', value: '\n\t\t' },
			{
				type: 'element',
				name: 'title',
				attrs: {},
				children: []
			},
			{ type: 'text', value: '\n\t' }
		],
		secondary: [
			{ type: 'text', value: '\n\t\t' },
			{
				type: 'element',
				name: 'title',
				attrs: {},
				children: []
			},
			{ type: 'text', value: '\n\t\t' },
			{
				type: 'element',
				name: 'meta',
				attrs: {
					name: {
						type: 'attribute',
						name: 'name',
						value: 'description'
					},
					content: {
						type: 'attribute',
						name: 'content',
						value: 'Home'
					}
				},
				children: []
			},
			{ type: 'text', value: '\n\t' }
		],
		merged: [
			{ type: 'text', value: '\n\t\t' },
			{
				type: 'element',
				name: 'title',
				attrs: {},
				children: []
			},
			{ type: 'text', value: '\n\t\t' },
			{
				type: 'conditional',
				reference: ['show_meta_description'],
				child: {
					type: 'element',
					name: 'meta',
					attrs: {
						name: {
							type: 'attribute',
							name: 'name',
							value: 'description'
						},
						content: {
							type: 'attribute',
							name: 'content',
							value: 'Home'
						}
					},
					children: []
				}
			},
			{ type: 'text', value: '\n\t' }
		],
		expectedPrimaryData: {
			show_meta_description: false
		},
		expectedSecondaryData: {
			show_meta_description: true
		}
	}));
