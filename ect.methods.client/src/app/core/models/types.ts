// ─── Primitive shared by all ECT values ────────────────────────────────────
export interface ScientificValue {
  coefficient: number;
  exponent: number;
}


// ─── Scenario ───────────────────────────────────────────────────────────────
export interface Scenario {
  id: number;
  name: string;
  description: string;
  createdDate: string;           // matches API: ScenarioDto.CreatedDate
  processDomainId?: number | null;
  parameters?: EctParameters;
  deficitAnalysis?: DeficitAnalysis | null;
  hasAnalysis?: boolean;
  scenarioMode: string;          // "Flat" or "Hierarchical"
  solveForMode: string;          // "C", "T", "E", etc.
}

export interface CreateScenarioRequest {
  name: string;
  description: string;
  scenarioMode: string;
  solveForMode: string;
  parameters?: EctParameters;   // optional — API creates with null params if omitted
}

export interface UpdateScenarioRequest {
  name?: string;
  description?: string;
  scenarioMode?: string;
  solveForMode?: string;
}

// ─── ECT Parameters ─────────────────────────────────────────────────────────
// Matches API: ScenarioParametersDto (camelCased by JSON serializer)
export interface EctParameters {
  id?: number;
  scenarioId?: number;
  energy: ScientificValue;        // Energy
  control: ScientificValue;       // Control (available)
  complexity: ScientificValue;    // Complexity constant
  timeAvailable: ScientificValue; // Time
}

// ─── Deficit Analysis ───────────────────────────────────────────────────────
export interface DeficitAnalysis {
  id: number;
  scenarioId: number;
  computedAt: string;
  deficitType: DeficitType;
  cRequired: ScientificValue;
  cAvailable: ScientificValue;
  cDeficit: ScientificValue;
  deficitInterpretation: DeficitInterpretation;
}

export type DeficitType = 'A' | 'B' | 'C' | 'D';
export type DeficitInterpretation = 'Minor' | 'Significant' | 'Profound';

export const DEFICIT_TYPE_LABELS: Record<DeficitType, string> = {
  A: 'Throughput Gap',
  B: 'Precision Gap',
  C: 'Coordination Gap',
  D: 'Specification Gap',
};

// ─── Phase 3: Step Operation ────────────────────────────────────────────────
export enum StepOperation {
  Multiply = 0,
  Divide   = 1,
  Add      = 2,
  Subtract = 3,
  Power    = 4,
}

export const STEP_OPERATION_LABELS: Record<StepOperation, string> = {
  [StepOperation.Multiply]: '×',
  [StepOperation.Divide]:   '÷',
  [StepOperation.Add]:      '+',
  [StepOperation.Subtract]: '−',
  [StepOperation.Power]:    '^',
};

// ─── Graph Management (for Hierarchical Scenarios) ──────────────────────────────
export interface ParameterNode {
  id: string;
  key: string;
  label: string;
  description: string;
  symbol: string;
  unit: string;
  value: ScientificValue;
  nodeType: string;
  scenarioId: number;
}

export interface CreateParameterNodeRequest {
  key: string;
  label: string;
  description: string;
  symbol: string;
  unit: string;
  value: ScientificValue;
  nodeType: string;
}

export interface UpdateParameterNodeRequest {
  label: string;
  description: string;
  symbol: string;
  unit: string;
  value: ScientificValue;
}

export interface Edge {
  id: string;
  sourceNodeId: string;
  targetNodeId: string;
  relationship: string;
  operation: string;
  scenarioId: number;
}

export interface CreateEdgeRequest {
  sourceNodeId: string;
  targetNodeId: string;
  relationship: string;
  operation: string;
}

export interface UpdateEdgeRequest {
  relationship: string;
  operation: string;
}

// ─── Phase 2: Hierarchical Graph Management (Refined) ──────────────────────

/**
 * Represents a node in the Neo4j process hierarchy.
 * Note: Uses string IDs (nodeId) and standard numbers for graph math.
 */
export interface HierarchicalStep {
  nodeId: string;         // Neo4j element ID or 'scenario-{id}-root'
  key: string;            // Unique string key (e.g., 'sub-proc-01')
  label: string;          // Display name
  description: string;
  role: string;           // E, T, C, or k
  parentNodeId?: string | null;
  rollupOperator?: string | null; // Sum, Product, WeightedSum, etc.
  weight: number;         // Default 1.0
  baseValue?: ScientificValue | null;
  children?: HierarchicalStep[]; // Populated locally or via Rollup result
}

/**
 * Payload for creating a new node in the hierarchy.
 */
export interface CreateHierarchicalStepRequest {
  key: string;
  label: string;
  description: string;
  role: string;
  rollupOperator?: string | null;
  weight: number;
  parentNodeId?: string | null;
  baseValue?: number | null;
}

/**
 * Payload for updating existing graph nodes.
 */
export interface UpdateHierarchicalStepRequest {
  label?: string;
  description?: string;
  role?: string;
  rollupOperator?: string | null;
  weight?: number;
  baseValue?: number | null;
}
// ─── Phase 3: Parameter Documentation ───────────────────────────────────────
export interface SubParameter {
  id: number;
  stepOrder: number;
  name: string;
  value: ScientificValue;
  unit: string;
  rationale: string;
  sourceReference: string;
  operation: StepOperation;
}

