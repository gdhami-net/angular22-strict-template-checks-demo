import { Component, output } from '@angular/core';

@Component({
  selector: 'app-save-button',
  template: `
    <button type="button" class="save" (click)="saved.emit()">Save</button>
    <button type="button" class="draft" (click)="draftSaved.emit()">Save draft</button>
  `,
})
export class SaveButton {
  readonly saved = output<void>();
  readonly draftSaved = output<void>();
}
