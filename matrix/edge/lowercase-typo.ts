import { Component } from '@angular/core';
import { SaveButton } from '../../src/app/save-button';

// Typos the event check skips because the name has no capital letter,
// next to one it reports because it has one.
@Component({
  selector: 'app-typo-host',
  imports: [SaveButton],
  template: `
    <app-save-button (draftsaved)="noop()" />
    <app-save-button (svaed)="noop()" />
    <app-save-button (Saved)="noop()" />
  `,
})
export class TypoHost {
  protected noop(): void {}
}
