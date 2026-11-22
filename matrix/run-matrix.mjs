// Compiles the app and the edge cases with `ngc -p` once per compiler setup,
// and writes:
//   results/matrix.json   every diagnostic: setup, code, category, file, line, message
//   results/matrix.md     the table the README and the post quote
//   results/raw/ngc-<setup>.txt   ngc's own output, colours removed
//
//   node matrix/run-matrix.mjs
import { spawnSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '..');
const ngcBin = join(root, 'node_modules', '@angular', 'compiler-cli', 'bundles', 'src', 'bin', 'ngc.js');

// One column per compiler setup. Each one is a tsconfig file in this folder.
export const SETUPS = [
  { id: 'default', label: 'default (strictTemplates)' },
  { id: 'unknown-elements', label: '+ strictUnknownElements' },
  { id: 'unclaimed-events', label: '+ strictUnclaimedEventNames' },
  { id: 'both', label: '+ both flags' },
  { id: 'all', label: 'tsconfig.strict.json (both + NG8119 as error)' },
  { id: 'wrong-name', label: '+ strictUnknownElementWithDirectives' },
];

// One row per binding. `needle` is the exact text in `file`; a diagnostic
// belongs to the row when it starts inside that text.
export const ROWS = [
  { id: 'forgotten-import', file: 'src/app/profile-form.html', needle: '<app-uploader [formControl]="avatar" />', short: '<app-uploader [formControl]>' },
  { id: 'lowercase-output-typo', file: 'src/app/profile-form.html', needle: '(saveed)="save()"', short: '(saveed)' },
  { id: 'camelcase-output-typo', file: 'src/app/profile-form.html', needle: '(draftSavd)="saveDraft()"', short: '(draftSavd)' },
  { id: 'native-event-typo', file: 'src/app/profile-form.html', needle: '(clikc)="reset()"', short: '(clikc)' },
  { id: 'width-number-literal', file: 'src/app/profile-form.html', needle: '[style.width]="500"', short: '[style.width]="500"' },
  { id: 'width-number-field', file: 'src/app/profile-form.html', needle: '[style.width]="barWidth"', short: '[style.width]="barWidth"' },
  { id: 'schema-forgotten-import', file: 'matrix/edge/custom-elements-schema.ts', needle: '<app-uploader [formControl]="avatar" />' },
  { id: 'schema-camelcase-output-typo', file: 'matrix/edge/custom-elements-schema.ts', needle: '(draftSavd)="noop()"' },
  { id: 'schema-custom-element-event', file: 'matrix/edge/custom-elements-schema.ts', needle: '(pointSelected)="noop()"' },
  { id: 'camelcase-dom-event', file: 'matrix/edge/custom-dom-event.ts', needle: '(fileDropped)="noop()"' },
  { id: 'dashed-dom-event', file: 'matrix/edge/custom-dom-event.ts', needle: '(file-dropped)="noop()"' },
  { id: 'case-only-typo', file: 'matrix/edge/lowercase-typo.ts', needle: '(draftsaved)="noop()"' },
  { id: 'lowercase-typo-2', file: 'matrix/edge/lowercase-typo.ts', needle: '(svaed)="noop()"' },
  { id: 'capitalised-typo', file: 'matrix/edge/lowercase-typo.ts', needle: '(Saved)="noop()"' },
  { id: 'width-string-literal', file: 'matrix/edge/style-values.ts', needle: `[style.width]="'500'"` },
  { id: 'width-px-unit', file: 'matrix/edge/style-values.ts', needle: '[style.width.px]="500"' },
  { id: 'width-zero', file: 'matrix/edge/style-values.ts', needle: '[style.width]="0"' },
  { id: 'opacity-number', file: 'matrix/edge/style-values.ts', needle: '[style.opacity]="0.5"' },
  { id: 'width-conditional', file: 'matrix/edge/style-values.ts', needle: '[style.width]="wide ? 500 : 300"' },
  { id: 'style-object', file: 'matrix/edge/style-values.ts', needle: '[style]="{ width: 500 }"' },
];

