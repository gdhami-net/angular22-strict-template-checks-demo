ngc from @angular/compiler-cli 22.3.0, TypeScript 6.0.3.

| binding | file | default (strictTemplates) | + strictUnknownElements | + strictUnclaimedEventNames | tsconfig.strict.json (both + NG8119 as error) | + strictUnknownElementWithDirectives |
| --- | --- | --- | --- | --- | --- | --- |
| `<app-uploader [formControl]="avatar" />` | profile-form.html | silent | error NG8001 | silent | error NG8001 | silent |
| `(saveed)="save()"` | profile-form.html | silent | silent | silent | silent | silent |
| `(draftSavd)="saveDraft()"` | profile-form.html | silent | silent | error NG8030 | error NG8030 | silent |
| `(clikc)="reset()"` | profile-form.html | silent | silent | silent | silent | silent |
| `[style.width]="500"` | profile-form.html | warning NG8119 | warning NG8119 | warning NG8119 | error NG8119 | warning NG8119 |
| `[style.width]="barWidth"` | profile-form.html | silent | silent | silent | silent | silent |
| `<app-uploader [formControl]="avatar" />` | custom-elements-schema.ts | silent | silent | silent | silent | silent |
| `(draftSavd)="noop()"` | custom-elements-schema.ts | silent | silent | error NG8030 | error NG8030 | silent |
| `(pointSelected)="noop()"` | custom-elements-schema.ts | silent | silent | silent | silent | silent |
| `(fileDropped)="noop()"` | custom-dom-event.ts | silent | silent | error NG8030 | error NG8030 | silent |
| `(file-dropped)="noop()"` | custom-dom-event.ts | silent | silent | silent | silent | silent |
| `(draftsaved)="noop()"` | lowercase-typo.ts | silent | silent | silent | silent | silent |
| `(svaed)="noop()"` | lowercase-typo.ts | silent | silent | silent | silent | silent |
| `(Saved)="noop()"` | lowercase-typo.ts | silent | silent | error NG8030 | error NG8030 | silent |
| `[style.width]="'500'"` | style-values.ts | warning NG8119 | warning NG8119 | warning NG8119 | error NG8119 | warning NG8119 |
| `[style.width.px]="500"` | style-values.ts | silent | silent | silent | silent | silent |
| `[style.width]="0"` | style-values.ts | silent | silent | silent | silent | silent |
| `[style.opacity]="0.5"` | style-values.ts | silent | silent | silent | silent | silent |
| `[style.width]="wide ? 500 : 300"` | style-values.ts | silent | silent | silent | silent | silent |
| `[style]="{ width: 500 }"` | style-values.ts | silent | silent | silent | silent | silent |
| ngc exit code | | 0 | 1 | 1 | 1 | 0 |
