import { HttpClient } from "@angular/common/http";
import { Injectable, inject } from "@angular/core";

@Injectable({ providedIn: "root" })
export class ApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = (globalThis as { __env?: { API_BASE_URL?: string } }).__env?.API_BASE_URL ?? "/api";

  health() {
    return this.http.get(`${this.baseUrl}/health`);
  }

  latestRecommendations() {
    return this.http.get(`${this.baseUrl}/recommendations/latest`);
  }

  libraryStats() {
    return this.http.get(`${this.baseUrl}/library/stats`);
  }

  scanStatus() {
    return this.http.get(`${this.baseUrl}/scan/status`);
  }

  triggerScan() {
    return this.http.post(`${this.baseUrl}/scan`, { mode: "incremental" });
  }

  runRecommendations(payload: unknown) {
    return this.http.post(`${this.baseUrl}/recommendations/run`, payload);
  }

  explore(payload: unknown) {
    return this.http.post(`${this.baseUrl}/recommendations/explore`, payload);
  }

  artists() {
    return this.http.get(`${this.baseUrl}/artists`);
  }

  schedules() {
    return this.http.get(`${this.baseUrl}/schedules`);
  }
}

