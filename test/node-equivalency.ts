import test, {ExecutionContext} from 'ava';
import { isBestMatch, nodeEquivalencyScore } from '../src/helpers/node-equivalency';
import { Node, Text } from 'angular-html-parser/lib/compiler/src/ml_parser/ast';

interface TestDefinition {
    name: string;
    current: Node;
    other: Node;
    currentTree: Node[];
    otherTree: Node[];
    isBestMatch: boolean;
    score: number;
}

const textNode = (text: string) : Node => ({ type: 'text', value: text } as Text);

const tests = [
    {
        name: 'same',
        current: textNode('a'),
        other: textNode('a'),
        currentTree: [],
        otherTree: [],
        isBestMatch: true,
        score: 1
    },
    {
        name: 'just as good',
        current: textNode('a'),
        other: textNode('b'),
        currentTree: [textNode('c')],
        otherTree: [],
        isBestMatch: true,
        score: 0.5
    },
    {
        name: 'later',
        current: textNode('a'),
        other: textNode('b'),
        currentTree: [textNode('b')],
        otherTree: [],
        isBestMatch: false,
        score: 0.5
    },
    {
        name: 'even later',
        current: textNode('a'),
        other: textNode('b'),
        currentTree: [textNode('c'), textNode('b')],
        otherTree: [],
        isBestMatch: false,
        score: 0.5
    },
    {
        name: 'text to element comparison',
        current: textNode('a'),
        other: { type: 'element', name: 'div' },
        currentTree: [],
        otherTree: [],
        isBestMatch: false,
        score: 0
    },
    {
        name: 'element to text comparison',
        current: { type: 'element', name: 'div' },
        other: textNode('a'),
        currentTree: [],
        otherTree: [],
        isBestMatch: false,
        score: 0
    },
    {
        name: 'div to section comparison',
        current:  {
            name: 'div',
            type: 'element',
            attrs: [],
            children: [],
        },
        other: {
            name: 'section',
            type: 'element',
            attrs: [],
            children: [],
        },
        currentTree: [],
        otherTree: [],
        isBestMatch: false,
        score: 0
    },
    {
        name: 'a to a[target] comparison',
        current: {
            name: 'a',
            type: 'element',
            attrs: [{
                type: 'attribute',
                name: 'href',
                value: 'https://google.com'
            }, {
                type: 'attribute',
                name: 'target',
                value: '_blank'
            }],
            children: [],
        },
        other: {
            name: 'a',
            type: 'element',
            attrs: [{
                type: 'attribute',
                name: 'href',
                value: 'https://duckduckgo.com'
            }, {
                type: 'attribute',
                name: 'rel',
                value: 'noopener'
            }],
            children: [],
        },
        currentTree: [],
        otherTree: [],
        isBestMatch: true,
        score: 0.85
    },
    {
        name: 'li.badge.badge-green to li.badge.badge-navy comparison',
        current: {
            name: 'li',
            type: 'element',
            attrs: [{
                type: 'attribute',
                name: 'class',
                value: 'badge badge-green'
            }],
            children: [],
        },
        other: {
            name: 'li',
            type: 'element',
            attrs: [{
                type: 'attribute',
                name: 'class',
                value: 'badge badge-navy'
            }],
            children: [],
        },
        currentTree: [],
        otherTree: [],
        isBestMatch: true,
        score: 0.97
    },
    {
        name: 'li.badge-green.badge to li.badge.badge-navy comparison',
        current: {
            name: 'li',
            type: 'element',
            attrs: [{
                type: 'attribute',
                name: 'class',
                value: 'badge-green badge'
            }],
            children: [],
        },
        other: {
            name: 'li',
            type: 'element',
            attrs: [{
                type: 'attribute',
                name: 'class',
                value: 'badge badge-navy'
            }],
            children: [],
        },
        currentTree: [],
        otherTree: [],
        isBestMatch: true,
        score: 0.97
    },
    {
        name: 'img - different alt',
        current:  {
            name: 'img',
            type: 'element',
            attrs: [
                {
                    name: 'src',
                    type: 'attribute',
                    value: 'assets/goose.jpg',
                },
                {
                    name: 'alt',
                    type: 'attribute',
                    value: 'Our goose',
                },
            ],
            children: [],
        },
        other: {
            name: 'img',
            type: 'element',
            attrs: [
                {
                    name: 'src',
                    type: 'attribute',
                    value: 'assets/goose.jpg',
                },
                {
                    name: 'alt',
                    type: 'attribute',
                    value: 'Their goose',
                },
            ],
            children: [],
        },
        currentTree: [],
        otherTree: [],
        isBestMatch: true,
        score: 0.98
    },
    {
        name: 'ul to the same ul',
        current: {
            type: 'element',
            name: 'ul',
            attrs: [ { type: 'attribute', name: 'class', value: 'badges' } ],
            children: []
        },
        other: {
            type: 'element',
            name: 'ul',
            attrs: [ { type: 'attribute', name: 'class', value: 'badges' } ],
            children: []
        },
        currentTree: [],
        otherTree: [],
        isBestMatch: true,
        score: 1
    }
] as TestDefinition[];
  
tests.forEach((def: TestDefinition) => {
    test(def.name, async (t: ExecutionContext) => {
        t.is(Math.round(nodeEquivalencyScore(def.current, def.other) * 100) / 100, def.score);
        t.is(isBestMatch(def.current, def.other, def.currentTree, def.otherTree), def.isBestMatch);
    });
})