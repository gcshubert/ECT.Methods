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
}

export interface CreateScenarioRequest {
  name: string;
  description: string;
  parameters?: EctParameters;   // optional — API creates with null params if omitted
}

export interface UpdateScenarioRequest {
  name: string;
  description: string;
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
