import test, { ExecutionContext } from 'ava';
import { isBestMatch, nodeEquivalencyScore, loopThreshold } from '../src/helpers/node-equivalency';
import { ASTElementNode, ASTNode, ASTTextNode } from '../src/types';

interface TestDefinition {
	currentTree: ASTNode[];
	otherTree: ASTNode[];
	isBestMatch: boolean;
	isAboveLoopThreshold: boolean;
	score: number;
}

function roundScore(score: number) {
	return Math.round(score * 100) / 100;
}

const textNode = (text: string): ASTNode => ({ type: 'text', value: text }) as ASTTextNode;

async function runTest(t: ExecutionContext, def: TestDefinition) {
	const forwardsScore = nodeEquivalencyScore(def.currentTree[0], def.otherTree[0]);
	t.is(roundScore(forwardsScore), def.score);
	const reverseScore = nodeEquivalencyScore(def.currentTree[0], def.otherTree[0]);
	t.is(roundScore(reverseScore), def.score);
	t.is(isBestMatch(def.currentTree, def.otherTree), def.isBestMatch);
	t.is(isBestMatch(def.otherTree, def.currentTree), def.isBestMatch);
	t.is(
		forwardsScore >= loopThreshold,
		def.isAboveLoopThreshold,
		def.isAboveLoopThreshold
			? `${forwardsScore} should be more than ${loopThreshold}`
			: `${forwardsScore} should be less than ${loopThreshold}`
	);
}

test('same', (t: ExecutionContext) =>
	runTest(t, {
		currentTree: [textNode('a')],
		otherTree: [textNode('a')],
		isBestMatch: true,
		isAboveLoopThreshold: true,
		score: 1
	}));

test('just as good', (t: ExecutionContext) =>
	runTest(t, {
		currentTree: [textNode('a'), textNode('c')],
		otherTree: [textNode('b')],
		isBestMatch: true,
		isAboveLoopThreshold: false,
		score: 0.5
	}));

test('later', (t: ExecutionContext) =>
	runTest(t, {
		currentTree: [textNode('a'), textNode('b')],
		otherTree: [textNode('b')],
		isBestMatch: false,
		isAboveLoopThreshold: false,
		score: 0.5
	}));

test('even later', (t: ExecutionContext) =>
	runTest(t, {
		currentTree: [textNode('a'), textNode('c'), textNode('b')],
		otherTree: [textNode('b')],
		isBestMatch: false,
		isAboveLoopThreshold: false,
		score: 0.5
	}));

test('text to element comparison', (t: ExecutionContext) =>
	runTest(t, {
		currentTree: [textNode('a')],
		otherTree: [{ type: 'element', name: 'div', attrs: {}, children: [] }],
		isBestMatch: false,
		isAboveLoopThreshold: false,
		score: 0
	}));

test('element to text comparison', (t: ExecutionContext) =>
	runTest(t, {
		currentTree: [{ type: 'element', name: 'div', attrs: {}, children: [] }],
		otherTree: [textNode('a')],
		isBestMatch: false,
		isAboveLoopThreshold: false,
		score: 0
	}));

test('variable to variable comparison', (t: ExecutionContext) =>
	runTest(t, {
		currentTree: [{ type: 'variable', reference: ['a'] }],
		otherTree: [{ type: 'variable', reference: ['a'] }],
		isBestMatch: true,
		isAboveLoopThreshold: true,
		score: 1
	}));

test('loop and element comparison', (t: ExecutionContext) =>
	runTest(t, {
		currentTree: [
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
							reference: ['li_badge_badge-blue_class']
						}
					},
					children: [
						{
							type: 'variable',
							reference: ['li_badge_badge-blue']
						}
					]
				}
			}
		],
		otherTree: [
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
		isBestMatch: true,
		isAboveLoopThreshold: true,
		score: 1
	}));
	
test('div to section comparison', (t: ExecutionContext) =>
	runTest(t, {
		currentTree: [
			{
				name: 'div',
				type: 'element',
				attrs: {},
				children: []
			}
		],
		otherTree: [
			{
				name: 'section',
				type: 'element',
				attrs: {},
				children: []
			}
		],
		isBestMatch: false,
		isAboveLoopThreshold: false,
		score: 0
	}));

