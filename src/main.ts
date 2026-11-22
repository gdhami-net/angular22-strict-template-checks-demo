import { bootstrapApplication } from '@angular/platform-browser';
import { ProfileForm } from './app/profile-form';
import { ProfileFormFixed } from './app/profile-form-fixed';

// Two separate apps on one page: the template as written, then the fixed one.
bootstrapApplication(ProfileForm).catch((err) => console.error(err));
bootstrapApplication(ProfileFormFixed).catch((err) => console.error(err));
