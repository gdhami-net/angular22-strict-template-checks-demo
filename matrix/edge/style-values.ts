import { Component } from '@angular/core';

// What numericCssPropertyRequiresUnit (NG8119) looks at, and what it doesn't.
@Component({
  selector: 'app-style-values',
  template: `
    <div [style.width]="'500'"></div>
    <div [style.width.px]="500"></div>
    <div [style.width]="0"></div>
    <div [style.opacity]="0.5"></div>
    <div [style.width]="wide ? 500 : 300"></div>
    <div [style]="{ width: 500 }"></div>
  `,
})
export class StyleValues {
  protected wide = true;
}