test('a to a[target] comparison', (t: ExecutionContext) =>
	runTest(t, {
		currentTree: [
			{
				name: 'a',
				type: 'element',
				attrs: {
					href: {
						type: 'attribute',
						name: 'href',
						value: 'https://google.com'
					},
					target: {
						type: 'attribute',
						name: 'target',
						value: '_blank'
					}
				},
				children: []
			}
		],
		otherTree: [
			{
				name: 'a',
				type: 'element',
				attrs: {
					href: {
						type: 'attribute',
						name: 'href',
						value: 'https://duckduckgo.com'
					},
					rel: {
						type: 'attribute',
						name: 'rel',
						value: 'noopener'
					}
				},
				children: []
			}
		],
		isBestMatch: true,
		isAboveLoopThreshold: true,
		score: 0.9
	}));

test('li.badge.badge-green to li.badge.badge-navy comparison', (t: ExecutionContext) =>
	runTest(t, {
		currentTree: [
			{
				name: 'li',
				type: 'element',
				attrs: {
					class: {
						type: 'attribute',
						name: 'class',
						value: 'badge badge-green'
					}
				},
				children: []
			}
		],
		otherTree: [
			{
				name: 'li',
				type: 'element',
				attrs: {
					class: {
						type: 'attribute',
						name: 'class',
						value: 'badge badge-navy'
					}
				},
				children: []
			}
		],
		isBestMatch: true,
		isAboveLoopThreshold: true,
		score: 0.98
	}));

test('img - different alt', (t: ExecutionContext) =>
	runTest(t, {
		currentTree: [
			{
				name: 'img',
				type: 'element',
				attrs: {
					src: {
						name: 'src',
						type: 'attribute',
						value: 'assets/goose.jpg'
					},
					alt: {
						name: 'alt',
						type: 'attribute',
						value: 'Our goose'
					}
				},
				children: []
			}
		],
		otherTree: [
			{
				name: 'img',
				type: 'element',
				attrs: {
					src: {
						name: 'src',
						type: 'attribute',
						value: 'assets/goose.jpg'
					},
					alt: {
						name: 'alt',
						type: 'attribute',
						value: 'Their goose'
					}
				},
				children: []
			}
		],
		isBestMatch: true,
		isAboveLoopThreshold: true,
		score: 0.98
	}));

test('ul to the same ul', (t: ExecutionContext) =>
	runTest(t, {
		currentTree: [
			{
				type: 'element',
				name: 'ul',
				attrs: {
					class: { type: 'attribute', name: 'class', value: 'badges' }
				},
				children: []
			}
		],
		otherTree: [
			{
				type: 'element',
				name: 'ul',
				attrs: {
					class: { type: 'attribute', name: 'class', value: 'badges' }
				},
				children: []
			}
		],
		isBestMatch: true,
		isAboveLoopThreshold: true,
		score: 1
	}));

