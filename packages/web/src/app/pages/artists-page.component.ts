import { AsyncPipe, JsonPipe } from "@angular/common";
import { Component, inject } from "@angular/core";
import { ApiService } from "../core/api.service";

@Component({
  standalone: true,
  imports: [AsyncPipe, JsonPipe],
  template: `
    <section class="panel">
      <h2>Artists</h2>
      <pre>{{ artists$ | async | json }}</pre>
    </section>
  `
})
export class ArtistsPageComponent {
  private readonly api = inject(ApiService);
  protected readonly artists$ = this.api.artists();
}

