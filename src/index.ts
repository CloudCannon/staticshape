#!/usr/bin/env node --experimental-specifier-resolution=node
import { ComponentBuilderConfig, convertElementToComponent } from './helpers/component-builder';
import { ASTElementNode } from './types';
import { htmlProcessor } from './helpers/html-parser';
import Data from './helpers/Data';
import { Logger } from './logger';

export class WebLogger extends Logger {
	constructor(defaultLogLevel = 1) {
		super('', defaultLogLevel);
	}

	printLog(message: string) {
		console.log(message);
	}

	async writeLog(filename: string, contents: string) {
		this.verbose(`🗃️ ${this.namespace} ${filename}`);
		this.verbose(contents);
	}
}

export function generateComponentFromString(
	html: string,
	config: ComponentBuilderConfig,
	logLevel = 1
): { data: Data; template: ASTElementNode } {
	const nodes = new htmlProcessor({}, {}).parse(html);
	if (nodes.length > 1) {
		throw new Error('Too many elements');
	}
	const node = nodes[0];
	if (node.type !== 'element') {
		throw new Error('Node is not an element');
	}

	return generateComponentFromASTElement(node, config, logLevel);
}

export function generateComponentFromElement(
	element: HTMLElement,
	config: ComponentBuilderConfig,
	logLevel = 1
): { data: Data; template: ASTElementNode } {
	const node = new htmlProcessor({}, {}).formatElement(element);
	if (node.type === 'content') {
		throw new Error('Found content compoment');
	}
	return generateComponentFromASTElement(node, config, logLevel);
}

export function generateComponentFromASTElement(
	node: ASTElementNode,
	config: ComponentBuilderConfig,
	logLevel = 1
): { data: Data; template: ASTElementNode } {
	const data = new Data([], {});
	const template = convertElementToComponent(
		data,
		node,
		[],
		config,
		new Data([], {}),
		new WebLogger(logLevel)
	);

	return { data, template };
}
