import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';

async function files(dir) {
  return (await readdir(dir, { withFileTypes: true })).flatMap((entry) =>
    entry.isDirectory() ? files(join(dir, entry.name)) : [join(dir, entry.name)]);
}
const output = await Promise.all((await files('dist')).map((path) => readFile(path, 'utf8').catch(() => '')));
if (output.some((content) => content.includes('localhost') || /VITE_.*(?:KEY|SECRET)/.test(content))) {
  throw new Error('Production build contains localhost or a secret-like VITE variable');
}
console.log('Production frontend check passed');