const sectionA1: ASTElementNode = {
	type: 'element',
	name: 'section',
	attrs: {
		class: {
			type: 'attribute',
			name: 'class',
			value: 'share-container'
		}
	},
	children: [
		{
			type: 'text',
			value: '\n      '
		},
		{
			type: 'element',
			name: 'div',
			attrs: {
				class: {
					type: 'attribute',
					name: 'class',
					value: 'container container--no-padding-top'
				}
			},
			children: [
				{
					type: 'text',
					value: '\n        '
				},
				{
					type: 'element',
					name: 'h2',
					attrs: {},
					children: [
						{
							type: 'text',
							value: 'Tell others about Bethune’s Gully'
						}
					]
				},
				{
					type: 'text',
					value: '\n\n        '
				},
				{
					type: 'element',
					name: 'div',
					attrs: {
						class: {
							type: 'attribute',
							name: 'class',
							value: 'u-grid u-flex-center'
						}
					},
					children: [
						{
							type: 'text',
							value: '\n          '
						},
						{
							type: 'element',
							name: 'a',
							attrs: {
								class: {
									type: 'attribute',
									name: 'class',
									value: 'btn btn-facebook'
								},
								href: {
									type: 'attribute',
									name: 'href',
									value: 'https://www.facebook.com/sharer/sharer.php?u=https%3A%2F%2Fdunedinattractions.nz%2Fbethunes-gully%2F'
								},
								rel: {
									type: 'attribute',
									name: 'rel',
									value: 'noopener'
								},
								target: {
									type: 'attribute',
									name: 'target',
									value: '_blank'
								}
							},
							children: [
								{
									type: 'text',
									value: '\n            '
								},
								{
									type: 'element',
									name: 'svg',
									attrs: {
										fill: {
											type: 'attribute',
											name: 'fill',
											value: '#000000'
										},
										height: {
											type: 'attribute',
											name: 'height',
											value: '24'
										},
										viewBox: {
											type: 'attribute',
											name: 'viewBox',
											value: '0 0 24 24'
										},
										width: {
											type: 'attribute',
											name: 'width',
											value: '24'
										},
										xmlns: {
											type: 'attribute',
											name: 'xmlns',
											value: 'http://www.w3.org/2000/svg'
										}
									},
									children: [
										{
											type: 'text',
											value: '\n              '
										},
										{
											type: 'element',
											name: 'path',
											attrs: {
												d: {
													type: 'attribute',
													name: 'd',
													value: 'M19,4V7H17A1,1 0 0,0 16,8V10H19V13H16V20H13V13H11V10H13V7.5C13,5.56 14.57,4 16.5,4M20,2H4A2,2 0 0,0 2,4V20A2,2 0 0,0 4,22H20A2,2 0 0,0 22,20V4C22,2.89 21.1,2 20,2Z'
												}
											},
											children: []
										},
										{
											type: 'text',
											value: '\n            '
										}
									]
								},
								{
									type: 'text',
									value: '\n            Share\n          '
								}
							]
						},
						{
							type: 'text',
							value: '\n          '
						},
						{
							type: 'element',
							name: 'a',
							attrs: {
								class: {
									type: 'attribute',
									name: 'class',
									value: 'btn btn-twitter'
								},
								href: {
									type: 'attribute',
									name: 'href',
									value: 'https://twitter.com/intent/tweet?url=https%3A%2F%2Fdunedinattractions.nz%2Fbethunes-gully%2F&text=Read%20about%20Bethune%E2%80%99s+Gully%0A%20on%20Dunedin+Attractions&via=DNAttractions&hashtags=dunedin,newzealand'
								},
								rel: {
									type: 'attribute',
									name: 'rel',
									value: 'noopener'
								},
								target: {
									type: 'attribute',
									name: 'target',
									value: '_blank'
								}
							},
							children: [
								{
									type: 'text',
									value: '\n            '
								},
								{
									type: 'element',
									name: 'svg',
									attrs: {
										fill: {
											type: 'attribute',
											name: 'fill',
											value: '#000000'
										},
										height: {
											type: 'attribute',
											name: 'height',
											value: '24'
										},
										viewBox: {
											type: 'attribute',
											name: 'viewBox',
											value: '0 0 24 24'
										},
										width: {
											type: 'attribute',
											name: 'width',
											value: '24'
										},
										xmlns: {
											type: 'attribute',
											name: 'xmlns',
											value: 'http://www.w3.org/2000/svg'
										}
									},
									children: [
										{
											type: 'text',
											value: '\n              '
										},
										{
											type: 'element',
											name: 'path',
											attrs: {
												d: {
													type: 'attribute',
													name: 'd',
													value: 'M22.46,6C21.69,6.35 20.86,6.58 20,6.69C20.88,6.16 21.56,5.32 21.88,4.31C21.05,4.81 20.13,5.16 19.16,5.36C18.37,4.5 17.26,4 16,4C13.65,4 11.73,5.92 11.73,8.29C11.73,8.63 11.77,8.96 11.84,9.27C8.28,9.09 5.11,7.38 3,4.79C2.63,5.42 2.42,6.16 2.42,6.94C2.42,8.43 3.17,9.75 4.33,10.5C3.62,10.5 2.96,10.3 2.38,10C2.38,10 2.38,10 2.38,10.03C2.38,12.11 3.86,13.85 5.82,14.24C5.46,14.34 5.08,14.39 4.69,14.39C4.42,14.39 4.15,14.36 3.89,14.31C4.43,16 6,17.26 7.89,17.29C6.43,18.45 4.58,19.13 2.56,19.13C2.22,19.13 1.88,19.11 1.54,19.07C3.44,20.29 5.7,21 8.12,21C16,21 20.33,14.46 20.33,8.79C20.33,8.6 20.33,8.42 20.32,8.23C21.16,7.63 21.88,6.87 22.46,6Z'
												}
											},
											children: []
										},
										{
											type: 'text',
											value: '\n            '
										}
									]
								},
								{
									type: 'text',
									value: '\n            Tweet\n          '
								}
							]
						},
						{
							type: 'text',
							value: '\n        '
						}
					]
				},
				{
					type: 'text',
					value: '\n      '
				}
			]
		},
		{
			type: 'text',
			value: '\n    '
		}
	]
};

