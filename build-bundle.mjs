import { build } from 'esbuild';
import fs from 'fs';
const result = await build({
    entryPoints: ['./js/tests.js'],
    bundle: true,
    format: 'esm',
    platform: 'node',
    target: 'es2022',
    write: false
});
fs.writeFileSync('/tmp/tests-bundle.mjs', result.outputFiles[0].text);
console.log('Bundle size:', result.outputFiles[0].text.length, 'bytes');
