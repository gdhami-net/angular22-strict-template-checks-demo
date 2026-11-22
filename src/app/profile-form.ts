import { Component, signal } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { SaveButton } from './save-button';

// The five lines in profile-form.html each hold a mistake that compiles:
//   1. <app-uploader> is used, but Uploader is missing from `imports` below.
//   2. (saveed) and (draftSavd) are typos of SaveButton's outputs `saved` and `draftSaved`.
//   3. (clikc) is a typo of (click) on a plain <button>.
//   4. [style.width]="500" binds a number with no unit.
//   5. [style.width]="barWidth" binds the same number through a field.
@Component({
  selector: 'app-profile-form',
  imports: [ReactiveFormsModule, SaveButton],
  templateUrl: './profile-form.html',
  styles: `
    :host { display: block; width: 800px; font-family: sans-serif; }
    .bar { height: 12px; margin: 8px 0; background: #38bdf8; }
  `,
})
export class ProfileForm {
  protected readonly avatar = new FormControl('');
  protected readonly saves = signal(0);
  protected readonly drafts = signal(0);
  protected readonly resets = signal(0);
  protected barWidth = 500;

  protected save(): void {
    this.saves.update((n) => n + 1);
  }
  protected saveDraft(): void {
    this.drafts.update((n) => n + 1);
  }
  protected reset(): void {
    this.resets.update((n) => n + 1);
  }
}