const sectionA2: ASTElementNode = {
	type: 'element',
	name: 'section',
	attrs: {
		class: {
			type: 'attribute',
			name: 'class',
			value: 'share-container'
		}
	},
	children: [
		{
			type: 'text',
			value: '\n      '
		},
		{
			type: 'element',
			name: 'div',
			attrs: {
				class: {
					type: 'attribute',
					name: 'class',
					value: 'container container--no-padding-top'
				}
			},
			children: [
				{
					type: 'text',
					value: '\n        '
				},
				{
					type: 'element',
					name: 'h2',
					attrs: {},
					children: [
						{
							type: 'text',
							value: 'Tell others about Blackhead Beach'
						}
					]
				},
				{
					type: 'text',
					value: '\n\n        '
				},
				{
					type: 'element',
					name: 'div',
					attrs: {
						class: {
							type: 'attribute',
							name: 'class',
							value: 'u-grid u-flex-center'
						}
					},
					children: [
						{
							type: 'text',
							value: '\n          '
						},
						{
							type: 'element',
							name: 'a',
							attrs: {
								class: {
									type: 'attribute',
									name: 'class',
									value: 'btn btn-facebook'
								},
								href: {
									type: 'attribute',
									name: 'href',
									value: 'https://www.facebook.com/sharer/sharer.php?u=https%3A%2F%2Fdunedinattractions.nz%2Fblackhead-beach%2F'
								},
								rel: {
									type: 'attribute',
									name: 'rel',
									value: 'noopener'
								},
								target: {
									type: 'attribute',
									name: 'target',
									value: '_blank'
								}
							},
							children: [
								{
									type: 'text',
									value: '\n            '
								},
								{
									type: 'element',
									name: 'svg',
									attrs: {
										fill: {
											type: 'attribute',
											name: 'fill',
											value: '#000000'
										},
										height: {
											type: 'attribute',
											name: 'height',
											value: '24'
										},
										viewBox: {
											type: 'attribute',
											name: 'viewBox',
											value: '0 0 24 24'
										},
										width: {
											type: 'attribute',
											name: 'width',
											value: '24'
										},
										xmlns: {
											type: 'attribute',
											name: 'xmlns',
											value: 'http://www.w3.org/2000/svg'
										}
									},
									children: [
										{
											type: 'text',
											value: '\n              '
										},
										{
											type: 'element',
											name: 'path',
											attrs: {
												d: {
													type: 'attribute',
													name: 'd',
													value: 'M19,4V7H17A1,1 0 0,0 16,8V10H19V13H16V20H13V13H11V10H13V7.5C13,5.56 14.57,4 16.5,4M20,2H4A2,2 0 0,0 2,4V20A2,2 0 0,0 4,22H20A2,2 0 0,0 22,20V4C22,2.89 21.1,2 20,2Z'
												}
											},
											children: []
										},
										{
											type: 'text',
											value: '\n            '
										}
									]
								},
								{
									type: 'text',
									value: '\n            Share\n          '
								}
							]
						},
						{
							type: 'text',
							value: '\n          '
						},
						{
							type: 'element',
							name: 'a',
							attrs: {
								class: {
									type: 'attribute',
									name: 'class',
									value: 'btn btn-twitter'
								},
								href: {
									type: 'attribute',
									name: 'href',
									value: 'https://twitter.com/intent/tweet?url=https%3A%2F%2Fdunedinattractions.nz%2Fblackhead-beach%2F&text=Read%20about%20Blackhead+Beach%0A%20on%20Dunedin+Attractions&via=DNAttractions&hashtags=dunedin,newzealand'
								},
								rel: {
									type: 'attribute',
									name: 'rel',
									value: 'noopener'
								},
								target: {
									type: 'attribute',
									name: 'target',
									value: '_blank'
								}
							},
							children: [
								{
									type: 'text',
									value: '\n            '
								},
								{
									type: 'element',
									name: 'svg',
									attrs: {
										fill: {
											type: 'attribute',
											name: 'fill',
											value: '#000000'
										},
										height: {
											type: 'attribute',
											name: 'height',
											value: '24'
										},
										viewBox: {
											type: 'attribute',
											name: 'viewBox',
											value: '0 0 24 24'
										},
										width: {
											type: 'attribute',
											name: 'width',
											value: '24'
										},
										xmlns: {
											type: 'attribute',
											name: 'xmlns',
											value: 'http://www.w3.org/2000/svg'
										}
									},
									children: [
										{
											type: 'text',
											value: '\n              '
										},
										{
											type: 'element',
											name: 'path',
											attrs: {
												d: {
													type: 'attribute',
													name: 'd',
													value: 'M22.46,6C21.69,6.35 20.86,6.58 20,6.69C20.88,6.16 21.56,5.32 21.88,4.31C21.05,4.81 20.13,5.16 19.16,5.36C18.37,4.5 17.26,4 16,4C13.65,4 11.73,5.92 11.73,8.29C11.73,8.63 11.77,8.96 11.84,9.27C8.28,9.09 5.11,7.38 3,4.79C2.63,5.42 2.42,6.16 2.42,6.94C2.42,8.43 3.17,9.75 4.33,10.5C3.62,10.5 2.96,10.3 2.38,10C2.38,10 2.38,10 2.38,10.03C2.38,12.11 3.86,13.85 5.82,14.24C5.46,14.34 5.08,14.39 4.69,14.39C4.42,14.39 4.15,14.36 3.89,14.31C4.43,16 6,17.26 7.89,17.29C6.43,18.45 4.58,19.13 2.56,19.13C2.22,19.13 1.88,19.11 1.54,19.07C3.44,20.29 5.7,21 8.12,21C16,21 20.33,14.46 20.33,8.79C20.33,8.6 20.33,8.42 20.32,8.23C21.16,7.63 21.88,6.87 22.46,6Z'
												}
											},
											children: []
										},
										{
											type: 'text',
											value: '\n            '
										}
									]
								},
								{
									type: 'text',
									value: '\n            Tweet\n          '
								}
							]
						},
						{
							type: 'text',
							value: '\n        '
						}
					]
				},
				{
					type: 'text',
					value: '\n      '
				}
			]
		},
		{
			type: 'text',
			value: '\n    '
		}
	]
};

