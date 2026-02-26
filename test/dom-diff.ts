import { test } from 'node:test';
import * as assert from 'node:assert/strict';
import { mergeTree } from '../src/helpers/dom-diff.ts';
import { ASTNode } from '../src/types.ts';
import Data from '../src/helpers/Data.ts';
import { TestLogger } from './helpers/test-logger.ts';

interface TestDefinition {
	primary: ASTNode[];
	secondary: ASTNode[];
	primaryData: Record<string, any>;
	secondaryData: Record<string, any>;
	merged: ASTNode[];
	expectedPrimaryData: Record<string, any> | null;
	expectedSecondaryData: Record<string, any> | null;
	expectedPrimaryContents?: ASTNode[];
	expectedSecondaryContents?: ASTNode[];
}

function testTree(
	primaryData: Data,
	secondaryData: Data,
	primary: ASTNode[],
	secondary: ASTNode[],
	merged: ASTNode[],
	expectedPrimaryData: Record<string, any> | null,
	expectedSecondaryData: Record<string, any> | null,
	message: string
) {
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

	assert.deepStrictEqual(tree, merged, message);
	if (expectedPrimaryData) {
		assert.deepStrictEqual(primaryData.toJSON(), expectedPrimaryData, message);
	}
	if (expectedSecondaryData) {
		assert.deepStrictEqual(secondaryData.toJSON(), expectedSecondaryData, message);
	}

	return tree;
}

async function runTest(def: TestDefinition) {
	const primaryData = new Data([], structuredClone(def.primaryData));
	const secondaryData = new Data([], structuredClone(def.secondaryData));

	const forwards = testTree(
		primaryData,
		secondaryData,
		def.primary,
		def.secondary,
		def.merged,
		def.expectedPrimaryData,
		def.expectedSecondaryData,
		'tree merge'
	);

	const primaryReversedData = new Data([], structuredClone(def.primaryData));
	const secondaryReversedData = new Data([], structuredClone(def.secondaryData));
	const reversed = testTree(
		secondaryReversedData,
		primaryReversedData,
		def.secondary,
		def.primary,
		def.merged,
		def.expectedSecondaryData,
		def.expectedPrimaryData,
		'reversed tree merge'
	);

	testTree(
		primaryData,
		secondaryData,
		forwards,
		reversed,
		def.merged,
		primaryData.toJSON(),
		secondaryData.toJSON(),
		'forwards and reversed tree merge'
	);

	testTree(
		primaryData,
		new Data([], structuredClone(def.secondaryData)),
		forwards,
		def.secondary,
		def.merged,
		null,
		null,
		'forwards and secondary tree merge'
	);

	testTree(
		new Data([], structuredClone(secondaryReversedData.data)),
		new Data([], structuredClone(def.primaryData)),
		reversed,
		def.primary,
		def.merged,
		null,
		null,
		'reversed and primary tree merge'
	);
}

