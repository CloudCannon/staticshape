import test, {ExecutionContext} from 'ava';
import { isBestMatch, nodeEquivalencyScore } from '../src/helpers/node-equivalency';
import { ASTNode, ASTTextNode } from '../src/types';

interface TestDefinition {
    current: ASTNode;
    other: ASTNode;
    currentTree: ASTNode[];
    otherTree: ASTNode[];
    isBestMatch: boolean;
    score: number;
}

const textNode = (text: string) : ASTNode => ({ type: 'text', value: text } as ASTTextNode);

async function runTest(t: ExecutionContext, def: TestDefinition) {
    t.is(Math.round(nodeEquivalencyScore(def.current, def.other) * 100) / 100, def.score);
    t.is(Math.round(nodeEquivalencyScore(def.other, def.current) * 100) / 100, def.score);
    t.is(isBestMatch(def.current, def.other, def.currentTree, def.otherTree), def.isBestMatch);
}

test('same', (t: ExecutionContext) => runTest(t, {
    current: textNode('a'),
    other: textNode('a'),
    currentTree: [],
    otherTree: [],
    isBestMatch: true,
    score: 1
}));

test('just as good', (t: ExecutionContext) => runTest(t, {
    current: textNode('a'),
    other: textNode('b'),
    currentTree: [textNode('c')],
    otherTree: [],
    isBestMatch: true,
    score: 0.5
}));

test('later', (t: ExecutionContext) => runTest(t, {
    current: textNode('a'),
    other: textNode('b'),
    currentTree: [textNode('b')],
    otherTree: [],
    isBestMatch: false,
    score: 0.5
}));

test('even later', (t: ExecutionContext) => runTest(t, {
    current: textNode('a'),
    other: textNode('b'),
    currentTree: [textNode('c'), textNode('b')],
    otherTree: [],
    isBestMatch: false,
    score: 0.5
}));

test('text to element comparison', (t: ExecutionContext) => runTest(t, {
    current: textNode('a'),
    other: { type: 'element', name: 'div', attrs: {}, children: [] },
    currentTree: [],
    otherTree: [],
    isBestMatch: false,
    score: 0
}));

test('element to text comparison', (t: ExecutionContext) => runTest(t, {
    current: { type: 'element', name: 'div', attrs: {}, children: [] },
    other: textNode('a'),
    currentTree: [],
    otherTree: [],
    isBestMatch: false,
    score: 0
}));

test('div to section comparison', (t: ExecutionContext) => runTest(t, {
    current:  {
        name: 'div',
        type: 'element',
        attrs: {},
        children: [],
    },
    other: {
        name: 'section',
        type: 'element',
        attrs: {},
        children: [],
    },
    currentTree: [],
    otherTree: [],
    isBestMatch: false,
    score: 0
}));

test('a to a[target] comparison', (t: ExecutionContext) => runTest(t, {
    current: {
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
        children: [],
    },
    other: {
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
        children: [],
    },
    currentTree: [],
    otherTree: [],
    isBestMatch: true,
    score: 0.85
}));

test('li.badge.badge-green to li.badge.badge-navy comparison', (t: ExecutionContext) => runTest(t, {
    current: {
        name: 'li',
        type: 'element',
        attrs: {
            class: {
                type: 'attribute',
                name: 'class',
                value: 'badge badge-green'
            }
        },
        children: [],
    },
    other: {
        name: 'li',
        type: 'element',
        attrs: {
            class: {
                type: 'attribute',
                name: 'class',
                value: 'badge badge-navy'
            }
        },
        children: [],
    },
    currentTree: [],
    otherTree: [],
    isBestMatch: true,
    score: 0.97
}));

test('img - different alt', (t: ExecutionContext) => runTest(t, {
    current:  {
        name: 'img',
        type: 'element',
        attrs: {
            src: {
                name: 'src',
                type: 'attribute',
                value: 'assets/goose.jpg',
            },
            alt: {
                name: 'alt',
                type: 'attribute',
                value: 'Our goose',
            },
        },
        children: [],
    },
    other: {
        name: 'img',
        type: 'element',
        attrs: {
            src: {
                name: 'src',
                type: 'attribute',
                value: 'assets/goose.jpg',
            },
            alt: {
                name: 'alt',
                type: 'attribute',
                value: 'Their goose',
            },
        },
        children: [],
    },
    currentTree: [],
    otherTree: [],
    isBestMatch: true,
    score: 0.98
}));

test('ul to the same ul', (t: ExecutionContext) => runTest(t, {
    current: {
        type: 'element',
        name: 'ul',
        attrs: {
            class: { type: 'attribute', name: 'class', value: 'badges' }
        },
        children: []
    },
    other: {
        type: 'element',
        name: 'ul',
        attrs: {
            class: { type: 'attribute', name: 'class', value: 'badges' }
        },
        children: []
    },
    currentTree: [],
    otherTree: [],
    isBestMatch: true,
    score: 1
}));
