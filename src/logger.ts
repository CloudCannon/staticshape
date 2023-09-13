import { ASTNode } from './types';
import * as path from 'path';
import * as fs from 'fs';
import Document from './document';

type Level = number;
const levels: Record<string, Level> = {
	debug: 4,
	log: 3,
	warning: 2,
	error: 1
};

const prefixes: Record<string, string> = {
	debug: '[debug]',
	log: '>',
	warning: '⚠️ warning',
	error: '❌ Error'
};

type loggableObjects = number | string | boolean;

export class Logger {
	level: Level;
	logs: string[];
	round: number;
	namespace: string;
	outputPath: string;
	constructor(outputPath: string, level: Level = 3) {
		this.outputPath = outputPath;
		this.level = level;
		this.logs = [];
		this.round = 1;
		this.namespace = 'init';
	}

	addLog(levelName: string, ...messages: loggableObjects[]) {
		const level = levels[levelName];
		if (level && this.level >= level) {
			const prefix = prefixes[levelName];
			this.logs.push(`${prefix} ${messages.join(' ')}`);
		}
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
