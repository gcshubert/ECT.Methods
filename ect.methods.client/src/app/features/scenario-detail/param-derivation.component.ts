import {
  Component, OnInit, OnChanges, SimpleChanges,
  inject, input, signal, computed,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormsModule, FormBuilder, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { EctApiService } from '../../core/services/ect-api.service';
import { VariantEditorDialogComponent, VariantEditorDialogData } from './variant-editor-dialog.component';
import { ScientificPipe } from '../../shared/pipes/scientific.pipe';
import {
  ParameterDocumentation,
  SubParameter,
  StepOperation,
  STEP_OPERATION_LABELS,
  ScientificValue,
  UpdateSubParameterRequest,
  CreateSubParameterRequest,
} from '../../core/models/types';

/** One row in the step editor — wraps SubParameter with local edit state */
interface StepRow {
  id: number;
  stepOrder: number;
  name: string;
  coefficient: number;
  exponent: number;
  unit: string;
  rationale: string;
  sourceReference: string;
  operation: StepOperation;
  dirty: boolean;
  saving: boolean;
}

@Component({
  selector: 'app-param-derivation',
  standalone: true,
  imports: [
    CommonModule, FormsModule, ReactiveFormsModule, ScientificPipe,
    MatButtonModule, MatIconModule, MatFormFieldModule, MatInputModule,
    MatSelectModule, MatProgressSpinnerModule, MatTooltipModule, MatSnackBarModule, MatDialogModule,
  ],
  template: `
    <div class="derivation-root">

      <!-- ── Header row ── -->
      <div class="derivation-header">
        <div class="param-badge">
          <span class="param-symbol">{{ paramSymbol() }}</span>
          <span class="param-label">{{ doc()?.label ?? paramKey() }}</span>
        </div>
        <div class="header-actions">
          @if (doc()?.subParameters?.length) {
            <span class="composed-value" [matTooltip]="'Composed value from rollup'">
              = {{ composedDisplay() }}
            </span>
          }
          <button mat-stroked-button class="add-btn" (click)="openVariants()"
                  [disabled]="!doc()">
            <mat-icon>layers</mat-icon> Variants
          </button>
          <button mat-stroked-button class="add-btn" (click)="startAddStep()"
                  [disabled]="addingStep()">
            <mat-icon>add</mat-icon> Add Step
          </button>
        </div>
      </div>

      <!-- ── Loading ── -->
      @if (loading()) {
        <div class="loading-row">
          <mat-spinner diameter="28" />
          <span>Loading derivation…</span>
        </div>
      }

      <!-- ── Narrative ── -->
      @if (!loading() && doc()) {
        <div class="narrative-wrap">
          <textarea
            class="narrative-input"
            rows="2"
            placeholder="Derivation narrative — describe the overall approach for this parameter…"
            [(ngModel)]="narrativeDraft"
            (blur)="saveNarrative()"
          ></textarea>
        </div>
      }

      <!-- ── Step table ── -->
      @if (!loading() && rows().length) {
        <div class="step-table-wrap">
          <table class="step-table">
            <thead>
              <tr>
                <th class="col-op">Op</th>
                <th class="col-name">Step Name</th>
                <th class="col-sv">Coefficient</th>
                <th class="col-sv">Exponent</th>
                <th class="col-unit">Unit</th>
                <th class="col-total">Running Total</th>
                <th class="col-actions"></th>
              </tr>
            </thead>
            <tbody>
              @for (row of rows(); track row.id; let i = $index) {
                <tr class="step-row" [class.step-row--dirty]="row.dirty">

                  <!-- Operation selector — first row is always the seed "=" -->
                  <td class="col-op">
                    @if (i === 0) {
                      <span class="op-seed" matTooltip="Seed value">=</span>
                    } @else {
                      <select
                        class="op-select"
                        [(ngModel)]="row.operation"
                        (ngModelChange)="onOperationChange(row)"
                        [attr.aria-label]="'Operation for step ' + (i + 1)"
                      >
                        @for (op of operationOptions; track op.value) {
                          <option [value]="op.value">{{ op.label }}</option>
                        }
                      </select>
                    }
                  </td>

                  <!-- Step name -->
                  <td class="col-name">
                    <input
                      class="cell-input"
                      type="text"
                      [(ngModel)]="row.name"
                      (ngModelChange)="markDirty(row)"
                      placeholder="Step name"
                    />
                  </td>

                  <!-- Coefficient -->
                  <td class="col-sv">
                    <input
                      class="cell-input cell-input--num"
                      type="number"
                      [(ngModel)]="row.coefficient"
                      (ngModelChange)="markDirty(row)"
                      placeholder="1.0"
                    />
                  </td>

                  <!-- Exponent -->
                  <td class="col-sv">
                    <input
                      class="cell-input cell-input--num"
                      type="number"
                      [(ngModel)]="row.exponent"
                      (ngModelChange)="markDirty(row)"
                      placeholder="0"
                    />
                  </td>

                  <!-- Unit -->
                  <td class="col-unit">
                    <input
                      class="cell-input"
                      type="text"
                      [(ngModel)]="row.unit"
                      (ngModelChange)="markDirty(row)"
                      placeholder="unit"
                    />
                  </td>

                  <!-- Running total (read-only, from rollup) -->
                  <td class="col-total">
                    @if (rollupMap()[row.stepOrder]; as rt) {
                      <span class="running-total">{{ rt | scientific }}</span>
                    } @else {
                      <span class="running-total running-total--empty">—</span>
                    }
                  </td>

                  <!-- Actions -->
                  <td class="col-actions">
                    <div class="row-actions">
                      @if (row.dirty) {
                        <button
                          mat-icon-button class="save-btn"
                          matTooltip="Save step"
                          [disabled]="row.saving"
                          (click)="saveStep(row)"
                        >
                          @if (row.saving) {
                            <mat-spinner diameter="16" />
                          } @else {
                            <mat-icon>check</mat-icon>
                          }
                        </button>
                      }
                      <button
                        mat-icon-button class="delete-btn"
                        matTooltip="Delete step"
                        (click)="deleteStep(row)"
                      >
                        <mat-icon>close</mat-icon>
                      </button>
                    </div>
                  </td>

                </tr>
              }
            </tbody>
          </table>
        </div>
      }

      <!-- ── Empty state ── -->
      @if (!loading() && !rows().length && !addingStep()) {
        <div class="empty-state">
          <mat-icon class="empty-icon">account_tree</mat-icon>
          <p>No derivation steps yet.</p>
          <p class="empty-sub">Add steps to build the derivation chain for this parameter.</p>
        </div>
      }

      <!-- ── Add step form ── -->
      @if (addingStep()) {
        <div class="add-step-form">
          <h4 class="add-step-title">New Step</h4>
          <div class="add-step-fields">

            <!-- Operation (disabled for step 0) -->
            <div class="add-field">
              <label class="field-label">Operation</label>
              @if (rows().length === 0) {
                <span class="op-seed op-seed--add">=</span>
              } @else {
                <select class="op-select op-select--add" [(ngModel)]="newStep.operation">
                  @for (op of operationOptions; track op.value) {
                    <option [value]="op.value">{{ op.label }}</option>
                  }
                </select>
              }
            </div>

            <div class="add-field add-field--name">
              <label class="field-label">Name</label>
              <input class="cell-input" type="text"
                     [(ngModel)]="newStep.name" placeholder="e.g. Base metabolic rate" />
            </div>

            <div class="add-field">
              <label class="field-label">Coefficient</label>
              <input class="cell-input cell-input--num" type="number"
                     [(ngModel)]="newStep.coefficient" placeholder="1.0" />
            </div>

            <div class="add-field">
              <label class="field-label">Exponent</label>
              <input class="cell-input cell-input--num" type="number"
                     [(ngModel)]="newStep.exponent" placeholder="0" />
            </div>

            <div class="add-field">
              <label class="field-label">Unit</label>
              <input class="cell-input" type="text"
                     [(ngModel)]="newStep.unit" placeholder="e.g. J" />
            </div>

          </div>

          <div class="add-step-actions">
            <button mat-flat-button color="primary" (click)="confirmAddStep()"
                    [disabled]="!newStep.name || addStepSaving()">
              {{ addStepSaving() ? 'Adding…' : 'Add Step' }}
            </button>
            <button mat-stroked-button (click)="cancelAddStep()">Cancel</button>
          </div>
        </div>
      }

    </div>
  `,
  styles: [`
    /* ── Root ── */
    .derivation-root {
      padding: 1rem 0;
    }

    /* ── Header ── */
    .derivation-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 1rem;
      gap: 1rem;
    }
    .param-badge {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }
    .param-symbol {
      font-size: 1.4rem;
      font-weight: 700;
      font-family: 'Georgia', serif;
      font-style: italic;
      color: #38bdf8;
      min-width: 1.5rem;
    }
    .param-label {
      font-size: 1rem;
      font-weight: 600;
      color: #e2e8f0;
    }
    .header-actions {
      display: flex;
      align-items: center;
      gap: 1rem;
    }
    .composed-value {
      font-family: monospace;
      font-size: 0.85rem;
      color: #38bdf8;
      background: rgba(56,189,248,0.08);
      padding: 0.2rem 0.6rem;
      border-radius: 4px;
      border: 1px solid rgba(56,189,248,0.2);
    }
    .add-btn {
      font-size: 0.8rem;
      height: 32px;
      line-height: 32px;
      color: #94a3b8 !important;
      border-color: #334155 !important;
    }
    .add-btn:hover {
      color: #38bdf8 !important;
      border-color: #38bdf8 !important;
    }

    /* ── Loading ── */
    .loading-row {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      color: #64748b;
      font-size: 0.875rem;
      padding: 1rem 0;
    }

    /* ── Narrative ── */
    .narrative-wrap {
      margin-bottom: 1rem;
    }
    .narrative-input {
      width: 100%;
      background: #0f172a;
      border: 1px solid #334155;
      border-radius: 6px;
      color: #cbd5e1;
      font-size: 0.825rem;
      padding: 0.6rem 0.75rem;
      resize: vertical;
      font-family: inherit;
      box-sizing: border-box;
      transition: border-color 0.15s;
    }
    .narrative-input:focus {
      outline: none;
      border-color: #38bdf8;
    }
    .narrative-input::placeholder { color: #475569; }

    /* ── Step table ── */
    .step-table-wrap {
      overflow-x: auto;
      border: 1px solid #1e293b;
      border-radius: 8px;
    }
    .step-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 0.8rem;
    }
    .step-table thead tr {
      background: #0f172a;
    }
    .step-table th {
      padding: 0.5rem 0.75rem;
      text-align: left;
      font-size: 0.7rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.07em;
      color: #475569;
      border-bottom: 1px solid #1e293b;
      white-space: nowrap;
    }
    .step-row {
      border-bottom: 1px solid #1e293b;
      background: #1e293b;
      transition: background 0.1s;
    }
    .step-row:last-child { border-bottom: none; }
    .step-row:hover { background: #263348; }
    .step-row--dirty { background: rgba(251,191,36,0.04); }
    .step-table td {
      padding: 0.4rem 0.5rem;
      vertical-align: middle;
    }

    /* ── Column widths ── */
    .col-op      { width: 70px; text-align: center; }
    .col-name    { min-width: 160px; }
    .col-sv      { width: 110px; }
    .col-unit    { width: 80px; }
    .col-total   { width: 160px; }
    .col-actions { width: 72px; }

    /* ── Operation cell ── */
    .op-seed {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 32px;
      height: 28px;
      background: rgba(56,189,248,0.08);
      border: 1px solid rgba(56,189,248,0.2);
      border-radius: 4px;
      font-weight: 700;
      font-size: 1rem;
      color: #38bdf8;
      cursor: default;
    }
    .op-select {
      width: 52px;
      height: 28px;
      background: #0f172a;
      border: 1px solid #334155;
      border-radius: 4px;
      color: #e2e8f0;
      font-size: 1rem;
      text-align: center;
      cursor: pointer;
      transition: border-color 0.15s;
    }
    .op-select:focus {
      outline: none;
      border-color: #38bdf8;
    }

    /* ── Cell inputs ── */
    .cell-input {
      width: 100%;
      background: transparent;
      border: 1px solid transparent;
      border-radius: 4px;
      color: #e2e8f0;
      font-size: 0.8rem;
      padding: 0.25rem 0.4rem;
      font-family: inherit;
      box-sizing: border-box;
      transition: border-color 0.15s, background 0.15s;
    }
    .cell-input:hover {
      border-color: #334155;
      background: #0f172a;
    }
    .cell-input:focus {
      outline: none;
      border-color: #38bdf8;
      background: #0f172a;
    }
    .cell-input--num {
      font-family: monospace;
      text-align: right;
    }
    .cell-input::placeholder { color: #475569; }

    /* ── Running total ── */
    .running-total {
      font-family: monospace;
      font-size: 0.78rem;
      color: #38bdf8;
    }
    .running-total--empty { color: #334155; }

    /* ── Row action buttons ── */
    .row-actions {
      display: flex;
      align-items: center;
      gap: 0.1rem;
    }
    .save-btn { color: #4ade80 !important; }
    .delete-btn { color: #475569 !important; }
    .delete-btn:hover { color: #f87171 !important; }

    /* ── Empty state ── */
    .empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 2.5rem 1rem;
      color: #475569;
      text-align: center;
    }
    .empty-icon {
      font-size: 2.5rem;
      width: 2.5rem;
      height: 2.5rem;
      margin-bottom: 0.75rem;
      color: #334155;
    }
    .empty-state p { margin: 0.2rem 0; font-size: 0.875rem; }
    .empty-sub { font-size: 0.78rem; color: #334155; }

    /* ── Add step form ── */
    .add-step-form {
      margin-top: 1rem;
      background: #0f172a;
      border: 1px solid #334155;
      border-radius: 8px;
      padding: 1rem 1.25rem;
    }
    .add-step-title {
      margin: 0 0 0.75rem;
      font-size: 0.8rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.07em;
      color: #64748b;
    }
    .add-step-fields {
      display: flex;
      flex-wrap: wrap;
      gap: 0.75rem;
      align-items: flex-end;
      margin-bottom: 0.75rem;
    }
    .add-field {
      display: flex;
      flex-direction: column;
      gap: 0.3rem;
    }
    .add-field--name { flex: 1 1 200px; }
    .field-label {
      font-size: 0.68rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.07em;
      color: #475569;
    }
    .op-seed--add {
      margin-top: 2px;
    }
    .op-select--add {
      width: 60px;
      height: 34px;
      font-size: 1rem;
    }
    .add-step-actions {
      display: flex;
      gap: 0.5rem;
    }
  `],
})
export class ParamDerivationComponent implements OnInit, OnChanges {
  // Inputs — passed from scenario-detail
  scenarioId = input.required<number>();
  paramKey   = input.required<string>();
  paramSymbol = input<string>('?');

  private api      = inject(EctApiService);
  private snackbar = inject(MatSnackBar);
  private dialog   = inject(MatDialog);

  // ── State ────────────────────────────────────────────────────────────────
  loading      = signal(true);
  doc          = signal<ParameterDocumentation | null>(null);
  rows         = signal<StepRow[]>([]);
  rollupMap    = signal<Record<number, ScientificValue>>({});
  addingStep   = signal(false);
  addStepSaving = signal(false);
  narrativeDraft = '';

  composedDisplay = computed(() => {
    const keys = Object.keys(this.rollupMap());
    if (!keys.length) return '—';
    // The last step's running total is the composed value
    const maxOrder = Math.max(...keys.map(Number));
    const val = this.rollupMap()[maxOrder];
    return val ? `${val.coefficient} × 10^${val.exponent}` : '—';
  });

  // ── Operation options for <select> ───────────────────────────────────────
  readonly operationOptions = Object.entries(STEP_OPERATION_LABELS).map(
    ([value, label]) => ({ value: +value as StepOperation, label })
  );

  // ── New step defaults ────────────────────────────────────────────────────
  newStep = this.blankNewStep();

  private blankNewStep() {
    return {
      name: '',
      coefficient: 1,
      exponent: 0,
      unit: '',
      rationale: '',
      sourceReference: '',
      operation: StepOperation.Multiply,
    };
  }

  // ── Lifecycle ────────────────────────────────────────────────────────────
  ngOnInit() {
    this.loadDoc();
  }

  ngOnChanges(changes: SimpleChanges) {
    if (
      (changes['scenarioId'] || changes['paramKey']) &&
      !changes['scenarioId']?.firstChange &&
      !changes['paramKey']?.firstChange
    ) {
      this.loadDoc();
    }
  }

  // ── Open variant editor ─────────────────────────────────────────────────
  openVariants() {
    // Always reload fresh doc before opening so step list is current
    this.api.getDocumentation(this.scenarioId(), this.paramKey()).subscribe({
      next: (freshDoc) => {
        this.doc.set(freshDoc);
        this.rows.set(freshDoc.subParameters.map(s => this.toRow(s)));
        const data: VariantEditorDialogData = {
          scenarioId: this.scenarioId(),
          paramKey:   this.paramKey(),
          paramLabel: this.paramSymbol(),
          doc:        freshDoc,
        };
        this.dialog.open(VariantEditorDialogComponent, {
          width: '820px',
          maxHeight: '90vh',
          panelClass: 'dark-dialog',
          data,
        }).afterClosed().subscribe((updatedVariants) => {
          if (updatedVariants && this.doc()) {
            this.doc.update(d => d ? { ...d, variants: updatedVariants } : d);
          }
        });
      },
      error: () =>
        this.snackbar.open('Failed to load documentation', 'Dismiss', { duration: 3000 }),
    });
  }

  // ── Load documentation + rollup ──────────────────────────────────────────
  private loadDoc() {
    this.loading.set(true);
    this.api.getDocumentation(this.scenarioId(), this.paramKey()).subscribe({
      next: (doc) => {
        this.doc.set(doc);
        this.narrativeDraft = doc.derivationNarrative ?? '';
        this.rows.set(doc.subParameters.map(s => this.toRow(s)));
        this.loading.set(false);
        this.loadRollup();
      },
      error: (err) => {
        // 404 is expected when no doc exists yet — treat as empty
        if (err.status === 404) {
          this.doc.set(null);
          this.rows.set([]);
        }
        this.loading.set(false);
      },
    });
  }

  private loadRollup() {
    this.api.getRollup(this.scenarioId(), this.paramKey()).subscribe({
      next: (result) => {
        const map: Record<number, ScientificValue> = {};
        for (const step of result.steps) {
          map[step.stepOrder] = step.runningTotal;
        }
        this.rollupMap.set(map);
      },
      error: () => {
        // Rollup is optional — silently ignore if unavailable
      },
    });
  }

  // ── Narrative ────────────────────────────────────────────────────────────
  saveNarrative() {
    if (!this.doc() && !this.narrativeDraft) return;
    this.api
      .upsertDocumentation(this.scenarioId(), this.paramKey(), {
        label: this.doc()?.label ?? this.paramKey().toUpperCase(),
        derivationNarrative: this.narrativeDraft,
        subParameters: [],
      })
      .subscribe({ next: (doc) => this.doc.set(doc) });
  }

  // ── Operation change (Phase 4a) ───────────────────────────────────────────
  onOperationChange(row: StepRow) {
    row.dirty = true;
    this.saveStep(row);
  }

  // ── Step CRUD ─────────────────────────────────────────────────────────────
  markDirty(row: StepRow) {
    row.dirty = true;
  }

  saveStep(row: StepRow) {
    row.saving = true;
    const payload: UpdateSubParameterRequest = {
      stepOrder: row.stepOrder,
      name: row.name,
      value: { coefficient: row.coefficient, exponent: row.exponent },
      unit: row.unit,
      rationale: row.rationale,
      sourceReference: row.sourceReference,
      operation: row.operation,
    };
    this.api
      .updateSubParameter(this.scenarioId(), this.paramKey(), row.id, payload)
      .subscribe({
        next: (updated) => {
          Object.assign(row, this.toRow(updated));
          row.dirty  = false;
          row.saving = false;
          this.loadRollup();
        },
        error: () => {
          row.saving = false;
          this.snackbar.open('Failed to save step', 'Dismiss', { duration: 3000 });
        },
      });
  }

  deleteStep(row: StepRow) {
    this.api
      .deleteSubParameter(this.scenarioId(), this.paramKey(), row.id)
      .subscribe({
        next: () => {
          this.rows.update(rs => rs.filter(r => r.id !== row.id));
          this.loadRollup();
        },
        error: () =>
          this.snackbar.open('Failed to delete step', 'Dismiss', { duration: 3000 }),
      });
  }

  // ── Add step ─────────────────────────────────────────────────────────────
  startAddStep() {
    this.newStep = this.blankNewStep();
    this.addingStep.set(true);
  }

  cancelAddStep() {
    this.addingStep.set(false);
  }

  confirmAddStep() {
    if (!this.newStep.name) return;
    this.addStepSaving.set(true);

    const nextOrder = this.rows().length
      ? Math.max(...this.rows().map(r => r.stepOrder)) + 1
      : 0;

    const payload: CreateSubParameterRequest = {
      stepOrder: nextOrder,
      name: this.newStep.name,
      value: { coefficient: this.newStep.coefficient, exponent: this.newStep.exponent },
      unit: this.newStep.unit,
      rationale: this.newStep.rationale,
      sourceReference: this.newStep.sourceReference,
      operation: this.rows().length === 0
        ? StepOperation.Multiply  // seed row — operation is irrelevant but required
        : this.newStep.operation,
    };

    this.api.addSubParameter(this.scenarioId(), this.paramKey(), payload).subscribe({
      next: (step) => {
        this.rows.update(rs => [...rs, this.toRow(step)]);
        this.addingStep.set(false);
        this.addStepSaving.set(false);
        this.loadRollup();
      },
      error: () => {
        this.addStepSaving.set(false);
        this.snackbar.open('Failed to add step', 'Dismiss', { duration: 3000 });
      },
    });
  }

  // ── Helpers ──────────────────────────────────────────────────────────────
  private toRow(s: SubParameter): StepRow {
    return {
      id:              s.id,
      stepOrder:       s.stepOrder,
      name:            s.name,
      coefficient:     s.value.coefficient,
      exponent:        s.value.exponent,
      unit:            s.unit,
      rationale:       s.rationale,
      sourceReference: s.sourceReference,
      operation:       s.operation,
      dirty:           false,
      saving:          false,
    };
  }
}
