import * as path from 'path';
import * as fs from 'fs';
import { ASTNode } from './types';

export type Level = number;
const levels: Record<string, Level> = {
	debug: 4,
	log: 3,
	warn: 2,
	error: 1
};

const prefixes: Record<string, string> = {
	debug: '[debug]',
	log: '>',
	warn: '🛑 warning',
	error: '❌ Error'
};

type loggableObjects = number | string | boolean;

export class Logger {
	level: Level;
	logs: string[];
	round: number;
	namespace: string;
	outputPath: string;
	constructor(outputPath: string, defaultLogLevel: Level = 3) {
		const environmentLogLevel = parseInt(process.env.LOG_LEVEL || '', 10);
		this.outputPath = outputPath;
		this.level = environmentLogLevel || defaultLogLevel;
		this.logs = [];
		this.round = 1;
		this.namespace = 'init';
	}

	addLog(levelName: string, ...messages: loggableObjects[]) {
		const level = levels[levelName];
		if (level && this.level >= level) {
			const prefix = prefixes[levelName];
			this.printLog(`${prefix} ${messages.join(' ')}`);
		}
	}

	printLog(message: string) {
		this.logs.push(message);
	}

	debug(...messages: loggableObjects[]) {
		this.addLog('debug', ...messages);
	}

	log(...messages: loggableObjects[]) {
		this.addLog('log', ...messages);
	}

	warn(...messages: loggableObjects[]) {
		this.addLog('warn', ...messages);
	}

	error(...messages: loggableObjects[]) {
		this.addLog('error', ...messages);
	}

	async setNamespace(namespace: string) {
		await this.rotateLog();
		this.namespace = namespace;
	}

	async rotateLog() {
		if (this.logs.length > 0) {
			await this.writeLog('logs.txt', this.logs.join('\n'));
			this.logs = [];
			this.round += 1;
		}
	}

	async writeLog(filename: string, contents: string) {
		const logFilename = path.join(
			this.outputPath,
			'.debug',
			this.namespace,
			this.round.toString(),
			filename
		);
		await fs.promises.mkdir(path.dirname(logFilename), { recursive: true });
		await fs.promises.writeFile(logFilename, contents);
	}
}
export function nodeDebugString(node: ASTNode, depth = 0, maxDepth = 1): string {
	switch (node.type) {
		case 'content':
			return `{{ ${node.type} }}`;
		case 'variable':
		case 'markdown-variable':
		case 'conditional':
		case 'loop':
			return `${node.type}: ${node.reference}`;
		case 'comment':
		case 'cdata':
		case 'text':
		case 'doctype':
			return `${node.type}: ${JSON.stringify(node.value)}`;
		case 'element':
			let attrs = Object.values(node.attrs)
				.filter((attr) => !!attr)
				.map((attr) => {
					if (attr.type === 'attribute') {
						return `${attr.name}=${JSON.stringify(attr.value)}`;
					}
					return `${attr.name}="{{ ${attr.reference.join('.')} }}"`;
				})
				.join(' ');
			if (attrs.length > 0) {
				attrs = ` ${attrs}`;
			}

			let children = '';
			if (node.children.length > 0 && maxDepth !== 0) {
				const indent = `\n${'  '.repeat(depth + 1)}⤷ `;
				if (depth > maxDepth) {
					children = `${indent}[${node.children.length} filtered]`;
				} else {
					children = node.children
						.map((child) => `${indent}${nodeDebugString(child, depth + 1, maxDepth)}`)
						.join('');
				}
			}

			return `<${node.name}${attrs}${children ? '' : ' /'}>${children}`;
		default:
			break;
	}
	return JSON.stringify(node);
}
export function nodeListDebugString(nodes: ASTNode[], depth = 0, maxDepth = 1): string {
	return nodes
		.map((node, index) => {
			return `${index} → ${nodeDebugString(node, depth, maxDepth)}`;
		})
		.join('\n');
}
