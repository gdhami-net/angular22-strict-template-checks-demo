import { Component, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { SaveButton } from '../../src/app/save-button';

// The same forgotten import as profile-form.html, in a component that also
// hosts a real web component and so carries CUSTOM_ELEMENTS_SCHEMA.
@Component({
  selector: 'app-schema-host',
  imports: [ReactiveFormsModule, SaveButton],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  template: `
    <app-uploader [formControl]="avatar" />
    <app-save-button (draftSavd)="noop()" />
    <chart-widget (pointSelected)="noop()"></chart-widget>
  `,
})
export class SchemaHost {
  protected readonly avatar = new FormControl('');
  protected noop(): void {}
}
