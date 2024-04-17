const { readFile, writeFile } = require('node:fs/promises');
const { resolve } = require('node:path');
const { exec } = require('node:child_process');

async function getPackageVersion() {
	const packageJson = await readFile(resolve(__dirname, 'package.json'), 'utf8');
	return JSON.parse(packageJson).version;
}

async function asyncExec(command) {
	return new Promise((resolve, reject) => {
		exec(command, (error, stdout, stderr) => {
			if (error) return reject(error);
			return resolve(stdout);
		});
	});
}

async function getGitVersion() {
	try {
		return ((await asyncExec('git describe --tags --dirty')).trim());
	} catch (error) {
		return null;
	}
}

async function run() {
	let version = await getGitVersion() ?? await getPackageVersion();
	if (version == null) throw new Error("Couldn't get version");
	await writeFile(resolve(__dirname, 'lib/version.ts'),
		`const version = '${version}';\nexport default version;\n`);
}

run();
