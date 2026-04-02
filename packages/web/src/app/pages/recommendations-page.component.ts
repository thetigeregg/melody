import { AsyncPipe, JsonPipe } from "@angular/common";
import { Component, inject } from "@angular/core";
import { ApiService } from "../core/api.service";

@Component({
  standalone: true,
  imports: [AsyncPipe, JsonPipe],
  template: `
    <section class="panel">
      <h2>Recommendations</h2>
      <p class="accent">Uses the latest persisted recommendation run.</p>
      <pre>{{ data$ | async | json }}</pre>
    </section>
  `
})
export class RecommendationsPageComponent {
  private readonly api = inject(ApiService);
  protected readonly data$ = this.api.latestRecommendations();
}

