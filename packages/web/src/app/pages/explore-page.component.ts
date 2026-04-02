import { JsonPipe } from "@angular/common";
import { Component, inject, signal } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { ApiService } from "../core/api.service";

@Component({
  standalone: true,
  imports: [FormsModule, JsonPipe],
  template: `
    <section class="panel">
      <h2>Explore</h2>
      <textarea [(ngModel)]="prompt" rows="4" style="width:100%"></textarea>
      <div style="margin-top:1rem">
        <button (click)="run()">Run Explore Query</button>
      </div>
      <pre>{{ result() | json }}</pre>
    </section>
  `
})
export class ExplorePageComponent {
  private readonly api = inject(ApiService);
  protected prompt = "forgotten indie artists from my library";
  protected readonly result = signal<unknown>(null);

  protected run() {
    this.api.explore({
      prompt: this.prompt,
      config: {
        externalRatio: 0.2,
        localRatio: 0.8,
        limit: 20,
        includeExplanations: true
      }
    }).subscribe((value) => this.result.set(value));
  }
}

