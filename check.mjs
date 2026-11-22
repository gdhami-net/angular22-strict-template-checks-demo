// Asserts every claim the post makes. Every line it prints must say PASS.
//
//   npm run check
//
// 1. The compile table: ngc with each compiler setup (matrix/run-matrix.mjs).
// 2. ng build with the default settings, then with tsconfig.strict.json.
// 3. The built app in headless Edge, development and production builds.
import { spawnSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { runMatrix } from './matrix/run-matrix.mjs';

const root = dirname(fileURLToPath(import.meta.url));
let failures = 0;
function check(name, ok, detail = '') {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${ok || !detail ? '' : `\n      ${detail}`}`);
  if (!ok) failures++;
}
const stripAnsi = (s) => s.replace(/\u001b\[[0-9;]*m/g, '');
const relative = (s) =>
  [root, root.replaceAll('\\', '/')].reduce((t, form) => t.replaceAll(form, '.'), s);

// ---------------------------------------------------------------- 1. the table
// One entry per row of matrix/run-matrix.mjs, in the order of its SETUPS:
// default, + strictUnknownElements, + strictUnclaimedEventNames, + both flags,
// tsconfig.strict.json, + strictUnknownElementWithDirectives (the wrong name).
const S = 'silent';
const EXPECTED = {
  'forgotten-import': [S, 'error NG8001', S, 'error NG8001', 'error NG8001', S],
  'lowercase-output-typo': [S, S, S, S, S, S],
  'camelcase-output-typo': [S, S, 'error NG8030', 'error NG8030', 'error NG8030', S],
  'native-event-typo': [S, S, S, S, S, S],
  'width-number-literal': ['warning NG8119', 'warning NG8119', 'warning NG8119', 'warning NG8119', 'error NG8119', 'warning NG8119'],
  'width-number-field': [S, S, S, S, S, S],
  'schema-forgotten-import': [S, S, S, S, S, S],
  'schema-camelcase-output-typo': [S, S, 'error NG8030', 'error NG8030', 'error NG8030', S],
  'schema-custom-element-event': [S, S, S, S, S, S],
  'camelcase-dom-event': [S, S, 'error NG8030', 'error NG8030', 'error NG8030', S],
  'dashed-dom-event': [S, S, S, S, S, S],
  'case-only-typo': [S, S, S, S, S, S],
  'lowercase-typo-2': [S, S, S, S, S, S],
  'capitalised-typo': [S, S, 'error NG8030', 'error NG8030', 'error NG8030', S],
  'width-string-literal': ['warning NG8119', 'warning NG8119', 'warning NG8119', 'warning NG8119', 'error NG8119', 'warning NG8119'],
  'width-px-unit': [S, S, S, S, S, S],
  'width-zero': [S, S, S, S, S, S],
  'opacity-number': [S, S, S, S, S, S],
  'width-conditional': [S, S, S, S, S, S],
  'style-object': [S, S, S, S, S, S],
};
const SETUP_IDS = ['default', 'unknown-elements', 'unclaimed-events', 'both', 'all', 'wrong-name'];

const report = runMatrix();
check('ngc is @angular/compiler-cli 22.3.0 with TypeScript 6.0.3',
  report.compilerCli === '22.3.0' && report.typescript === '6.0.3', `${report.compilerCli} / ${report.typescript}`);
for (const row of report.table) {
  const want = EXPECTED[row.row];
  const got = SETUP_IDS.map((id) => row.cells[id]);
  check(`table row ${row.row}: ${got.join(' | ')}`, JSON.stringify(want) === JSON.stringify(got), `expected ${want.join(' | ')}`);
}
check('the table has a row for every expected binding', report.table.length === Object.keys(EXPECTED).length);
for (const id of SETUP_IDS) {
  const u = report.setups[id].unmatched;
  check(`setup ${id}: no diagnostic outside the rows`, u.length === 0, u.map((d) => `${d.file}:${d.line} ${d.code}`).join(', '));
}
const exits = SETUP_IDS.map((id) => report.setups[id].exitCode);
check(`ngc exit codes ${exits.join(', ')} (warnings alone exit 0)`, exits.join() === '0,1,1,1,1,0');

const raw = (id) => readFileSync(join(root, 'results', 'raw', `ngc-${id}.txt`), 'utf8');
check('the wrong flag name changes nothing: same ngc output as the default setup',
  raw('wrong-name') === raw('default'));
check('ngc says nothing about the unknown option name', !raw('wrong-name').includes('strictUnknownElementWithDirectives'));

const message = (id, code) => report.setups[id].diagnostics.find((d) => d.code === code)?.message.split('\n')[0];
check('NG8001 message', message('all', 'NG8001') === "'app-uploader' is not a known element:", message('all', 'NG8001'));
check('NG8030 message', message('all', 'NG8030') ===
  "Event 'draftSavd' is not emitted by any directive applied to 'app-save-button' and it isn't a known native DOM event.",
  message('all', 'NG8030'));
check('NG8119 message', (message('default', 'NG8119') ?? '').startsWith(
  "Binding a number to the CSS property 'width' will have no effect. CSS requires units for length values. " +
  `For example, use [style.width.px]="500" or [style.width]="'500px'" instead.`), message('default', 'NG8119'));

// ------------------------------------------------------------- 2. ng build
function ngBuild(configuration, file) {
  const run = spawnSync(process.execPath, [join(root, 'node_modules/@angular/cli/bin/ng.js'), 'build', '--configuration', configuration], {
    cwd: root,
    encoding: 'utf8',
    env: { ...process.env, NG_CLI_ANALYTICS: 'false', NO_COLOR: '1' },
    maxBuffer: 64 * 1024 * 1024,
  });
  const out = relative(stripAnsi(`${run.stdout}${run.stderr}`));
  writeFileSync(join(root, 'results', file), out);
  return { status: run.status, out };
}

const prod = ngBuild('production', 'ng-build-default.txt');
check('ng build (default settings) succeeds', prod.status === 0, `exit ${prod.status}`);
check('ng build (default settings) prints the NG8119 warning and no error',
  prod.out.includes('[WARNING] NG8119') && !prod.out.includes('[ERROR]'));
check('ng build (default settings) says nothing about app-uploader or the typos',
  !/app-uploader' is not|saveed|draftSavd|clikc/.test(prod.out));

const strict = ngBuild('strict', 'ng-build-strict.txt');
const errorCodes = [...strict.out.matchAll(/\[ERROR\] (NG\d+)/g)].map((m) => m[1]);
check(`ng build --configuration strict fails with ${errorCodes.join(', ')}`,
  strict.status === 1 && errorCodes.join() === 'NG8001,NG8030,NG8119', `exit ${strict.status}`);
check('ng build --configuration strict says nothing about (saveed), (clikc) or barWidth',
  !/Event 'saveed'|Event 'clikc'|barWidth/.test(strict.out));

const dev = ngBuild('development', 'ng-build-development.txt');
check('ng build --configuration development succeeds', dev.status === 0, `exit ${dev.status}`);

// ------------------------------------------------------- 3. in the browser
function probe(dir, file) {
  const run = spawnSync(process.execPath, [join(root, 'runtime/probe.mjs'), join(root, dir)], {
    cwd: root,
    encoding: 'utf8',
    maxBuffer: 16 * 1024 * 1024,
  });
  if (run.status !== 0) throw new Error(`probe failed for ${dir}:\n${run.stderr}`);
  const result = JSON.parse(run.stdout);
  delete result.url; // the port changes on every run
  // Keep the first line of each console error; stack traces carry bundle offsets.
  result.errors = result.errors.map((e) => e.split('\n')[0]);
  writeFileSync(join(root, 'results', file), JSON.stringify(result, null, 2) + '\n');
  return result;
}

for (const [config, firstError] of [
  ['development', 'ERROR RuntimeError: NG01203: No value accessor for form control unspecified name attribute.'],
  ['production', "ERROR TypeError: Cannot read properties of null (reading 'writeValue')"],
]) {
  const r = probe(`dist/${config}/browser`, `runtime-${config}.json`);
  const asWritten = r['app-profile-form'];
  const fixed = r['app-profile-form-fixed'];
  check(`${config}: one console error, "${firstError.slice(0, 70)}..."`,
    r.errors.length === 1 && r.errors[0].startsWith(firstError), r.errors.join(' / '));
  check(`${config}: the un-imported <app-uploader> stays empty`, asWritten.after.uploaderChildren === 0 && asWritten.after.uploaderText === '');
  check(`${config}: the imported <app-uploader> renders its input`, fixed.after.uploaderChildren === 2);
  check(`${config}: as written, the first render stops at the uploader (counts line empty)`, asWritten.before.counts === '');
  check(`${config}: as written, Save, Save draft and Reset run no handler`, asWritten.after.counts === 'saves: 0, drafts: 0, resets: 0', asWritten.after.counts);
  check(`${config}: fixed, each click runs its handler once`, fixed.after.counts === 'saves: 1, drafts: 1, resets: 1', fixed.after.counts);
  check(`${config}: as written, both bars get no style and fill the 800px host`,
    [asWritten.after.literalBar, asWritten.after.fieldBar].every((b) => b.style === null && b.width === 800));
  check(`${config}: fixed, both bars are 500px wide`,
    [fixed.after.literalBar, fixed.after.fieldBar].every((b) => b.style === 'width: 500px;' && b.width === 500));
}

console.log(failures === 0 ? '\nAll checks passed.' : `\n${failures} check(s) failed.`);
process.exit(failures === 0 ? 0 : 1);
