import { Component, ElementRef, inject } from '@angular/core';

// A child that tells its parent about a drop with a plain DOM CustomEvent,
// dispatched from its host element, not with an Angular output().
@Component({
  selector: 'app-drop-zone',
  template: `<div class="zone" (drop)="dropped()">Drop a file here</div>`,
})
export class DropZone {
  private readonly host = inject(ElementRef<HTMLElement>);
  protected dropped(): void {
    this.host.nativeElement.dispatchEvent(new CustomEvent('fileDropped', { bubbles: true }));
    this.host.nativeElement.dispatchEvent(new CustomEvent('file-dropped', { bubbles: true }));
  }
}

@Component({
  selector: 'app-drop-host',
  imports: [DropZone],
  template: `
    <app-drop-zone (fileDropped)="noop()" />
    <app-drop-zone (file-dropped)="noop()" />
  `,
})
export class DropHost {
  protected noop(): void {}
}
