import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import {
  Scenario,
  CreateScenarioRequest,
  UpdateScenarioRequest,
  EctParameters,
  DeficitAnalysis,
} from '../models/types';

@Injectable({ providedIn: 'root' })
export class EctApiService {
  private readonly http = inject(HttpClient);

  // Base URL is set in environment.ts — proxy in angular.json handles CORS in dev
  private readonly base = '/api';

  // ─── Scenarios ────────────────────────────────────────────────────────────

  getScenarios(): Observable<Scenario[]> {
    return this.http.get<Scenario[]>(`${this.base}/Scenarios`);
  }

  getScenario(id: number): Observable<Scenario> {
    return this.http.get<Scenario>(`${this.base}/Scenarios/${id}`);
  }

  createScenario(payload: CreateScenarioRequest): Observable<Scenario> {
    return this.http.post<Scenario>(`${this.base}/Scenarios`, payload);
  }

  updateScenario(id: number, payload: UpdateScenarioRequest): Observable<Scenario> {
    return this.http.put<Scenario>(`${this.base}/Scenarios/${id}`, payload);
  }

  updateParameters(id: number, params: EctParameters): Observable<Scenario> {
    return this.http.put<Scenario>(`${this.base}/Scenarios/${id}/parameters`, params);
  }

  deleteScenario(id: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/Scenarios/${id}`);
  }

  // ─── Deficit Analysis ─────────────────────────────────────────────────────

  getAnalysis(scenarioId: number): Observable<DeficitAnalysis> {
    return this.http.get<DeficitAnalysis>(
      `${this.base}/DeficitAnalysis/scenario/${scenarioId}`
    );
  }

  computeAnalysis(scenarioId: number): Observable<DeficitAnalysis> {
    return this.http.post<DeficitAnalysis>(
      `${this.base}/DeficitAnalysis/scenario/${scenarioId}/compute`,
      {}
    );
  }
}
