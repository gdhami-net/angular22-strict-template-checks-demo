import { Component, forwardRef, signal } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

// A form control of its own: it gives [formControl] the file name the user picked.
@Component({
  selector: 'app-uploader',
  template: `
    <label>Avatar <input type="file" (change)="pick($event)" /></label>
    <span class="file-name">{{ fileName() || 'no file chosen' }}</span>
  `,
  providers: [{ provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => Uploader), multi: true }],
})
export class Uploader implements ControlValueAccessor {
  protected readonly fileName = signal('');
  private onChange: (value: string) => void = () => {};
  private onTouched: () => void = () => {};

  protected pick(event: Event): void {
    const name = (event.target as HTMLInputElement).files?.[0]?.name ?? '';
    this.fileName.set(name);
    this.onChange(name);
    this.onTouched();
  }

  writeValue(value: string | null): void {
    this.fileName.set(value ?? '');
  }
  registerOnChange(fn: (value: string) => void): void {
    this.onChange = fn;
  }
  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }
}
