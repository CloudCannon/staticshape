import * as p from '@clack/prompts';
import * as path from 'path';
import * as fs from 'fs';
import Site from './site';
import Exporter, { Engine } from './exporter';

p.intro(`Welcome to the static to ssg`);

const sourcePath = await p.text({
	message: 'What folder contains your static site?',
	placeholder: './_site/',
	initialValue: '../../scrapes/dunedinattractions.nz',
	validate(sourcePath) {
		if (sourcePath.length === 0) return `Source path is required!`;

		const absoluteSourcePath = path.resolve(sourcePath);
		try {
			const stat = fs.statSync(absoluteSourcePath);

			if (!stat.isDirectory()) {
				return `${sourcePath} is not a directory`;
			}
		} catch (error: any) {
			return error.message;
		}
	}
});

if (p.isCancel(sourcePath)) {
	p.cancel('Site scrape cancelled.');
	process.exit(0);
}

const absoluteSourcePath = path.resolve(sourcePath);
p.log.success(`Input set to ${absoluteSourcePath}`);

const configPath = await p.text({
	message: 'Where is your static-to-ssg config file?',
	placeholder: './example.json',
	initialValue: '../../scrapes/dunedinattractions.json',
	validate(configPath) {
		if (configPath.length === 0) return `Config path is required!`;
		const absoluteConfigPath = path.resolve(configPath);

		try {
			const stat = fs.statSync(absoluteConfigPath);

			if (stat.isDirectory()) {
				return `${configPath} is not a file`;
			}
		} catch (error: any) {
			return error.message;
		}
	}
});

if (p.isCancel(configPath)) {
	p.cancel('Site scrape cancelled.');
	process.exit(0);
}

const absoluteConfigPath = path.resolve(configPath);
p.log.success(`Input set to ${absoluteConfigPath}`);

const outputPath = await p.text({
	message: 'What folder should we output your SSG site?',
	placeholder: './_output/',
	initialValue: './_output/',
	validate(outputPath) {
		if (outputPath.length === 0) return `Output path is required!`;
		if (!outputPath.startsWith('./')) return `Output path must be relative`;
		if (path.normalize(outputPath).includes('..')) return `Output path must be relative`;

		const absoluteOutputPath = path.resolve(outputPath);

		try {
			const stat = fs.statSync(absoluteOutputPath);

			if (!stat.isDirectory()) {
				return `${sourcePath} is not a directory`;
			}
		} catch (error: any) {
			if (error.code !== 'ENOENT') {
				return error.message;
			}
		}
	}
});

if (p.isCancel(outputPath)) {
	p.cancel('Site scrape cancelled.');
	process.exit(0);
}

const absoluteOutputPath = path.resolve(outputPath);
p.log.success(`Input set to ${absoluteOutputPath}`);

try {
	const files = await fs.promises.readdir(absoluteOutputPath);
	if (files.length > 0) {
		p.cancel(`${sourcePath} is not an empty directory`);
		process.exit(1);
	}
} catch (error: any) {
	if (error.code !== 'ENOENT') {
		p.cancel(error.message);
		process.exit(0);
	}
}

const exportEngine = await p.select({
	message: 'What SSG would you like to use?',
	initialValue: 'hugo',
	options: [
		{
			value: '11ty',
			label: '11ty'
		},
		{
			value: 'astro',
			label: 'Astro'
		},
		{
			value: 'hugo',
			label: 'Hugo'
		},
		{
			value: 'jekyll',
			label: 'Jekyll'
		}
	]
});

if (p.isCancel(exportEngine)) {
	p.cancel('Site scrape cancelled.');
	process.exit(0);
}

const s = p.spinner();
s.start(`Loading ${absoluteConfigPath}`);
const config = JSON.parse((await fs.promises.readFile(absoluteConfigPath)).toString('utf-8'));
s.stop(`Loaded ${absoluteConfigPath}`);

s.start(`Building site`);
const site = new Site({
	basePath: absoluteSourcePath,
	...config
});

const siteResponse = await site.build();
s.stop(`Site built`);

await fs.promises.writeFile('.export-debug.json', JSON.stringify(site.debug, null, '\t'));

s.start(`Exporting site`);
const exporter = new Exporter({
	sourceBasePath: absoluteSourcePath,
	exportBasePath: absoluteOutputPath,
	siteResponse: siteResponse,
	engine: exportEngine as Engine
});

await exporter.run();
s.stop(`Site exported`);

p.outro(`All done`);
