import test, { ExecutionContext } from 'ava';
import { mergeTree } from '../src/helpers/dom-diff';
import { ASTNode } from '../src/types';
import Data from '../src/helpers/Data';
import { TestLogger } from './test-logger';

interface TestDefinition {
	primary: ASTNode[];
	secondary: ASTNode[];
	merged: ASTNode[];
	expectedPrimaryData?: Record<string, any>;
	expectedSecondaryData?: Record<string, any>;
	expectedPrimaryContents?: ASTNode[];
	expectedSecondaryContents?: ASTNode[];
}

function testTree(
	t: ExecutionContext,
	primary: ASTNode[],
	secondary: ASTNode[],
	merged: ASTNode[],
	expectedPrimaryData?: Record<string, any>,
	expectedSecondaryData?: Record<string, any>,
	message?: string
) {
	const primaryData = new Data([], {});
	const secondaryData = new Data([], {});

	const tree = mergeTree(
		primaryData,
		secondaryData,
		primary,
		secondary,
		[
			{
				type: 'element',
				name: 'div',
				attrs: {},
				children: []
			}
		],
		new TestLogger()
	);

	t.deepEqual(tree, merged, message);
	if (expectedPrimaryData) {
		t.deepEqual(primaryData.toJSON(), expectedPrimaryData, message);
	}
	if (expectedSecondaryData) {
		t.deepEqual(secondaryData.toJSON(), expectedSecondaryData, message);
	}
	return tree;
}

async function runTest(t: ExecutionContext, def: TestDefinition) {
	const forwards = testTree(
		t,
		def.primary,
		def.secondary,
		def.merged,
		def.expectedPrimaryData,
		def.expectedSecondaryData,
		'tree merge'
	);
	const reversed = testTree(
		t,
		def.secondary,
		def.primary,
		def.merged,
		def.expectedSecondaryData,
		def.expectedPrimaryData,
		'reversed tree merge'
	);
	testTree(t, forwards, reversed, def.merged);
	testTree(t, forwards, def.secondary, def.merged);
	testTree(t, reversed, def.primary, def.merged);
}

test('text to text', (t: ExecutionContext) =>
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

test('text to empty', (t: ExecutionContext) =>
	runTest(t, {
		primary: [],
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
			div: ''
		},
		expectedSecondaryData: {
			div: 'Secondary'
		}
	}));

test('markdown to empty', (t: ExecutionContext) =>
	runTest(t, {
		primary: [],
		secondary: [
			{
				type: 'element',
				name: 'h1',
				attrs: {},
				children: [{ type: 'text', value: 'Heading 1' }]
			},
			{
				type: 'element',
				name: 'p',
				attrs: {},
				children: [{ type: 'text', value: 'Paragraph' }]
			}
		],
		merged: [
			{
				type: 'markdown-variable',
				reference: ['div_markdown']
			}
		],
		expectedPrimaryData: {
			div_markdown: ''
		},
		expectedSecondaryData: {
			div_markdown: '# Heading 1\n\nParagraph'
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

test('loop and element comparison', (t: ExecutionContext) =>
	runTest(t, {
		primary: [
			{
				type: 'loop',
				reference: ['ul_badges_items'],
				template: {
					type: 'element',
					name: 'li',
					attrs: {
						class: {
							type: 'variable-attribute',
							name: 'class',
							reference: ['class_var']
						}
					},
					children: [
						{
							type: 'variable',
							reference: ['text_var']
						}
					]
				}
			}
		],
		secondary: [
			{
				type: 'element',
				name: 'li',
				attrs: {
					class: {
						type: 'attribute',
						name: 'class',
						value: 'badge badge-blue'
					}
				},
				children: [
					{
						type: 'text',
						value: 'beach'
					}
				]
			}
		],
		merged: [
			{
				type: 'loop',
				reference: ['ul_badges_items'],
				template: {
					type: 'element',
					name: 'li',
					attrs: {
						class: {
							type: 'variable-attribute',
							name: 'class',
							reference: ['class_var']
						}
					},
					children: [
						{
							type: 'variable',
							reference: ['text_var']
						}
					]
				}
			}
		],
		expectedPrimaryData: {},
		expectedSecondaryData: {
			ul_badges_items: [
				{
					class_var: 'badge badge-blue',
					text_var: 'beach'
				}
			]
		}
	}));

test('loop template and element comparison', (t: ExecutionContext) =>
	runTest(t, {
		primary: [
			{
				type: 'element',
				name: 'li',
				attrs: {
					class: {
						type: 'variable-attribute',
						name: 'class',
						reference: ['class_var']
					}
				},
				children: [
					{
						type: 'variable',
						reference: ['text_var']
					}
				]
			}
		],
		secondary: [
			{
				type: 'element',
				name: 'li',
				attrs: {
					class: {
						type: 'attribute',
						name: 'class',
						value: 'badge badge-blue'
					}
				},
				children: [
					{
						type: 'text',
						value: 'beach'
					}
				]
			}
		],
		merged: [
			{
				type: 'element',
				name: 'li',
				attrs: {
					class: {
						type: 'variable-attribute',
						name: 'class',
						reference: ['class_var']
					}
				},
				children: [
					{
						type: 'variable',
						reference: ['text_var']
					}
				]
			}
		],
		expectedPrimaryData: {},
		expectedSecondaryData: {
			class_var: 'badge badge-blue',
			text_var: 'beach'
		}
	}));