import { Component } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { ProfileForm } from './profile-form';
import { SaveButton } from './save-button';
import { Uploader } from './uploader';

// The same five lines with the mistakes fixed. It shares ProfileForm's class
// body, so the only differences are the template and the Uploader import.
// The page shows both, so the browser check can compare them.
@Component({
  selector: 'app-profile-form-fixed',
  imports: [ReactiveFormsModule, SaveButton, Uploader],
  templateUrl: './profile-form-fixed.html',
  styles: `
    :host { display: block; width: 800px; font-family: sans-serif; }
    .bar { height: 12px; margin: 8px 0; background: #22c55e; }
  `,
})
export class ProfileFormFixed extends ProfileForm {}
