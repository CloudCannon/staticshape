#!/usr/bin/env node --experimental-specifier-resolution=node
import * as p from '@clack/prompts';
import * as path from 'path';
import * as fs from 'fs';
import Site from './site';
import Exporter, { Engine } from './exporter';
import { Logger } from './logger';

async function main() {
    p.intro('Welcome to the StaticShape');

const sourcePath = await getSourcePath();
const absoluteSourcePath = path.resolve(sourcePath);
p.log.success(`Input set to ${absoluteSourcePath}`);

let configPath = await getConfigPath();
configPath = await createDefaultConfig(absoluteSourcePath);

const absoluteConfigPath = path.resolve(configPath.toString());
validateConfig(absoluteConfigPath);
p.log.success(`Config set to ${absoluteConfigPath}`);

const outputPath = await getOutputPath();
const absoluteOutputPath = path.resolve(outputPath);
p.log.success(`Output set to ${absoluteOutputPath}`);

    const exportEngine = await getExportEngine();
    await processSite(absoluteSourcePath, absoluteConfigPath, absoluteOutputPath, exportEngine);

    p.outro('All done');
}

async function getSourcePath() {
    const sourcePath = await p.text({
        message: 'What folder contains your static site?',
        placeholder: './_site/',
        validate(sourcePath) {
            if (sourcePath.length === 0) return 'Source path is required!';
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
    return sourcePath;
}

async function getConfigPath() {
    return await p.text({
        message: 'Where is your staticshape config file? Or press ENTER to create a default configuration file.',
        placeholder: './example.json',
        initialValue: ''
    });
}

async function createDefaultConfig(absoluteSourcePath: string) {
	const defaultConfig = {
		collections: [{ name: 'pages', include: ["index.html", "test/index.html"] }]
	};
	const defaultConfigPath = path.join(absoluteSourcePath, 'config.json');
	if (!fs.existsSync(defaultConfigPath)) {
		await fs.promises.writeFile(defaultConfigPath, JSON.stringify(defaultConfig, null, 2));
	}
	p.log.success(`No config file found. Created default config at ${defaultConfigPath}`);
	return defaultConfigPath;
}

function validateConfig(absoluteConfigPath: string) {
    try {
        const stat = fs.statSync(absoluteConfigPath);
        if (stat.isDirectory()) {
            throw new Error(`${absoluteConfigPath} is not a file`);
        }
        JSON.parse(fs.readFileSync(absoluteConfigPath, 'utf-8'));
    } catch (error: any) {
        console.error(`Config validation failed: ${error.message}`);
        process.exit(1);
    }
}

async function getOutputPath() {
    const outputPath = await p.text({
        message: 'What folder should we output your SSG site?',
        placeholder: './_output/',
        validate(outputPath) {
            if (outputPath.length === 0) return 'Output path is required!';
            if (!outputPath.startsWith('./')) return 'Output path must be relative';
            if (path.normalize(outputPath).includes('..')) return 'Output path must be relative';

            const absoluteOutputPath = path.resolve(outputPath);
            try {
                const stat = fs.statSync(absoluteOutputPath);
                if (!stat.isDirectory()) {
                    return `${absoluteOutputPath} is not a directory`;
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
    return outputPath;
}

async function getExportEngine() {
    const exportEngine = await p.select({
        message: 'What SSG would you like to use?',
        initialValue: 'hugo',
        options: [
            { value: '11ty', label: '11ty' },
            { value: 'astro', label: 'Astro' },
            { value: 'hugo', label: 'Hugo' },
            { value: 'jekyll', label: 'Jekyll' }
        ]
    });

    if (p.isCancel(exportEngine)) {
        p.cancel('Site scrape cancelled.');
        process.exit(0);
    }
    return exportEngine;
}

async function processSite(
	absoluteSourcePath: string,
	absoluteConfigPath: string,
	absoluteOutputPath: string,
	exportEngine: string
) {
    const s = p.spinner();
    s.start(`Loading ${absoluteConfigPath}`);
    const config = JSON.parse(await fs.promises.readFile(absoluteConfigPath, 'utf-8'));
    s.stop(`Loaded ${absoluteConfigPath}`);

    s.start(`Building site`);
    const site = new Site({
        basePath: absoluteSourcePath,
        ...config,
        logger: new Logger(absoluteOutputPath)
    });

    const siteResponse = await site.build();
    s.stop(`Site built`);

    s.start(`Exporting site`);
    const exporter = new Exporter({
        sourceBasePath: absoluteSourcePath,
        exportBasePath: absoluteOutputPath,
        siteResponse: siteResponse,
        engine: exportEngine as Engine
    });

    await exporter.run();
    s.stop(`Site exported`);
}

main().catch(err => {
    console.error(`An error occurred: ${err}`);
    process.exit(1);
});
