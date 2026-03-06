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
  createdAt: string;
  parameters?: EctParameters;
  hasAnalysis?: boolean;
}

export interface CreateScenarioRequest {
  name: string;
  description: string;
  parameters: EctParameters;
}

export interface UpdateScenarioRequest {
  name: string;
  description: string;
}

// ─── ECT Parameters ─────────────────────────────────────────────────────────
export interface EctParameters {
  e: ScientificValue;   // Energy
  c: ScientificValue;   // Control (available)
  k: ScientificValue;   // Complexity constant
  t: ScientificValue;   // Time
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
