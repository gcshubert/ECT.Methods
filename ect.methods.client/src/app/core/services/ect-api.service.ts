import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, shareReplay } from 'rxjs';
import { map } from 'rxjs/operators';
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
  ScenarioConfiguration,
  CreateScenarioConfigurationRequest,
  UpdateScenarioConfigurationRequest,
  UpdateConfigurationEntryRequest,
  // Graph Management
  ParameterNode,
  CreateParameterNodeRequest,
  UpdateParameterNodeRequest,
  Edge,
  CreateEdgeRequest,
  UpdateEdgeRequest,
  HierarchicalStep,
  HierarchicalStepDto,
  HierarchicalStepDtoRaw,
  mapHierarchicalStepDto,
  CreateHierarchicalStepDto,
  UpdateHierarchicalStepDto
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
    stepId: number,
    payload: UpsertVariantSubParameterRequest
  ): Observable<VariantSubParameter> {
    return this.http.put<VariantSubParameter>(
      `${this.docBase(scenarioId, paramKey)}/variants/${variantId}/sub-parameters/${stepId}`,
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

  // ─── Phase 5: Scenario Configurations ──────────────────────────────────

  getConfigurations(scenarioId: number): Observable<ScenarioConfiguration[]> {
    return this.http.get<ScenarioConfiguration[]>(
      `${this.base}/Scenarios/${scenarioId}/configurations`
    );
  }

  getConfiguration(scenarioId: number, configId: number): Observable<ScenarioConfiguration> {
    return this.http.get<ScenarioConfiguration>(
      `${this.base}/Scenarios/${scenarioId}/configurations/${configId}`
    );
  }

  createConfiguration(
    scenarioId: number,
    payload: CreateScenarioConfigurationRequest
  ): Observable<ScenarioConfiguration> {
    return this.http.post<ScenarioConfiguration>(
      `${this.base}/Scenarios/${scenarioId}/configurations`,
      payload
    );
  }

  updateConfiguration(
    scenarioId: number,
    configId: number,
    payload: UpdateScenarioConfigurationRequest
  ): Observable<ScenarioConfiguration> {
    return this.http.put<ScenarioConfiguration>(
      `${this.base}/Scenarios/${scenarioId}/configurations/${configId}`,
      payload
    );
  }

  updateConfigurationEntry(
    scenarioId: number,
    configId: number,
    paramKey: string,
    payload: UpdateConfigurationEntryRequest
  ): Observable<ScenarioConfiguration> {
    return this.http.put<ScenarioConfiguration>(
      `${this.base}/Scenarios/${scenarioId}/configurations/${configId}/entries/${paramKey}`,
      payload
    );
  }

  activateConfiguration(
    scenarioId: number,
    configId: number
  ): Observable<ScenarioConfiguration> {
    return this.http.post<ScenarioConfiguration>(
      `${this.base}/Scenarios/${scenarioId}/configurations/${configId}/activate`,
      {}
    );
  }

  deleteConfiguration(scenarioId: number, configId: number): Observable<void> {
    return this.http.delete<void>(
      `${this.base}/Scenarios/${scenarioId}/configurations/${configId}`
    );
  }

  // ─── Graph Management (Hierarchical Scenarios) ──────────────────────────────

  createParameterNode(scenarioId: number, payload: CreateParameterNodeRequest): Observable<ParameterNode> {
    return this.http.post<ParameterNode>(`${this.base}/Graph/scenario/${scenarioId}/nodes`, payload);
  }

  // Sends a flat CreateHierarchicalStepDto directly to the steps endpoint
  createHierarchicalStep(scenarioId: number, payload: CreateHierarchicalStepDto): Observable<any> {
    return this.http.post(`${this.base}/scenarios/${scenarioId}/hierarchy/steps`, payload);
  }

  updateHierarchicalStep(scenarioId: number, stepId: string, payload: UpdateHierarchicalStepDto): Observable<HierarchicalStepDto> {
    return this.http.put<HierarchicalStepDto>(
      `${this.base}/scenarios/${scenarioId}/hierarchy/steps/${stepId}`,
      payload
    );
  }

  deleteHierarchicalStep(scenarioId: number, stepId: string): Observable<void> {
    return this.http.delete<void>(
      `${this.base}/scenarios/${scenarioId}/hierarchy/steps/${stepId}`
    );
  }

  clearScenario(scenarioId: number): Observable<void> {
    return this.http.delete<void>(
      `${this.base}/scenarios/${scenarioId}/hierarchy/steps/clear-scenario/${scenarioId}`
    );
  }

  getParameterNodes(scenarioId: number): Observable<ParameterNode[]> {
    return this.http.get<ParameterNode[]>(`${this.base}/Graph/hierarchical-scenario/${scenarioId}/nodes`);
  }

  updateParameterNode(scenarioId: number, nodeId: string, payload: UpdateParameterNodeRequest): Observable<ParameterNode> {
    return this.http.put<ParameterNode>(`${this.base}/Graph/scenario/${scenarioId}/nodes/${nodeId}`, payload);
  }

  deleteParameterNode(scenarioId: number, nodeId: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/Graph/scenario/${scenarioId}/nodes/${nodeId}`);
  }

  createEdge(scenarioId: number, payload: CreateEdgeRequest): Observable<Edge> {
    return this.http.post<Edge>(`${this.base}/Graph/scenario/${scenarioId}/edges`, payload);
  }

  getEdges(scenarioId: number): Observable<Edge[]> {
    return this.http.get<Edge[]>(`${this.base}/Graph/scenario/${scenarioId}/edges`);
  }

  updateEdge(scenarioId: number, edgeId: string, payload: UpdateEdgeRequest): Observable<Edge> {
    return this.http.put<Edge>(`${this.base}/Graph/scenario/${scenarioId}/edges/${edgeId}`, payload);
  }

  deleteEdge(scenarioId: number, edgeId: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/Graph/scenario/${scenarioId}/edges/${edgeId}`);
  }

  getHierarchicalSteps(scenarioId: number): Observable<HierarchicalStepDto[]> {
    return this.http.get<HierarchicalStepDtoRaw[]>(
      `${this.base}/scenarios/${scenarioId}/hierarchy/steps`
    ).pipe(
      map(steps => steps.map(step => mapHierarchicalStepDto(step)))
    );
  }
}
