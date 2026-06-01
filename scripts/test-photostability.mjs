import assert from 'node:assert/strict';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import ts from 'typescript';

const source = readFileSync(new URL('../src/photostability.ts', import.meta.url), 'utf8');
const compiled = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.ES2022,
    target: ts.ScriptTarget.ES2020,
  },
});

const outDir = join(tmpdir(), 'gevibench-tests');
mkdirSync(outDir, { recursive: true });
const outFile = join(outDir, 'photostability.mjs');
writeFileSync(outFile, compiled.outputText);

const {
  normalizePhotostability,
  parseDurationMinutes,
  parseIlluminationMwPerMm2,
} = await import(pathToFileURL(outFile).href + `?t=${Date.now()}`);

const near = (actual, expected, tolerance = 0.05) => {
  assert.ok(
    Math.abs(actual - expected) <= tolerance,
    `expected ${actual} to be within ${tolerance} of ${expected}`,
  );
};

assert.equal(parseIlluminationMwPerMm2('3 W/cm²'), 30);
assert.equal(parseIlluminationMwPerMm2('3 W/cm2'), 30);
assert.equal(parseIlluminationMwPerMm2('3000 mW/cm²'), 30);
assert.equal(parseIlluminationMwPerMm2('0.1 W/mm²'), 100);
assert.equal(parseIlluminationMwPerMm2('100 mW/mm²'), 100);
assert.equal(parseIlluminationMwPerMm2('20 uW/mm²'), 0.02);
assert.equal(parseIlluminationMwPerMm2('20 µW/mm²'), 0.02);
assert.equal(parseIlluminationMwPerMm2('20 uW at 480 nm'), null);
assert.equal(parseIlluminationMwPerMm2('1400 mW/mm² red + 220 mW/mm² blue'), null);

assert.equal(parseDurationMinutes('769 s'), 769 / 60);
assert.equal(parseDurationMinutes('102 sec'), 102 / 60);
assert.equal(parseDurationMinutes('1.5 min'), 1.5);
assert.equal(parseDurationMinutes('2 minutes'), 2);
assert.equal(parseDurationMinutes('~42 min'), 42);

near(normalizePhotostability({
  brightnessRemaining: 75,
  illumination: '3 W/cm²',
  duration: '769 s',
}), 92.79);

near(normalizePhotostability({
  brightnessRemaining: 75,
  illumination: '3 W/cm²',
  duration: '38 s',
}), 21.98);

near(normalizePhotostability({
  brightnessRemaining: 75,
  illumination: '3 W/cm²',
  duration: '102 s',
}), 56.88);

assert.equal(normalizePhotostability({
  brightnessRemaining: 75,
  illumination: '20 uW at 480 nm',
  duration: '2.2 min',
}), null);

console.log('photostability tests passed');
