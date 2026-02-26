import { test } from 'node:test';
import * as assert from 'node:assert/strict';
import HugoExportEngine from '../src/export-engines/hugo.ts';
import { ASTElementNode } from '../src/types.ts';

const engine = new HugoExportEngine();

test('script elements should be preserved', () => {
	const scriptNode: ASTElementNode = {
		type: 'element',
		name: 'script',
		attrs: {
			src: { type: 'attribute', name: 'src', value: '/app.js' }
		},
		children: []
	};
	const result = engine.renderASTNode(scriptNode, '.Params.');
	assert.ok(!result.includes('<!--'), 'Script tags should not be replaced with comments');
	assert.ok(result.includes('<script'), 'Script tags should be preserved');
	assert.ok(result.includes('</script>'), 'Script tags should have closing tags');
});

test('inline script elements should preserve content', () => {
	const scriptNode: ASTElementNode = {
		type: 'element',
		name: 'script',
		attrs: {},
		children: [{ type: 'text', value: 'console.log("hello");' }]
	};
	const result = engine.renderASTNode(scriptNode, '.Params.');
	assert.ok(result.includes('console.log'), 'Script content should be preserved');
	assert.ok(!result.includes('<!--'), 'Script should not be commented out');
});

test('source element should be void (no closing tag)', () => {
	const sourceNode: ASTElementNode = {
		type: 'element',
		name: 'source',
		attrs: {
			srcset: { type: 'attribute', name: 'srcset', value: 'image.webp' },
			type: { type: 'attribute', name: 'type', value: 'image/webp' }
		},
		children: []
	};
	const result = engine.renderASTNode(sourceNode, '.Params.');
	assert.ok(!result.includes('</source>'), 'Source should not have closing tag');
	assert.ok(result.startsWith('<source'), 'Source element should be rendered');
});

test('br element should be void (no closing tag)', () => {
	const brNode: ASTElementNode = {
		type: 'element',
		name: 'br',
		attrs: {},
		children: []
	};
	const result = engine.renderASTNode(brNode, '.Params.');
	assert.ok(!result.includes('</br>'), 'BR should not have closing tag');
});

test('hr element should be void (no closing tag)', () => {
	const hrNode: ASTElementNode = {
		type: 'element',
		name: 'hr',
		attrs: {},
		children: []
	};
	const result = engine.renderASTNode(hrNode, '.Params.');
	assert.ok(!result.includes('</hr>'), 'HR should not have closing tag');
});

test('input element should be void (no closing tag)', () => {
	const inputNode: ASTElementNode = {
		type: 'element',
		name: 'input',
		attrs: {
			type: { type: 'attribute', name: 'type', value: 'text' },
			name: { type: 'attribute', name: 'name', value: 'email' }
		},
		children: []
	};
	const result = engine.renderASTNode(inputNode, '.Params.');
	assert.ok(!result.includes('</input>'), 'Input should not have closing tag');
});

test('embed element should be void (no closing tag)', () => {
	const embedNode: ASTElementNode = {
		type: 'element',
		name: 'embed',
		attrs: {
			src: { type: 'attribute', name: 'src', value: 'file.pdf' },
			type: { type: 'attribute', name: 'type', value: 'application/pdf' }
		},
		children: []
	};
	const result = engine.renderASTNode(embedNode, '.Params.');
	assert.ok(!result.includes('</embed>'), 'Embed should not have closing tag');
});

test('wbr element should be void (no closing tag)', () => {
	const wbrNode: ASTElementNode = {
		type: 'element',
		name: 'wbr',
		attrs: {},
		children: []
	};
	const result = engine.renderASTNode(wbrNode, '.Params.');
	assert.ok(!result.includes('</wbr>'), 'WBR should not have closing tag');
});

test('picture element with source children renders correctly', () => {
	const pictureNode: ASTElementNode = {
		type: 'element',
		name: 'picture',
		attrs: {},
		children: [
			{
				type: 'element',
				name: 'source',
				attrs: {
					srcset: { type: 'attribute', name: 'srcset', value: 'photo.avif' },
					type: { type: 'attribute', name: 'type', value: 'image/avif' }
				},
				children: []
			},
			{
				type: 'element',
				name: 'source',
				attrs: {
					srcset: { type: 'attribute', name: 'srcset', value: 'photo.webp' },
					type: { type: 'attribute', name: 'type', value: 'image/webp' }
				},
				children: []
			},
			{
				type: 'element',
				name: 'img',
				attrs: {
					src: { type: 'attribute', name: 'src', value: 'photo.jpg' },
					alt: { type: 'attribute', name: 'alt', value: 'A photo' }
				},
				children: []
			}
		]
	};
	const result = engine.renderASTNode(pictureNode, '.Params.');
	assert.ok(!result.includes('</source>'), 'Source inside picture should not have closing tag');
	assert.ok(!result.includes('</img>'), 'Img inside picture should not have closing tag');
	assert.ok(result.includes('</picture>'), 'Picture should have closing tag');
});