const stripAnsi = (s) => s.replace(/\u001b\[[0-9;]*m/g, '');

// Line/column (1-based) where `needle` starts, and where it ends.
function locate(row) {
  const text = readFileSync(join(root, row.file), 'utf8').replace(/\r\n/g, '\n');
  const at = text.indexOf(row.needle);
  if (at < 0 || text.indexOf(row.needle, at + 1) >= 0) {
    throw new Error(`needle must appear exactly once in ${row.file}: ${row.needle}`);
  }
  const before = text.slice(0, at).split('\n');
  return { line: before.length, start: before.at(-1).length + 1, end: before.at(-1).length + row.needle.length };
}

// ngc prints "<file>:<line>:<col> - <category> <code>: <first line of message>",
// then more message lines, then a code frame. Paths are relative to the tsconfig.
const HEAD = /^(.+?):(\d+):(\d+) - (error|warning) (NG\d+|TS\d+): (.*)$/;
function parse(output) {
  const lines = output.split(/\r?\n/);
  const found = [];
  for (let i = 0; i < lines.length; i++) {
    const m = HEAD.exec(lines[i]);
    if (!m) continue;
    const message = [m[6]];
    for (let j = i + 1; j < lines.length && lines[j] !== '' && !HEAD.test(lines[j]); j++) message.push(lines[j]);
    const file = resolve(here, m[1]).slice(root.length + 1).replaceAll('\\', '/');
    found.push({ file, line: +m[2], column: +m[3], category: m[4], code: m[5], message: message.join('\n') });
  }
  return found;
}

export function runMatrix() {
  mkdirSync(join(root, 'results', 'raw'), { recursive: true });
  const located = ROWS.map((row) => ({ ...row, ...locate(row) }));
  const report = { compilerCli: null, typescript: null, setups: {} };
  report.compilerCli = JSON.parse(readFileSync(join(root, 'node_modules/@angular/compiler-cli/package.json'), 'utf8')).version;
  report.typescript = JSON.parse(readFileSync(join(root, 'node_modules/typescript/package.json'), 'utf8')).version;

  for (const setup of SETUPS) {
    const run = spawnSync(process.execPath, [ngcBin, '-p', join(here, `tsconfig.${setup.id}.json`)], {
      cwd: here,
      encoding: 'utf8',
      maxBuffer: 64 * 1024 * 1024,
    });
    const output = stripAnsi(`${run.stdout}${run.stderr}`);
    writeFileSync(join(root, 'results', 'raw', `ngc-${setup.id}.txt`), output || '(no output)\n');
    const diagnostics = parse(output);
    const unmatched = diagnostics.filter(
      (d) => !located.some((r) => r.file === d.file && r.line === d.line && d.column >= r.start && d.column <= r.end),
    );
    report.setups[setup.id] = { label: setup.label, exitCode: run.status, diagnostics, unmatched };
  }

  const cellOf = (setupId, row) => {
    const hits = report.setups[setupId].diagnostics.filter(
      (d) => d.file === row.file && d.line === row.line && d.column >= row.start && d.column <= row.end,
    );
    return hits.length === 0 ? 'silent' : hits.map((d) => `${d.category} ${d.code}`).join(' + ');
  };
  report.table = located.map((row) => ({
    row: row.id,
    file: row.file,
    binding: row.needle,
    short: row.short,
    cells: Object.fromEntries(SETUPS.map((s) => [s.id, cellOf(s.id, row)])),
  }));

  const head = ['binding', 'file', ...SETUPS.map((s) => s.label)];
  const md = [
    `ngc from @angular/compiler-cli ${report.compilerCli}, TypeScript ${report.typescript}.`,
    '',
    `| ${head.join(' | ')} |`,
    `| ${head.map(() => '---').join(' | ')} |`,
    ...report.table.map(
      (r) => `| \`${r.binding.replaceAll('|', '\\|')}\` | ${r.file.replace(/^.*\//, '')} | ${SETUPS.map((s) => r.cells[s.id]).join(' | ')} |`,
    ),
    `| ngc exit code | | ${SETUPS.map((s) => report.setups[s.id].exitCode).join(' | ')} |`,
    '',
  ].join('\n');

  // The short table the post quotes: the six bindings in profile-form.html,
  // with the default setup and with tsconfig.strict.json.
  const pad = (s, n) => s + ' '.repeat(Math.max(1, n - s.length));
  const summary = [
    pad('binding', 30) + pad('default', 16) + 'tsconfig.strict.json',
    ...report.table
      .filter((r) => r.file === 'src/app/profile-form.html')
      .map((r) => pad(r.short, 30) + pad(r.cells.default, 16) + r.cells.all),
  ].join('\n');

  writeFileSync(join(root, 'results', 'matrix.json'), JSON.stringify(report, null, 2) + '\n');
  writeFileSync(join(root, 'results', 'matrix.md'), md);
  writeFileSync(join(root, 'results', 'summary.txt'), summary + '\n');
  return report;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const report = runMatrix();
  console.log(readFileSync(join(root, 'results', 'matrix.md'), 'utf8'));
  for (const [id, s] of Object.entries(report.setups)) {
    if (s.unmatched.length) console.log(`${id}: ${s.unmatched.length} diagnostic(s) outside every row`);
  }
}
