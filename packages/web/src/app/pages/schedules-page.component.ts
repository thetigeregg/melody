import { AsyncPipe, JsonPipe } from "@angular/common";
import { Component, inject } from "@angular/core";
import { ApiService } from "../core/api.service";

@Component({
  standalone: true,
  imports: [AsyncPipe, JsonPipe],
  template: `
    <section class="panel">
      <h2>Schedules</h2>
      <pre>{{ schedules$ | async | json }}</pre>
    </section>
  `
})
export class SchedulesPageComponent {
  private readonly api = inject(ApiService);
  protected readonly schedules$ = this.api.schedules();
}
