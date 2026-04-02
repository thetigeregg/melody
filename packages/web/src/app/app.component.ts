import { Component } from "@angular/core";
import { RouterLink, RouterOutlet } from "@angular/router";

@Component({
  selector: "melody-root",
  standalone: true,
  imports: [RouterLink, RouterOutlet],
  template: `
    <div class="shell">
      <section class="panel">
        <h1>Melody</h1>
        <p>Self-hosted music intelligence across your local library, Last.fm history, and scheduled discovery.</p>
        <nav style="display:flex;gap:1rem;flex-wrap:wrap">
          <a routerLink="/">Dashboard</a>
          <a routerLink="/recommendations">Recommendations</a>
          <a routerLink="/explore">Explore</a>
          <a routerLink="/artists">Artists</a>
          <a routerLink="/library">Library</a>
          <a routerLink="/schedules">Schedules</a>
        </nav>
      </section>
      <router-outlet />
    </div>
  `
})
export class AppComponent {}

