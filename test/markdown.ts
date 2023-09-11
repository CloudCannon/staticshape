import test, { ExecutionContext } from 'ava';
import { isMarkdownTree } from '../src/helpers/markdown';
import htmlToAST from '../src/helpers/html-parser';
import * as fs from 'fs';
import { ASTElementNode, ASTTextNode } from '../src/types';

const whitespaceNode: ASTTextNode = {
	type: 'text',
	value: '\n\t'
};

async function runTest(t: ExecutionContext, testName: string) {
	const html = (await fs.promises.readFile(`./test/fixtures/markdown/${testName}.html`)).toString(
		'utf-8'
	);

	const { layout } = htmlToAST(html, {});

	const htmlEl = layout.find(
		(node) => node.type === 'element' && node.name === 'html'
	) as ASTElementNode;
	const bodyEl = htmlEl.children.find(
		(node) => node.type === 'element' && node.name === 'body'
	) as ASTElementNode;

	const ast = bodyEl.children;
	t.deepEqual(isMarkdownTree(ast), true);
	t.deepEqual(isMarkdownTree([whitespaceNode, ...ast]), true, 'whitespace before');
	t.deepEqual(isMarkdownTree([...ast, whitespaceNode]), true, 'whitespace after');
	t.deepEqual(
		isMarkdownTree([whitespaceNode, ...ast, whitespaceNode]),
		true,
		'whitespace before and after'
	);
}

test('ul', (t: ExecutionContext) => runTest(t, 'ul'));
