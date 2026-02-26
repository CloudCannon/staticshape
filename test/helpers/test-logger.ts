import { Level, Logger } from '../../src/logger.ts';

export class TestLogger extends Logger {
	constructor(defaultLogLevel: Level = 1) {
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