test('text to text', () =>
	runTest({
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
		primaryData: {},
		secondaryData: {},
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

test('text to empty', () =>
	runTest({
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
		primaryData: {},
		secondaryData: {},
		expectedPrimaryData: {
			div: ''
		},
		expectedSecondaryData: {
			div: 'Secondary'
		}
	}));

test('markdown to empty', () =>
	runTest({
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
		primaryData: {},
		secondaryData: {},
		expectedPrimaryData: {
			div_markdown: ''
		},
		expectedSecondaryData: {
			div_markdown: '# Heading 1\n\nParagraph'
		}
	}));

test('conditional meta - no whitespace', () =>
	runTest({
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
				reference: ['meta_description'],
				template: {
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
		primaryData: {},
		secondaryData: {},
		expectedPrimaryData: {
			title: 'Primary',
			meta_description: null
		},
		expectedSecondaryData: {
			title: 'Secondary',
			meta_description: {}
		}
	}));

test('conditional meta - with whitespace', () =>
	runTest({
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
				reference: ['meta_description'],
				template: {
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
		primaryData: {},
		secondaryData: {},
		expectedPrimaryData: {
			meta_description: null
		},
		expectedSecondaryData: {
			meta_description: {}
		}
	}));

test('loop and element comparison', () =>
	runTest({
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
		primaryData: {
			ul_badges_items: [
				{
					class_var: 'badge badge-pink',
					text_var: 'pool'
				},
				{
					class_var: 'badge badge-purple',
					text_var: 'park'
				}
			]
		},
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
		secondaryData: {},
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
		expectedPrimaryData: {
			ul_badges_items: [
				{
					class_var: 'badge badge-pink',
					text_var: 'pool'
				},
				{
					class_var: 'badge badge-purple',
					text_var: 'park'
				}
			]
		},
		expectedSecondaryData: {
			ul_badges_items: [
				{
					class_var: 'badge badge-blue',
					text_var: 'beach'
				}
			]
		}
	}));

test('loop with same first item', () =>
	runTest({
		primary: [
			{
				type: 'element',
				name: 'li',
				attrs: {
					class: {
						type: 'attribute',
						name: 'class',
						value: 'badge'
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
				type: 'element',
				name: 'li',
				attrs: {
					class: {
						type: 'attribute',
						name: 'class',
						value: 'badge'
					}
				},
				children: [
					{
						type: 'text',
						value: 'sand'
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
						value: 'badge'
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
				type: 'element',
				name: 'li',
				attrs: {
					class: {
						type: 'attribute',
						name: 'class',
						value: 'badge'
					}
				},
				children: [
					{
						type: 'text',
						value: 'lava'
					}
				]
			}
		],
		primaryData: {},
		secondaryData: {},
		merged: [
			{
				type: 'loop',
				reference: ['div_items'],
				template: {
					type: 'element',
					name: 'li',
					attrs: {
						class: {
							type: 'attribute',
							name: 'class',
							value: 'badge'
						}
					},
					children: [
						{
							type: 'variable',
							reference: ['li_badge']
						}
					]
				}
			}
		],
		expectedPrimaryData: {
			div_items: [
				{
					li_badge: 'beach'
				},
				{
					li_badge: 'sand'
				}
			]
		},
		expectedSecondaryData: {
			div_items: [
				{
					li_badge: 'beach'
				},
				{
					li_badge: 'lava'
				}
			]
		}
	}));

test('loop template and element comparison', () =>
	runTest({
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
		primaryData: {
			class_var: 'badge badge-green',
			text_var: 'park'
		},
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
		secondaryData: {},
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
		expectedPrimaryData: {
			class_var: 'badge badge-green',
			text_var: 'park'
		},
		expectedSecondaryData: {
			class_var: 'badge badge-blue',
			text_var: 'beach'
		}
	}));

test('conditional and element comparison', () =>
	runTest({
		primary: [
			{
				type: 'conditional',
				reference: ['meta_description_content'],
				template: {
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
		primaryData: {
			meta_description_content: {}
		},
		secondary: [
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
						value: 'Staff'
					}
				},
				children: []
			}
		],
		secondaryData: {},
		merged: [
			{
				type: 'conditional',
				reference: ['meta_description_content'],
				template: {
					type: 'element',
					name: 'meta',
					attrs: {
						name: {
							type: 'attribute',
							name: 'name',
							value: 'description'
						},
						content: {
							type: 'variable-attribute',
							name: 'content',
							reference: ['meta_description_content']
						}
					},
					children: []
				}
			}
		],
		expectedPrimaryData: {
			meta_description_content: {
				meta_description_content: 'Home'
			}
		},
		expectedSecondaryData: {
			meta_description_content: {
				meta_description_content: 'Staff'
			}
		}
	}));

test('conditional object', () =>
	runTest({
		primary: [
			{
				type: 'element',
				name: 'div',
				attrs: {},
				children: [
					{
						type: 'element',
						name: 'div',
						attrs: {
							class: {
								type: 'attribute',
								name: 'class',
								value: 'twoColumn--left'
							}
						},
						children: [
							{
								type: 'element',
								name: 'p',
								attrs: {},
								children: [
									{
										type: 'text',
										value: 'Lorem ipsum dolor sit amet'
									}
								]
							}
						]
					},
					{
						type: 'element',
						name: 'div',
						attrs: {
							class: {
								type: 'attribute',
								name: 'class',
								value: 'twoColumn--right'
							}
						},
						children: [
							{
								type: 'element',
								name: 'div',
								attrs: {
									class: {
										type: 'attribute',
										name: 'class',
										value: 'twoColumn__image'
									}
								},
								children: []
							},
							{
								type: 'element',
								name: 'p',
								attrs: {},
								children: [
									{
										type: 'text',
										value: 'Etiam nibh metus, imperdiet eu eros vel, congue aliquet eros.'
									}
								]
							}
						]
					}
				]
			}
		],
		secondary: [],
		primaryData: {},
		secondaryData: {},
		merged: [
			{
				type: 'conditional',
				reference: ['div'],
				template: {
					type: 'element',
					name: 'div',
					attrs: {},
					children: [
						{
							type: 'element',
							name: 'div',
							attrs: {
								class: {
									type: 'attribute',
									name: 'class',
									value: 'twoColumn--left'
								}
							},
							children: [
								{
									type: 'markdown-variable',
									reference: ['div_twoColumn_left_markdown']
								}
							]
						},
						{
							type: 'element',
							name: 'div',
							attrs: {
								class: {
									type: 'attribute',
									name: 'class',
									value: 'twoColumn--right'
								}
							},
							children: [
								{
									type: 'element',
									name: 'div',
									attrs: {
										class: {
											type: 'attribute',
											name: 'class',
											value: 'twoColumn__image'
										}
									},
									children: []
								},
								{
									type: 'markdown-variable',
									reference: ['div_twoColumn_right_markdown']
								}
							]
						}
					]
				}
			}
		],
		expectedPrimaryData: {
			div: {
				div_twoColumn_left_markdown: 'Lorem ipsum dolor sit amet',
				div_twoColumn_right_markdown:
					'Etiam nibh metus, imperdiet eu eros vel, congue aliquet eros.'
			}
		},
		expectedSecondaryData: {
			div: null
		}
	}));

test('conditional object with sibling variable', () =>
	runTest({
		primary: [
			{
				type: 'element',
				name: 'p',
				attrs: {},
				children: [
					{
						type: 'text',
						value: 'First text'
					}
				]
			},
			{
				type: 'element',
				name: 'div',
				attrs: {},
				children: [
					{
						type: 'element',
						name: 'div',
						attrs: {
							class: {
								type: 'attribute',
								name: 'class',
								value: 'twoColumn--left'
							}
						},
						children: [
							{
								type: 'element',
								name: 'p',
								attrs: {},
								children: [
									{
										type: 'text',
										value: 'Lorem ipsum dolor sit amet'
									}
								]
							}
						]
					},
					{
						type: 'element',
						name: 'div',
						attrs: {
							class: {
								type: 'attribute',
								name: 'class',
								value: 'twoColumn--right'
							}
						},
						children: [
							{
								type: 'element',
								name: 'div',
								attrs: {
									class: {
										type: 'attribute',
										name: 'class',
										value: 'twoColumn__image'
									}
								},
								children: []
							},
							{
								type: 'element',
								name: 'p',
								attrs: {},
								children: [
									{
										type: 'text',
										value: 'Etiam nibh metus, imperdiet eu eros vel, congue aliquet eros.'
									}
								]
							}
						]
					}
				]
			}
		],
		secondary: [
			{
				type: 'element',
				name: 'p',
				attrs: {},
				children: [
					{
						type: 'text',
						value: 'Second text'
					}
				]
			}
		],
		primaryData: {},
		secondaryData: {},
		merged: [
			{
				type: 'markdown-variable',
				reference: ['div_markdown']
			},
			{
				type: 'conditional',
				reference: ['div'],
				template: {
					type: 'element',
					name: 'div',
					attrs: {},
					children: [
						{
							type: 'element',
							name: 'div',
							attrs: {
								class: {
									type: 'attribute',
									name: 'class',
									value: 'twoColumn--left'
								}
							},
							children: [
								{
									type: 'markdown-variable',
									reference: ['div_twoColumn_left_markdown']
								}
							]
						},
						{
							type: 'element',
							name: 'div',
							attrs: {
								class: {
									type: 'attribute',
									name: 'class',
									value: 'twoColumn--right'
								}
							},
							children: [
								{
									type: 'element',
									name: 'div',
									attrs: {
										class: {
											type: 'attribute',
											name: 'class',
											value: 'twoColumn__image'
										}
									},
									children: []
								},
								{
									type: 'markdown-variable',
									reference: ['div_twoColumn_right_markdown']
								}
							]
						}
					]
				}
			}
		],
		expectedPrimaryData: {
			div_markdown: 'First text',
			div: {
				div_twoColumn_left_markdown: 'Lorem ipsum dolor sit amet',
				div_twoColumn_right_markdown:
					'Etiam nibh metus, imperdiet eu eros vel, congue aliquet eros.'
			}
		},
		expectedSecondaryData: {
			div_markdown: 'Second text',
			div: null
		}
	}));

test('conditional and loop comparison', () =>
	runTest({
		primary: [
			{
				type: 'element',
				name: 'div',
				attrs: {},
				children: [
					{
						type: 'element',
						name: 'div',
						attrs: {},
						children: [
							{
								type: 'element',
								name: 'p',
								attrs: {},
								children: [
									{
										type: 'text',
										value: 'Lorem Ipsum 1'
									}
								]
							},
							{
								type: 'element',
								name: 'img',
								attrs: {
									src: {
										name: 'src',
										type: 'attribute',
										value: 'https://placebear.com/250/50'
									}
								},
								children: []
							}
						]
					},
					{
						type: 'element',
						name: 'div',
						attrs: {},
						children: [
							{
								type: 'element',
								name: 'p',
								attrs: {},
								children: [
									{
										type: 'text',
										value: 'Lorem Ipsum 2'
									}
								]
							},
							{
								type: 'element',
								name: 'img',
								attrs: {
									src: {
										name: 'src',
										type: 'attribute',
										value: 'https://placebear.com/150/50'
									}
								},
								children: []
							}
						]
					},
					{
						type: 'element',
						name: 'div',
						attrs: {},
						children: [
							{
								type: 'element',
								name: 'p',
								attrs: {},
								children: [
									{
										type: 'text',
										value: 'Lorem Ipsum 3'
									}
								]
							},
							{
								type: 'element',
								name: 'img',
								attrs: {
									src: {
										name: 'src',
										type: 'attribute',
										value: 'https://placebear.com/50/50'
									}
								},
								children: []
							}
						]
					}
				]
			}
		],
		secondary: [],
		primaryData: {},
		secondaryData: {},
		merged: [
			{
				type: 'conditional',
				reference: ['div'],
				template: {
					type: 'element',
					name: 'div',
					attrs: {},
					children: [
						{
							type: 'loop',
							reference: ['div_items'],
							template: {
								type: 'element',
								name: 'div',
								attrs: {},
								children: [
									{
										type: 'markdown-variable',
										reference: ['div_markdown']
									}
								]
							}
						}
					]
				}
			}
		],
		expectedPrimaryData: {
			div: {
				div_items: [
					{
						div_markdown: 'Lorem Ipsum 1\n\n![](https://placebear.com/250/50)'
					},
					{
						div_markdown: 'Lorem Ipsum 2\n\n![](https://placebear.com/150/50)'
					},
					{
						div_markdown: 'Lorem Ipsum 3\n\n![](https://placebear.com/50/50)'
					}
				]
			}
		},
		expectedSecondaryData: {
			div: null
		}
	}));
