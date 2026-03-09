import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, shareReplay } from 'rxjs';
import {
  Scenario,
  CreateScenarioRequest,
  UpdateScenarioRequest,
  EctParameters,
  DeficitAnalysis,
  // Phase 3
  ParameterDocumentation,
  UpsertParameterDocumentationRequest,
  SubParameter,
  CreateSubParameterRequest,
  UpdateSubParameterRequest,
  ParameterVariant,
  CreateParameterVariantRequest,
  UpsertVariantSubParameterRequest,
  VariantSubParameter,
  ActivateVariantRequest,
  RollupResult,
  // Phase 3.5
  ProcessDomain,
  ParameterDefinition,
  CreateParameterDefinitionRequest,
  UpdateParameterDefinitionRequest,
  ApplyTemplateRequest,
} from '../models/types';

@Injectable({ providedIn: 'root' })
export class EctApiService {
  private readonly http = inject(HttpClient);

  // Base URL — proxy in angular.json handles CORS in dev
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

  // ─── Phase 3: Parameter Documentation ────────────────────────────────────

  private docBase(scenarioId: number, paramKey: string): string {
    return `${this.base}/Scenarios/${scenarioId}/parameters/${paramKey}/documentation`;
  }

  getDocumentation(
    scenarioId: number,
    paramKey: string
  ): Observable<ParameterDocumentation> {
    return this.http.get<ParameterDocumentation>(this.docBase(scenarioId, paramKey));
  }

  upsertDocumentation(
    scenarioId: number,
    paramKey: string,
    payload: UpsertParameterDocumentationRequest
  ): Observable<ParameterDocumentation> {
    return this.http.put<ParameterDocumentation>(
      this.docBase(scenarioId, paramKey),
      payload
    );
  }

  addSubParameter(
    scenarioId: number,
    paramKey: string,
    payload: CreateSubParameterRequest
  ): Observable<SubParameter> {
    return this.http.post<SubParameter>(
      `${this.docBase(scenarioId, paramKey)}/sub-parameters`,
      payload
    );
  }

  updateSubParameter(
    scenarioId: number,
    paramKey: string,
    stepId: number,
    payload: UpdateSubParameterRequest
  ): Observable<SubParameter> {
    return this.http.put<SubParameter>(
      `${this.docBase(scenarioId, paramKey)}/sub-parameters/${stepId}`,
      payload
    );
  }

  deleteSubParameter(
    scenarioId: number,
    paramKey: string,
    stepId: number
  ): Observable<void> {
    return this.http.delete<void>(
      `${this.docBase(scenarioId, paramKey)}/sub-parameters/${stepId}`
    );
  }

  addVariant(
    scenarioId: number,
    paramKey: string,
    payload: CreateParameterVariantRequest
  ): Observable<ParameterVariant> {
    return this.http.post<ParameterVariant>(
      `${this.docBase(scenarioId, paramKey)}/variants`,
      payload
    );
  }

  deleteVariant(
    scenarioId: number,
    paramKey: string,
    variantId: number
  ): Observable<void> {
    return this.http.delete<void>(
      `${this.docBase(scenarioId, paramKey)}/variants/${variantId}`
    );
  }

  upsertVariantSubParameter(
    scenarioId: number,
    paramKey: string,
    variantId: number,
    payload: UpsertVariantSubParameterRequest
  ): Observable<VariantSubParameter> {
    return this.http.put<VariantSubParameter>(
      `${this.docBase(scenarioId, paramKey)}/variants/${variantId}/sub-parameters`,
      payload
    );
  }

  activateVariant(
    scenarioId: number,
    paramKey: string,
    payload: ActivateVariantRequest
  ): Observable<ParameterDocumentation> {
    return this.http.post<ParameterDocumentation>(
      `${this.docBase(scenarioId, paramKey)}/variants/activate`,
      payload
    );
  }

  // ─── Phase 3: Rollup ──────────────────────────────────────────────────────

  getRollup(scenarioId: number, paramKey: string): Observable<RollupResult> {
    return this.http.get<RollupResult>(
      `${this.base}/Scenarios/${scenarioId}/parameter-definitions/${paramKey}/rollup`
    );
  }

  // ─── Phase 3.5: Process Domains ───────────────────────────────────────────

  // Cache the domain list — it's seed data, never changes at runtime
  private _domains$: Observable<ProcessDomain[]> | null = null;

  getProcessDomains(): Observable<ProcessDomain[]> {
    if (!this._domains$) {
      this._domains$ = this.http
        .get<ProcessDomain[]>(`${this.base}/ProcessDomains`)
        .pipe(shareReplay(1));
    }
    return this._domains$;
  }

  getProcessDomain(id: number): Observable<ProcessDomain> {
    return this.http.get<ProcessDomain>(`${this.base}/ProcessDomains/${id}`);
  }

  // ─── Phase 3.5: Parameter Definitions ────────────────────────────────────

  getParameterDefinitions(scenarioId: number): Observable<ParameterDefinition[]> {
    return this.http.get<ParameterDefinition[]>(
      `${this.base}/Scenarios/${scenarioId}/parameter-definitions`
    );
  }

  createParameterDefinition(
    scenarioId: number,
    payload: CreateParameterDefinitionRequest
  ): Observable<ParameterDefinition> {
    return this.http.post<ParameterDefinition>(
      `${this.base}/Scenarios/${scenarioId}/parameter-definitions`,
      payload
    );
  }

  updateParameterDefinition(
    scenarioId: number,
    defId: number,
    payload: UpdateParameterDefinitionRequest
  ): Observable<ParameterDefinition> {
    return this.http.put<ParameterDefinition>(
      `${this.base}/Scenarios/${scenarioId}/parameter-definitions/${defId}`,
      payload
    );
  }

  deleteParameterDefinition(
    scenarioId: number,
    defId: number
  ): Observable<void> {
    return this.http.delete<void>(
      `${this.base}/Scenarios/${scenarioId}/parameter-definitions/${defId}`
    );
  }

  applyTemplate(
    scenarioId: number,
    payload: ApplyTemplateRequest
  ): Observable<ParameterDefinition[]> {
    return this.http.post<ParameterDefinition[]>(
      `${this.base}/Scenarios/${scenarioId}/parameter-definitions/apply-template`,
      payload
    );
  }
}