const sectionB1: ASTElementNode = {
	type: 'element',
	name: 'section',
	attrs: {
		class: {
			type: 'attribute',
			name: 'class',
			value: 'container'
		}
	},
	children: [
		{
			type: 'text',
			value: '\n      '
		},
		{
			type: 'element',
			name: 'h2',
			attrs: {},
			children: [
				{
					type: 'text',
					value: 'More Attractions'
				}
			]
		},
		{
			type: 'text',
			value: '\n      '
		},
		{
			type: 'element',
			name: 'div',
			attrs: {
				class: {
					type: 'attribute',
					name: 'class',
					value: 'attractions grid vertical-flow'
				}
			},
			children: [
				{
					type: 'text',
					value: '\n        '
				},
				{
					type: 'element',
					name: 'a',
					attrs: {
						class: {
							type: 'attribute',
							name: 'class',
							value: 'attraction'
						},
						href: {
							type: 'attribute',
							name: 'href',
							value: '/purakaunui/'
						}
					},
					children: [
						{
							type: 'text',
							value: '\n          '
						},
						{
							type: 'element',
							name: 'div',
							attrs: {
								class: {
									type: 'attribute',
									name: 'class',
									value: 'attraction-image'
								}
							},
							children: [
								{
									type: 'text',
									value: '\n            '
								},
								{
									type: 'element',
									name: 'img',
									attrs: {
										alt: {
											type: 'attribute',
											name: 'alt',
											value: 'Purakaunui'
										},
										'data-cms-original-src': {
											type: 'attribute',
											name: 'data-cms-original-src',
											value: '/generated/images/purakaunui/700x500.jpg'
										},
										'data-cms-original-srcset': {
											type: 'attribute',
											name: 'data-cms-original-srcset',
											value: '/generated/images/purakaunui/700x500.jpg 700w, /generated/images/purakaunui/1400x1000.jpg 1400w'
										},
										height: {
											type: 'attribute',
											name: 'height',
											value: '500'
										},
										loading: {
											type: 'attribute',
											name: 'loading',
											value: 'lazy'
										},
										src: {
											type: 'attribute',
											name: 'src',
											value: '/generated/images/purakaunui/700x500.jpg?_cchid=39e41ad7327d3d55897f47b783a22509'
										},
										srcset: {
											type: 'attribute',
											name: 'srcset',
											value: '\n                /generated/images/purakaunui/700x500.jpg?_cchid=39e41ad7327d3d55897f47b783a22509    700w,\n                /generated/images/purakaunui/1400x1000.jpg?_cchid=39b39931bd751aa7c4587ee8b48d1e5f 1400w\n              '
										},
										width: {
											type: 'attribute',
											name: 'width',
											value: '700'
										}
									},
									children: []
								},
								{
									type: 'text',
									value: '\n          '
								}
							]
						},
						{
							type: 'text',
							value: '\n\n          '
						},
						{
							type: 'element',
							name: 'div',
							attrs: {
								class: {
									type: 'attribute',
									name: 'class',
									value: 'attraction-details'
								}
							},
							children: [
								{
									type: 'text',
									value: '\n            '
								},
								{
									type: 'element',
									name: 'h3',
									attrs: {},
									children: [
										{
											type: 'text',
											value: 'Purakaunui'
										}
									]
								},
								{
									type: 'text',
									value: '\n\n            '
								},
								{
									type: 'element',
									name: 'ul',
									attrs: {
										class: {
											type: 'attribute',
											name: 'class',
											value: 'badges'
										}
									},
									children: [
										{
											type: 'text',
											value: '\n              '
										},
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
										},
										{
											type: 'text',
											value: '\n            '
										}
									]
								},
								{
									type: 'text',
									value: '\n\n            '
								},
								{
									type: 'element',
									name: 'p',
									attrs: {},
									children: [
										{
											type: 'text',
											value: '\n              Restful, forest-enclosed retreat sheltered in the depths of a\n              glorious bay.\n            '
										}
									]
								},
								{
									type: 'text',
									value: '\n          '
								}
							]
						},
						{
							type: 'text',
							value: '\n        '
						}
					]
				},
				{
					type: 'text',
					value: '\n\n        '
				},
				{
					type: 'element',
					name: 'a',
					attrs: {
						class: {
							type: 'attribute',
							name: 'class',
							value: 'attraction'
						},
						href: {
							type: 'attribute',
							name: 'href',
							value: '/waipori-falls/'
						}
					},
					children: [
						{
							type: 'text',
							value: '\n          '
						},
						{
							type: 'element',
							name: 'div',
							attrs: {
								class: {
									type: 'attribute',
									name: 'class',
									value: 'attraction-image'
								}
							},
							children: [
								{
									type: 'text',
									value: '\n            '
								},
								{
									type: 'element',
									name: 'img',
									attrs: {
										alt: {
											type: 'attribute',
											name: 'alt',
											value: 'Waipori Falls'
										},
										'data-cms-original-src': {
											type: 'attribute',
											name: 'data-cms-original-src',
											value: '/generated/images/waipori-falls/700x500.jpg'
										},
										'data-cms-original-srcset': {
											type: 'attribute',
											name: 'data-cms-original-srcset',
											value: '/generated/images/waipori-falls/700x500.jpg 700w, /generated/images/waipori-falls/1400x1000.jpg 1400w'
										},
										height: {
											type: 'attribute',
											name: 'height',
											value: '500'
										},
										loading: {
											type: 'attribute',
											name: 'loading',
											value: 'lazy'
										},
										src: {
											type: 'attribute',
											name: 'src',
											value: '/generated/images/waipori-falls/700x500.jpg?_cchid=a2e467349045c71ba0fbd7f52226c912'
										},
										srcset: {
											type: 'attribute',
											name: 'srcset',
											value: '\n                /generated/images/waipori-falls/700x500.jpg?_cchid=a2e467349045c71ba0fbd7f52226c912    700w,\n                /generated/images/waipori-falls/1400x1000.jpg?_cchid=907da720cb3e2a32d3b16355a72ac1d4 1400w\n              '
										},
										width: {
											type: 'attribute',
											name: 'width',
											value: '700'
										}
									},
									children: []
								},
								{
									type: 'text',
									value: '\n          '
								}
							]
						},
						{
							type: 'text',
							value: '\n\n          '
						},
						{
							type: 'element',
							name: 'div',
							attrs: {
								class: {
									type: 'attribute',
									name: 'class',
									value: 'attraction-details'
								}
							},
							children: [
								{
									type: 'text',
									value: '\n            '
								},
								{
									type: 'element',
									name: 'h3',
									attrs: {},
									children: [
										{
											type: 'text',
											value: 'Waipori Falls'
										}
									]
								},
								{
									type: 'text',
									value: '\n\n            '
								},
								{
									type: 'element',
									name: 'ul',
									attrs: {
										class: {
											type: 'attribute',
											name: 'class',
											value: 'badges'
										}
									},
									children: [
										{
											type: 'text',
											value: '\n              '
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
											value: '\n            '
										}
									]
								},
								{
									type: 'text',
									value: '\n\n            '
								},
								{
									type: 'element',
									name: 'p',
									attrs: {},
									children: [
										{
											type: 'text',
											value: '\n              Peaceful waterfall at the end of a walking track in the Waipori\n              Gorge.\n            '
										}
									]
								},
								{
									type: 'text',
									value: '\n          '
								}
							]
						},
						{
							type: 'text',
							value: '\n        '
						}
					]
				},
				{
					type: 'text',
					value: '\n      '
				}
			]
		},
		{
			type: 'text',
			value: '\n    '
		}
	]
};

