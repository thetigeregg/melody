import { AsyncPipe, JsonPipe } from "@angular/common";
import { Component, inject } from "@angular/core";
import { ApiService } from "../core/api.service";

@Component({
  standalone: true,
  imports: [AsyncPipe, JsonPipe],
  template: `
    <section class="grid">
      <article class="panel">
        <h2>Latest Recommendations</h2>
        <pre>{{ recommendations$ | async | json }}</pre>
      </article>
      <article class="panel">
        <h2>Scan Status</h2>
        <pre>{{ scanStatus$ | async | json }}</pre>
      </article>
      <article class="panel">
        <h2>Library Stats</h2>
        <pre>{{ libraryStats$ | async | json }}</pre>
      </article>
    </section>
  `
})
export class DashboardPageComponent {
  private readonly api = inject(ApiService);
  protected readonly recommendations$ = this.api.latestRecommendations();
  protected readonly scanStatus$ = this.api.scanStatus();
  protected readonly libraryStats$ = this.api.libraryStats();
}

