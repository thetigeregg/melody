import { AsyncPipe, JsonPipe } from "@angular/common";
import { Component, inject } from "@angular/core";
import { ApiService } from "../core/api.service";

@Component({
  standalone: true,
  imports: [AsyncPipe, JsonPipe],
  template: `
    <section class="panel">
      <h2>Library / Scan</h2>
      <button (click)="triggerScan()">Run Incremental Scan</button>
      <pre>{{ scanStatus$ | async | json }}</pre>
    </section>
  `
})
export class LibraryPageComponent {
  private readonly api = inject(ApiService);
  protected readonly scanStatus$ = this.api.scanStatus();

  protected triggerScan() {
    this.api.triggerScan().subscribe();
  }
}