const sectionB2: ASTElementNode = {
	type: 'element',
	name: 'section',
	attrs: {
		class: {
			type: 'attribute',
			name: 'class',
			value: 'container'
		}
	},
	children: [
		{
			type: 'text',
			value: '\n      '
		},
		{
			type: 'element',
			name: 'h2',
			attrs: {},
			children: [
				{
					type: 'text',
					value: 'More Attractions'
				}
			]
		},
		{
			type: 'text',
			value: '\n      '
		},
		{
			type: 'element',
			name: 'div',
			attrs: {
				class: {
					type: 'attribute',
					name: 'class',
					value: 'attractions grid vertical-flow'
				}
			},
			children: [
				{
					type: 'text',
					value: '\n        '
				},
				{
					type: 'element',
					name: 'a',
					attrs: {
						class: {
							type: 'attribute',
							name: 'class',
							value: 'attraction'
						},
						href: {
							type: 'attribute',
							name: 'href',
							value: '/sandfly-bay/'
						}
					},
					children: [
						{
							type: 'text',
							value: '\n          '
						},
						{
							type: 'element',
							name: 'div',
							attrs: {
								class: {
									type: 'attribute',
									name: 'class',
									value: 'attraction-image'
								}
							},
							children: [
								{
									type: 'text',
									value: '\n            '
								},
								{
									type: 'element',
									name: 'img',
									attrs: {
										alt: {
											type: 'attribute',
											name: 'alt',
											value: 'Sandfly Bay'
										},
										'data-cms-original-src': {
											type: 'attribute',
											name: 'data-cms-original-src',
											value: '/generated/images/sandfly-bay/700x500.jpg'
										},
										'data-cms-original-srcset': {
											type: 'attribute',
											name: 'data-cms-original-srcset',
											value: '/generated/images/sandfly-bay/700x500.jpg 700w, /generated/images/sandfly-bay/1400x1000.jpg 1400w'
										},
										height: {
											type: 'attribute',
											name: 'height',
											value: '500'
										},
										loading: {
											type: 'attribute',
											name: 'loading',
											value: 'lazy'
										},
										src: {
											type: 'attribute',
											name: 'src',
											value: '/generated/images/sandfly-bay/700x500.jpg?_cchid=763689fdeea9cd0d317f1519bdf223dd'
										},
										srcset: {
											type: 'attribute',
											name: 'srcset',
											value: '\n                /generated/images/sandfly-bay/700x500.jpg?_cchid=763689fdeea9cd0d317f1519bdf223dd    700w,\n                /generated/images/sandfly-bay/1400x1000.jpg?_cchid=704b670831e056df3cb00447d5dbfb5a 1400w\n              '
										},
										width: {
											type: 'attribute',
											name: 'width',
											value: '700'
										}
									},
									children: []
								},
								{
									type: 'text',
									value: '\n          '
								}
							]
						},
						{
							type: 'text',
							value: '\n\n          '
						},
						{
							type: 'element',
							name: 'div',
							attrs: {
								class: {
									type: 'attribute',
									name: 'class',
									value: 'attraction-details'
								}
							},
							children: [
								{
									type: 'text',
									value: '\n            '
								},
								{
									type: 'element',
									name: 'h3',
									attrs: {},
									children: [
										{
											type: 'text',
											value: 'Sandfly Bay'
										}
									]
								},
								{
									type: 'text',
									value: '\n\n            '
								},
								{
									type: 'element',
									name: 'ul',
									attrs: {
										class: {
											type: 'attribute',
											name: 'class',
											value: 'badges'
										}
									},
									children: [
										{
											type: 'text',
											value: '\n              '
										},
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
										},
										{
											type: 'text',
											value: '\n\n              '
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
											value: '\n\n              '
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
													value: 'wildlife'
												}
											]
										},
										{
											type: 'text',
											value: '\n            '
										}
									]
								},
								{
									type: 'text',
									value: '\n\n            '
								},
								{
									type: 'element',
									name: 'p',
									attrs: {},
									children: [
										{
											type: 'text',
											value: '\n              Peninsula beach with magnificent views, large sand dunes, local\n              wildlife and a short walk.\n            '
										}
									]
								},
								{
									type: 'text',
									value: '\n          '
								}
							]
						},
						{
							type: 'text',
							value: '\n        '
						}
					]
				},
				{
					type: 'text',
					value: '\n\n        '
				},
				{
					type: 'element',
					name: 'a',
					attrs: {
						class: {
							type: 'attribute',
							name: 'class',
							value: 'attraction'
						},
						href: {
							type: 'attribute',
							name: 'href',
							value: '/victory-beach/'
						}
					},
					children: [
						{
							type: 'text',
							value: '\n          '
						},
						{
							type: 'element',
							name: 'div',
							attrs: {
								class: {
									type: 'attribute',
									name: 'class',
									value: 'attraction-image'
								}
							},
							children: [
								{
									type: 'text',
									value: '\n            '
								},
								{
									type: 'element',
									name: 'img',
									attrs: {
										alt: {
											type: 'attribute',
											name: 'alt',
											value: 'Victory Beach'
										},
										'data-cms-original-src': {
											type: 'attribute',
											name: 'data-cms-original-src',
											value: '/generated/images/victory-beach/700x500.jpg'
										},
										'data-cms-original-srcset': {
											type: 'attribute',
											name: 'data-cms-original-srcset',
											value: '/generated/images/victory-beach/700x500.jpg 700w, /generated/images/victory-beach/1400x1000.jpg 1400w'
										},
										height: {
											type: 'attribute',
											name: 'height',
											value: '500'
										},
										loading: {
											type: 'attribute',
											name: 'loading',
											value: 'lazy'
										},
										src: {
											type: 'attribute',
											name: 'src',
											value: '/generated/images/victory-beach/700x500.jpg?_cchid=44179a22e35b4a3fcf6350aadbee9a81'
										},
										srcset: {
											type: 'attribute',
											name: 'srcset',
											value: '\n                /generated/images/victory-beach/700x500.jpg?_cchid=44179a22e35b4a3fcf6350aadbee9a81    700w,\n                /generated/images/victory-beach/1400x1000.jpg?_cchid=17e732fd99833f9de1fbfedca07bfd23 1400w\n              '
										},
										width: {
											type: 'attribute',
											name: 'width',
											value: '700'
										}
									},
									children: []
								},
								{
									type: 'text',
									value: '\n          '
								}
							]
						},
						{
							type: 'text',
							value: '\n\n          '
						},
						{
							type: 'element',
							name: 'div',
							attrs: {
								class: {
									type: 'attribute',
									name: 'class',
									value: 'attraction-details'
								}
							},
							children: [
								{
									type: 'text',
									value: '\n            '
								},
								{
									type: 'element',
									name: 'h3',
									attrs: {},
									children: [
										{
											type: 'text',
											value: 'Victory Beach'
										}
									]
								},
								{
									type: 'text',
									value: '\n\n            '
								},
								{
									type: 'element',
									name: 'ul',
									attrs: {
										class: {
											type: 'attribute',
											name: 'class',
											value: 'badges'
										}
									},
									children: [
										{
											type: 'text',
											value: '\n              '
										},
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
										},
										{
											type: 'text',
											value: '\n\n              '
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
											value: '\n\n              '
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
													value: 'wildlife'
												}
											]
										},
										{
											type: 'text',
											value: '\n            '
										}
									]
								},
								{
									type: 'text',
									value: '\n\n            '
								},
								{
									type: 'element',
									name: 'p',
									attrs: {},
									children: [
										{
											type: 'text',
											value: '\n              Remote beach on the Otago Peninsula. Nearby natural pyramids\n              provide extraordinary panoramic views.\n            '
										}
									]
								},
								{
									type: 'text',
									value: '\n          '
								}
							]
						},
						{
							type: 'text',
							value: '\n        '
						}
					]
				},
				{
					type: 'text',
					value: '\n      '
				}
			]
		},
		{
			type: 'text',
			value: '\n    '
		}
	]
};

test('sectionA1 and sectionA2', (t: ExecutionContext) =>
	runTest(t, {
		currentTree: [sectionA1],
		otherTree: [sectionA2],
		isBestMatch: true,
		isAboveLoopThreshold: true,
		score: 1
	}));

test('sectionA1 and sectionB1', (t: ExecutionContext) =>
	runTest(t, {
		currentTree: [sectionA1],
		otherTree: [sectionB1],
		isBestMatch: true,
		isAboveLoopThreshold: false,
		score: 0.86
	}));

test('sectionA2 and sectionB2', (t: ExecutionContext) =>
	runTest(t, {
		currentTree: [sectionA2],
		otherTree: [sectionB2],
		isBestMatch: true,
		isAboveLoopThreshold: false,
		score: 0.86
	}));
