import { bootstrapApplication } from "@angular/platform-browser";
import { provideAnimations } from "@angular/platform-browser/animations";
import { provideHttpClient } from "@angular/common/http";
import { provideRouter, Routes } from "@angular/router";
import { AppComponent } from "./app/app.component";
import { DashboardPageComponent } from "./app/pages/dashboard-page.component";
import { RecommendationsPageComponent } from "./app/pages/recommendations-page.component";
import { ExplorePageComponent } from "./app/pages/explore-page.component";
import { ArtistsPageComponent } from "./app/pages/artists-page.component";
import { LibraryPageComponent } from "./app/pages/library-page.component";
import { SchedulesPageComponent } from "./app/pages/schedules-page.component";

const routes: Routes = [
  { path: "", component: DashboardPageComponent },
  { path: "recommendations", component: RecommendationsPageComponent },
  { path: "explore", component: ExplorePageComponent },
  { path: "artists", component: ArtistsPageComponent },
  { path: "library", component: LibraryPageComponent },
  { path: "schedules", component: SchedulesPageComponent }
];

bootstrapApplication(AppComponent, {
  providers: [
    provideAnimations(),
    provideHttpClient(),
    provideRouter(routes)
  ]
}).catch((error) => console.error(error));