export interface CreateSubParameterRequest {
  stepOrder: number;
  name: string;
  value: ScientificValue;
  unit: string;
  rationale: string;
  sourceReference: string;
  operation?: StepOperation;
}

export interface UpdateSubParameterRequest {
  stepOrder: number;
  name: string;
  value: ScientificValue;
  unit: string;
  rationale: string;
  sourceReference: string;
  operation: StepOperation;
}

export interface VariantSubParameter {
  id: number;
  stepOrder: number;
  name: string;
  value: ScientificValue;
  unit: string;
  rationale: string;
  sourceReference: string;
  operation: StepOperation;
}

export interface ParameterVariant {
  id: number;
  name: string;
  isActive: boolean;
  subParameters: VariantSubParameter[];
}

export interface ParameterDocumentation {
  id: number;
  parameterKey: string;
  label: string;
  derivationNarrative: string;
  subParameters: SubParameter[];
  variants: ParameterVariant[];
}

export interface UpsertParameterDocumentationRequest {
  label: string;
  derivationNarrative: string;
  subParameters: CreateSubParameterRequest[];
}

export interface CreateParameterVariantRequest {
  name: string;
  subParameters: CreateSubParameterRequest[];
}

export interface UpsertVariantSubParameterRequest {
  stepOrder: number;
  name: string;
  value: ScientificValue;
  unit: string;
  rationale: string;
  sourceReference: string;
  operation: StepOperation;
}

export interface ActivateVariantRequest {
  variantId: number;
}

// ─── Phase 3: Rollup ─────────────────────────────────────────────────────────
export interface RollupStep {
  stepOrder: number;
  name: string;
  value: ScientificValue;
  operation: StepOperation;
  runningTotal: ScientificValue;
}

export interface RollupResult {
  parameterKey: string;
  composedValue: ScientificValue;
  steps: RollupStep[];
}

// ─── Phase 3.5: Process Domains & Parameter Definitions ──────────────────────
export interface TemplateParameterDefinition {
  id: number;
  key: string;
  symbol: string;
  label: string;
  description: string;
  defaultUnit: string;
  sortOrder: number;
  isEctCoreParameter: boolean;
  seedValue: ScientificValue | null;
}

export interface ParameterTemplateSummary {
  id: number;
  name: string;
  description: string;
  parameterDefinitions: TemplateParameterDefinition[];
}

export interface ProcessDomain {
  id: number;
  name: string;
  description: string;
  iconKey: string;
  templates: ParameterTemplateSummary[];
}

export interface ParameterDefinition {
  id: number;
  scenarioId?: number;
  key: string;
  symbol: string;
  label: string;
  description: string;
  unit: string;
  sortOrder: number;
  isEctCoreParameter: boolean;
  defaultValue: ScientificValue | null;
}

export interface CreateParameterDefinitionRequest {
  key: string;
  symbol: string;
  label: string;
  description: string;
  unit: string;
  sortOrder: number;
  isEctCoreParameter?: boolean;
  defaultValue?: ScientificValue | null;
}

export interface UpdateParameterDefinitionRequest {
  symbol: string;
  label: string;
  description: string;
  unit: string;
  sortOrder: number;
  defaultValue?: ScientificValue | null;
}

export interface ApplyTemplateRequest {
  templateId: number;
}
// ─── Phase 5: Scenario Configurations ───────────────────────────────────────

export interface ScenarioConfigurationEntry {
  id: number;
  parameterKey: string;
  variantId: number | null;
  variantLabel: string;
  snapshotValue: ScientificValue | null;
}

export interface ScenarioConfiguration {
  id: number;
  scenarioId: number;
  name: string;
  description: string;
  sortOrder: number;
  createdDate: string;
  entries: ScenarioConfigurationEntry[];
  deficitAnalysis: DeficitAnalysis | null;
}

export interface CreateScenarioConfigurationRequest {
  name: string;
  description: string;
  cloneFromConfigurationId?: number | null;
}

export interface UpdateScenarioConfigurationRequest {
  name: string;
  description: string;
  sortOrder: number;
}

export interface UpdateConfigurationEntryRequest {
  variantId: number | null;
}

export interface CreateHierarchicalStepDto {
  key: string;
  name: string;
  label: string;
  description: string;
  role: string;          // E, T, C, or k
  type: string;          // Maps to Role
  rollupOperator?: string;
  weight: number;
  parentNodeId?: string;
  baseValue?: ScientificValue | null; 
}

export interface CreateHierarchicalStepWithParametersDto {
  stepName: string;
  description?: string;
  sortOrder: number;
  parentNodeId?: string;
  parameters: CreateHierarchicalStepDto[]; // The 4 core coefficients
}

export interface HierarchicalStepDto {
  nodeId: string;
  key: string;
  label: string;
  description: string;
  role: string;
  parentNodeId?: string | null;
  parentNodeIds?: string[];            // full DAG support
  rollupOperator?: string | null;
  weight: number;
  baseValue?: ScientificValue | null;
}
export interface UpdateHierarchicalStepDto {
  name?: string;
  label?: string;
  description?: string;
  role?: string;
  type?: string;
  rollupOperator?: string;
  weight?: number;
  baseValue?: ScientificValue;
}
