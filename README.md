# angular22-strict-template-checks-demo

Companion to the post **"Catch forgotten imports and misspelled outputs at build time
with Angular 22.3's template checks"**.

One component, `src/app/profile-form.html`, has five template lines that compile and
don't work:

```html
<app-uploader [formControl]="avatar" />
<app-save-button (saveed)="save()" (draftSavd)="saveDraft()" />
<button type="button" class="reset" (clikc)="reset()">Reset</button>
<div class="bar literal" [style.width]="500"></div>
<div class="bar field" [style.width]="barWidth"></div>
```

`Uploader` is missing from the component's `imports`. `saveed` and `draftSavd` are typos
of `SaveButton`'s outputs `saved` and `draftSaved`. `clikc` is a typo of `click`. Both
widths are the number 500 with no unit.

The demo compiles that component (and a few edge cases) with `ngc` under six compiler
setups and records every diagnostic. Then it runs `ng build` with the default settings
and with the strict settings, and opens the built app in headless Edge next to a fixed
copy of the same template.

## What it proves

- With `strictTemplates` on (the compiler's default; `ng new` writes no line for it), Angular 22.3.0 reports one
  of the five lines: `[style.width]="500"`, as **warning NG8119**. `ng build` exits 0.
- `strictUnknownElements: true` adds **error NG8001** on `<app-uploader [formControl]>`:
  `'app-uploader' is not a known element`. Without it, the `[formControl]` directive
  matching the tag is enough for the compiler to skip the tag-name check.
- `strictUnclaimedEventNames: true` adds **error NG8030** on `(draftSavd)`. It does
  **not** report `(saveed)`: the check only looks at names with a capital letter in
  them (`/[A-Z]/` in `checkTemplateElementEvent`, `@angular/compiler-cli` 22.3.0).
- `extendedDiagnostics.checks.numericCssPropertyRequiresUnit: "error"` turns NG8119 into
  an error. All three together are in `tsconfig.strict.json`, and
  `ng build --configuration strict` fails with NG8001, NG8030 and NG8119.
- `(clikc)` on a plain `<button>` and `[style.width]="barWidth"` (a `number` field) stay
  silent in every setup. The event check only runs on elements that have a directive
  or component on them, and NG8119 only looks at literal values.
- The flag name in the message of commit 91b8391, `strictUnknownElementWithDirectives`,
  does nothing in 22.3.0: ngc prints exactly what it prints with no flag, exits 0, and
  never mentions the option. The name the compiler reads is `strictUnknownElements`.
- In the browser (Edge, both builds):
  - development build: `ERROR RuntimeError: NG01203: No value accessor for form control
    unspecified name attribute.`; production build: `ERROR TypeError: Cannot read
    properties of null (reading 'writeValue')`. Neither mentions an import.
  - `<app-uploader>` stays empty. The error stops the component's first render partway,
    so the counters paragraph under it stays empty until the next change detection
    (here, the first click).
  - Clicking Save, Save draft and Reset runs no handler (`saves: 0, drafts: 0, resets: 0`);
    in the fixed copy each click runs once (`1, 1, 1`).
  - Both bars get no `style` attribute at all and fill the 800px host. In the fixed copy
    (`[style.width.px]`) they are 500px.

## The full table (`results/matrix.md`)

| binding | file | default (strictTemplates) | + strictUnknownElements | + strictUnclaimedEventNames | + both flags | tsconfig.strict.json (both + NG8119 as error) | + strictUnknownElementWithDirectives |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `<app-uploader [formControl]="avatar" />` | profile-form.html | silent | error NG8001 | silent | error NG8001 | error NG8001 | silent |
| `(saveed)="save()"` | profile-form.html | silent | silent | silent | silent | silent | silent |
| `(draftSavd)="saveDraft()"` | profile-form.html | silent | silent | error NG8030 | error NG8030 | error NG8030 | silent |
| `(clikc)="reset()"` | profile-form.html | silent | silent | silent | silent | silent | silent |
| `[style.width]="500"` | profile-form.html | warning NG8119 | warning NG8119 | warning NG8119 | warning NG8119 | error NG8119 | warning NG8119 |
| `[style.width]="barWidth"` | profile-form.html | silent | silent | silent | silent | silent | silent |
| `<app-uploader [formControl]="avatar" />` | custom-elements-schema.ts | silent | silent | silent | silent | silent | silent |
| `(draftSavd)="noop()"` | custom-elements-schema.ts | silent | silent | error NG8030 | error NG8030 | error NG8030 | silent |
| `(pointSelected)="noop()"` | custom-elements-schema.ts | silent | silent | silent | silent | silent | silent |
| `(fileDropped)="noop()"` | custom-dom-event.ts | silent | silent | error NG8030 | error NG8030 | error NG8030 | silent |
| `(file-dropped)="noop()"` | custom-dom-event.ts | silent | silent | silent | silent | silent | silent |
| `(draftsaved)="noop()"` | lowercase-typo.ts | silent | silent | silent | silent | silent | silent |
| `(svaed)="noop()"` | lowercase-typo.ts | silent | silent | silent | silent | silent | silent |
| `(Saved)="noop()"` | lowercase-typo.ts | silent | silent | error NG8030 | error NG8030 | error NG8030 | silent |
| `[style.width]="'500'"` | style-values.ts | warning NG8119 | warning NG8119 | warning NG8119 | warning NG8119 | error NG8119 | warning NG8119 |
| `[style.width.px]="500"` | style-values.ts | silent | silent | silent | silent | silent | silent |
| `[style.width]="0"` | style-values.ts | silent | silent | silent | silent | silent | silent |
| `[style.opacity]="0.5"` | style-values.ts | silent | silent | silent | silent | silent | silent |
| `[style.width]="wide ? 500 : 300"` | style-values.ts | silent | silent | silent | silent | silent | silent |
| `[style]="{ width: 500 }"` | style-values.ts | silent | silent | silent | silent | silent | silent |
| ngc exit code | | 0 | 1 | 1 | 1 | 1 | 0 |

The compiler's own output for each setup is in `results/raw/ngc-<setup>.txt`; the two
`ng build` runs are in `results/ng-build-default.txt` and `results/ng-build-strict.txt`;
what the browser saw is in `results/runtime-development.json` and
`results/runtime-production.json`.

## Edge cases the post leaves out

- **`CUSTOM_ELEMENTS_SCHEMA`** (`matrix/edge/custom-elements-schema.ts`): the same
  forgotten `<app-uploader [formControl]>` is silent again, even with
  `strictUnknownElements`, because the schema accepts any tag with a dash in it. The
  event check still runs on elements with a matched component (`(draftSavd)` on
  `<app-save-button>` is still NG8030), but not on custom elements with no component
  (`(pointSelected)` on `<chart-widget>` is silent).
- **A camelCase DOM event** (`matrix/edge/custom-dom-event.ts`): a child that sends a
  plain `CustomEvent('fileDropped')` from its host element, instead of an `output()`, gets
  NG8030 on `(fileDropped)` with the event check on. The compiler can't see
  `dispatchEvent`. A dash-separated name (`(file-dropped)`) is exempt. This is the one
  false positive the demo found; the option's own doc comment warns about it.
- **Names with no capital letter** (`matrix/edge/lowercase-typo.ts`): `(draftsaved)` (a
  case-only typo of `draftSaved`) and `(svaed)` are silent; `(Saved)` is NG8030.
- **NG8119's reach** (`matrix/edge/style-values.ts`): it also reports a numeric string,
  `[style.width]="'500'"`. It skips `0`, properties that take plain numbers (`opacity`),
  `[style.width.px]`, a conditional (`wide ? 500 : 300`) and the object form
  `[style]="{ width: 500 }"`.
- **`strictUnknownElements` can't flag a correct tag that `strictTemplates` alone
  accepts without directives.** It runs the same tag-name check Angular already runs on
  elements with no directive at all; it just stops skipping elements that only have
  attribute directives. Tags matched by a component, or by a directive whose selector
  names the tag (like `router-outlet`), are still skipped (`requiresUnknownElementCheck`
  in `@angular/compiler` 22.3.0).
- The event check arrived in 22.2.0 (commit 312e1d8); 22.3.0 also "wires up" both flags
  in the compiler's preprocessor (commits c511ee4 and 92b6ae2). This demo only runs
  22.3.0.
- A comment in the 22.3.0 compiler (`TODO: Enable those 2 flags by default in v23`) and
  commit 91b8391 both say the two flags should be on by default in v23. That's a plan,
  not a release.
- `strictUnclaimedEventNames` is listed in the angular.dev template type-checking guide;
  `strictUnknownElements` isn't on angular.dev at all, only in the compiler's public
  options type.
- Extended diagnostics such as NG8119 need `strictTemplates`. To make every extended
  diagnostic an error at once, `extendedDiagnostics.defaultCategory: "error"` also
  works; the demo only uses the per-check setting.

## Run it

```
npm install
npm run check     # the table, three ng builds, then the app in Edge; every line must say PASS
npm run matrix    # only the table
npm start         # http://localhost:4200, both copies of the template on one page
```

`npm run check` launches Edge through `playwright-core` with a throw-away profile, which
Playwright deletes when the browser closes. Set `BROWSER_CHANNEL=chrome` to use Chrome.

## Versions

- `@angular/core`, `common`, `compiler`, `compiler-cli`, `forms`, `platform-browser`,
  `@angular/build` and `@angular/cli`: 22.3.0
- TypeScript 6.0.3 (`@angular/compiler-cli` 22.3.0 needs `>=6.0 <6.1`)
- Node 26.12.1, Windows 11
- `playwright-core` 1.65.1, Microsoft Edge 158.0.4370.33

## Layout

```
src/app/profile-form.html        the five lines, as written
src/app/profile-form-fixed.html  the same lines, fixed
src/app/uploader.ts              a ControlValueAccessor component (app-uploader)
src/app/save-button.ts           outputs `saved` and `draftSaved`
tsconfig.strict.json             the three settings the post recommends
matrix/tsconfig.<setup>.json     one per column of the table
matrix/edge/                     the edge cases above
matrix/run-matrix.mjs            runs ngc per setup, writes results/
runtime/probe.mjs                opens a build in Edge and reports what the page did
check.mjs                        asserts all of the above
```

## License

MIT
