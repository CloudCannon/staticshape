import { test } from 'node:test';
import * as assert from 'node:assert/strict';
import { isMarkdownTree } from '../src/helpers/markdown.ts';
import htmlToAST from '../src/helpers/html-parser.ts';
import * as fs from 'fs';
import { ASTElementNode, ASTTextNode } from '../src/types.ts';

const whitespaceNode: ASTTextNode = {
	type: 'text',
	value: '\n\t'
};

async function runTest(testName: string) {
	const html = (await fs.promises.readFile(`./test/fixtures/markdown/${testName}.html`)).toString(
		'utf-8'
	);

	const { layout } = htmlToAST(html, {}, {});

	const htmlEl = layout.find(
		(node) => node.type === 'element' && node.name === 'html'
	) as ASTElementNode;
	const bodyEl = htmlEl.children.find(
		(node) => node.type === 'element' && node.name === 'body'
	) as ASTElementNode;

	const ast = bodyEl.children;
	assert.deepStrictEqual(isMarkdownTree(ast), true);
	assert.deepStrictEqual(isMarkdownTree([whitespaceNode, ...ast]), true, 'whitespace before');
	assert.deepStrictEqual(isMarkdownTree([...ast, whitespaceNode]), true, 'whitespace after');
	assert.deepStrictEqual(
		isMarkdownTree([whitespaceNode, ...ast, whitespaceNode]),
		true,
		'whitespace before and after'
	);
}

test('ul', () => runTest('ul'));
