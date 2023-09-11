import test, { ExecutionContext } from 'ava';
import { isBestMatch, nodeEquivalencyScore } from '../src/helpers/node-equivalency';
import { ASTNode, ASTTextNode } from '../src/types';

interface TestDefinition {
	currentTree: ASTNode[];
	otherTree: ASTNode[];
	isBestMatch: boolean;
	score: number;
}

const textNode = (text: string): ASTNode => ({ type: 'text', value: text }) as ASTTextNode;

async function runTest(t: ExecutionContext, def: TestDefinition) {
	t.is(
		Math.round(nodeEquivalencyScore(def.currentTree[0], def.otherTree[0]) * 100) / 100,
		def.score
	);
	t.is(
		Math.round(nodeEquivalencyScore(def.otherTree[0], def.currentTree[0]) * 100) / 100,
		def.score
	);
	t.is(isBestMatch(def.currentTree, def.otherTree), def.isBestMatch);
	t.is(isBestMatch(def.otherTree, def.currentTree), def.isBestMatch);
}

test('same', (t: ExecutionContext) =>
	runTest(t, {
		currentTree: [textNode('a')],
		otherTree: [textNode('a')],
		isBestMatch: true,
		score: 1
	}));

test('just as good', (t: ExecutionContext) =>
	runTest(t, {
		currentTree: [textNode('a'), textNode('c')],
		otherTree: [textNode('b')],
		isBestMatch: true,
		score: 0.5
	}));

test('later', (t: ExecutionContext) =>
	runTest(t, {
		currentTree: [textNode('a'), textNode('b')],
		otherTree: [textNode('b')],
		isBestMatch: false,
		score: 0.5
	}));

test('even later', (t: ExecutionContext) =>
	runTest(t, {
		currentTree: [textNode('a'), textNode('c'), textNode('b')],
		otherTree: [textNode('b')],
		isBestMatch: false,
		score: 0.5
	}));

test('text to element comparison', (t: ExecutionContext) =>
	runTest(t, {
		currentTree: [textNode('a')],
		otherTree: [{ type: 'element', name: 'div', attrs: {}, children: [] }],
		isBestMatch: false,
		score: 0
	}));

test('element to text comparison', (t: ExecutionContext) =>
	runTest(t, {
		currentTree: [{ type: 'element', name: 'div', attrs: {}, children: [] }],
		otherTree: [textNode('a')],
		isBestMatch: false,
		score: 0
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
		score: 1
	}));
