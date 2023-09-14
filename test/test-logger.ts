import { Level, Logger } from '../src/logger';

export class TestLogger extends Logger {
	constructor(defaultLogLevel: Level = 1) {
		super('', defaultLogLevel);
	}

	printLog(message: string) {
		console.log(message);
	}

	async writeLog(_filename: string, _contents: string) {}
}
