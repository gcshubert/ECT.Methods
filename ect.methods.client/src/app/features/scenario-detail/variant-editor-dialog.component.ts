import {
  Component, OnInit, inject, signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDividerModule } from '@angular/material/divider';
import { EctApiService } from '../../core/services/ect-api.service';
import { ScientificPipe } from '../../shared/pipes/scientific.pipe';
import {
  ParameterDocumentation,
  ParameterVariant,
  VariantSubParameter,
  SubParameter,
  StepOperation,
  STEP_OPERATION_LABELS,
  ScientificValue,
  UpsertVariantSubParameterRequest,
  CreateParameterVariantRequest,
} from '../../core/models/types';

// ── Dialog input data ────────────────────────────────────────────────────────
export interface VariantEditorDialogData {
  scenarioId: number;
  paramKey: string;
  paramLabel: string;
  doc: ParameterDocumentation;
}

// ── Editable variant sub-parameter row ───────────────────────────────────────
interface VariantStepRow {
  stepOrder: number;
  name: string;
  coefficient: number;
  exponent: number;
  unit: string;
  rationale: string;
  sourceReference: string;
  operation: StepOperation;
}

@Component({
  selector: 'app-variant-editor-dialog',
  standalone: true,
  imports: [
    CommonModule, FormsModule, ScientificPipe,
    MatDialogModule, MatButtonModule, MatIconModule,
    MatFormFieldModule, MatInputModule, MatSelectModule,
    MatProgressSpinnerModule, MatTooltipModule, MatSnackBarModule,
    MatDividerModule,
  ],
  template: `
    <div class="dialog-root">

      <!-- ── Header ── -->
      <div class="dialog-header">
        <div class="header-title">
          <span class="param-chip">{{ data.paramLabel }}</span>
          <h2 class="title">Parameter Variants</h2>
        </div>
        <button mat-icon-button (click)="close()" class="close-btn" matTooltip="Close">
          <mat-icon>close</mat-icon>
        </button>
      </div>

      <div class="dialog-body">

        <!-- ── Left panel: variant list ── -->
        <div class="variant-list-panel">
          <div class="panel-header">
            <span class="panel-label">Variants</span>
            <button mat-icon-button class="add-variant-btn"
                    matTooltip="New variant"
                    (click)="startNewVariant()"
                    [disabled]="creatingVariant()">
              <mat-icon>add</mat-icon>
            </button>
          </div>

          <!-- Base (always shown) -->
          <div class="variant-item"
               [class.variant-item--active]="selectedVariantId() === null"
               (click)="selectVariant(null)">
            <mat-icon class="variant-icon">layers</mat-icon>
            <div class="variant-info">
              <span class="variant-name">Base</span>
              <span class="variant-meta">{{ data.doc.subParameters.length }} steps</span>
            </div>
          </div>

          <!-- Named variants -->
          @for (v of variants(); track v.id) {
            <div class="variant-item"
                 [class.variant-item--active]="selectedVariantId() === v.id"
                 (click)="selectVariant(v.id)">
              <mat-icon class="variant-icon"
                        [class.variant-icon--active]="v.isActive">
                {{ v.isActive ? 'radio_button_checked' : 'radio_button_unchecked' }}
              </mat-icon>
              <div class="variant-info">
                <span class="variant-name">{{ v.name }}</span>
                <span class="variant-meta">{{ v.subParameters.length }} steps</span>
              </div>
              <button mat-icon-button class="delete-variant-btn"
                      matTooltip="Delete variant"
                      (click)="deleteVariant(v); $event.stopPropagation()">
                <mat-icon>delete_outline</mat-icon>
              </button>
            </div>
          }

          <!-- New variant name input -->
          @if (creatingVariant()) {
            <div class="new-variant-form">
              <input class="new-variant-input" type="text"
                     [(ngModel)]="newVariantName"
                     placeholder="Variant name"
                     (keydown.enter)="confirmNewVariant()"
                     (keydown.escape)="creatingVariant.set(false)" />
              <div class="new-variant-actions">
                <button mat-icon-button class="save-btn"
                        [disabled]="!newVariantName || savingNewVariant()"
                        (click)="confirmNewVariant()">
                  @if (savingNewVariant()) {
                    <mat-spinner diameter="16" />
                  } @else {
                    <mat-icon>check</mat-icon>
                  }
                </button>
                <button mat-icon-button (click)="creatingVariant.set(false)">
                  <mat-icon>close</mat-icon>
                </button>
              </div>
            </div>
          }
        </div>

        <mat-divider vertical class="panel-divider" />

        <!-- ── Right panel: step editor ── -->
        <div class="step-editor-panel">

          @if (selectedVariantId() === null) {
            <!-- Base steps — read only in this dialog -->
            <div class="panel-header">
              <span class="panel-label">Base Steps</span>
              <span class="panel-hint">Edit base steps in the Derivation tab</span>
            </div>
            <div class="steps-table-wrap">
              <table class="steps-table">
                <thead>
                  <tr>
                    <th class="col-op">Op</th>
                    <th class="col-name">Name</th>
                    <th class="col-sv">Value</th>
                    <th class="col-unit">Unit</th>
                  </tr>
                </thead>
                <tbody>
                  @for (s of data.doc.subParameters; track s.id; let i = $index) {
                    <tr class="step-row">
                      <td class="col-op">
                        @if (i === 0) {
                          <span class="op-seed">=</span>
                        } @else {
                          <span class="op-label">{{ opLabel(s.operation) }}</span>
                        }
                      </td>
                      <td class="col-name">{{ s.name }}</td>
                      <td class="col-sv mono">
                        {{ s.value | scientific }}
                      </td>
                      <td class="col-unit">{{ s.unit }}</td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>

          } @else {

            <!-- Named variant steps — editable -->
            @if (selectedVariant(); as variant) {
              <div class="panel-header">
                <span class="panel-label">{{ variant.name }}</span>
                @if (!variant.isActive) {
                  <button mat-stroked-button class="activate-btn"
                          [disabled]="activating()"
                          (click)="activateVariant(variant)">
                    <mat-icon>radio_button_checked</mat-icon>
                    {{ activating() ? 'Activating…' : 'Set Active' }}
                  </button>
                } @else {
                  <span class="active-badge">
                    <mat-icon>check_circle</mat-icon> Active
                  </span>
                }
              </div>

              <div class="steps-table-wrap">
                <table class="steps-table">
                  <thead>
                    <tr>
                      <th class="col-op">Op</th>
                      <th class="col-name">Name</th>
                      <th class="col-coeff">Coefficient</th>
                      <th class="col-exp">Exponent</th>
                      <th class="col-unit">Unit</th>
                      <th class="col-actions"></th>
                    </tr>
                  </thead>
                  <tbody>
                    @for (row of editRows(); track row.stepOrder; let i = $index) {
                      <tr class="step-row">
                        <td class="col-op">
                          @if (i === 0) {
                            <span class="op-seed">=</span>
                          } @else {
                            <select class="op-select"
                                    [(ngModel)]="row.operation"
                                    (ngModelChange)="markRowDirty(row)">
                              @for (op of operationOptions; track op.value) {
                                <option [value]="op.value">{{ op.label }}</option>
                              }
                            </select>
                          }
                        </td>
                        <td class="col-name">
                          <input class="cell-input" type="text"
                                 [(ngModel)]="row.name"
                                 (ngModelChange)="markRowDirty(row)" />
                        </td>
                        <td class="col-coeff">
                          <input class="cell-input cell-input--num" type="number"
                                 [(ngModel)]="row.coefficient"
                                 (ngModelChange)="markRowDirty(row)" />
                        </td>
                        <td class="col-exp">
                          <input class="cell-input cell-input--num" type="number"
                                 [(ngModel)]="row.exponent"
                                 (ngModelChange)="markRowDirty(row)" />
                        </td>
                        <td class="col-unit">
                          <input class="cell-input" type="text"
                                 [(ngModel)]="row.unit"
                                 (ngModelChange)="markRowDirty(row)" />
                        </td>
                        <td class="col-actions">
                          @if (dirtyRows().has(row.stepOrder)) {
                            <button mat-icon-button class="save-btn"
                                    matTooltip="Save step"
                                    [disabled]="savingRow() === row.stepOrder"
                                    (click)="saveRow(variant, row)">
                              @if (savingRow() === row.stepOrder) {
                                <mat-spinner diameter="16" />
                              } @else {
                                <mat-icon>check</mat-icon>
                              }
                            </button>
                          }
                        </td>
                      </tr>
                    }
                  </tbody>
                </table>
              </div>
            }
          }

        </div>
      </div>

      <!-- ── Footer ── -->
      <div class="dialog-footer">
        <button mat-flat-button color="primary" (click)="close()">Done</button>
      </div>

    </div>
  `,
  styles: [`
    /* ── Root layout ── */
    .dialog-root {
      display: flex;
      flex-direction: column;
      background: #0f172a;
      color: #e2e8f0;
      width: 780px;
      max-width: 100%;
      max-height: 90vh;
      border-radius: 8px;
      overflow: hidden;
    }

    /* ── Header ── */
    .dialog-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 1rem 1.25rem 0.75rem;
      border-bottom: 1px solid #1e293b;
      flex-shrink: 0;
    }
    .header-title {
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }
    .param-chip {
      background: rgba(56,189,248,0.1);
      border: 1px solid rgba(56,189,248,0.25);
      color: #38bdf8;
      font-size: 0.75rem;
      font-weight: 700;
      font-family: 'Georgia', serif;
      font-style: italic;
      padding: 0.15rem 0.5rem;
      border-radius: 4px;
    }
    .title {
      margin: 0;
      font-size: 1.1rem;
      font-weight: 600;
      color: #f1f5f9;
    }
    .close-btn { color: #475569 !important; }
    .close-btn:hover { color: #94a3b8 !important; }

    /* ── Body ── */
    .dialog-body {
      display: flex;
      flex: 1;
      overflow: hidden;
      min-height: 0;
    }

    /* ── Variant list panel ── */
    .variant-list-panel {
      width: 200px;
      flex-shrink: 0;
      border-right: 1px solid #1e293b;
      overflow-y: auto;
      padding: 0.5rem 0;
    }
    .panel-divider { border-color: #1e293b !important; }

    .panel-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0.5rem 0.75rem;
      margin-bottom: 0.25rem;
    }
    .panel-label {
      font-size: 0.68rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: #94a3b8;
    }
    .panel-hint {
      font-size: 0.7rem;
      color: #64748b;
      font-style: italic;
    }
    .add-variant-btn { color: #475569 !important; width: 28px; height: 28px; }
    .add-variant-btn:hover { color: #38bdf8 !important; }

    .variant-item {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.5rem 0.75rem;
      cursor: pointer;
      border-left: 3px solid transparent;
      transition: background 0.1s, border-color 0.1s;
    }
    .variant-item:hover { background: rgba(56,189,248,0.05); }
    .variant-item--active {
      background: rgba(56,189,248,0.08);
      border-left-color: #38bdf8;
    }
    .variant-icon { font-size: 1rem; width: 1rem; height: 1rem; color: #475569; }
    .variant-icon--active { color: #38bdf8 !important; }
    .variant-info { flex: 1; display: flex; flex-direction: column; min-width: 0; }
    .variant-name { font-size: 0.8rem; color: #e2e8f0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .variant-meta { font-size: 0.68rem; color: #64748b; }
    .delete-variant-btn {
      width: 24px; height: 24px;
      color: #334155 !important;
      opacity: 0;
      transition: opacity 0.1s;
    }
    .variant-item:hover .delete-variant-btn { opacity: 1; }
    .delete-variant-btn:hover { color: #f87171 !important; }

    /* ── New variant form ── */
    .new-variant-form {
      padding: 0.5rem 0.75rem;
    }
    .new-variant-input {
      width: 100%;
      background: #1e293b;
      border: 1px solid #334155;
      border-radius: 4px;
      color: #e2e8f0;
      font-size: 0.8rem;
      padding: 0.3rem 0.5rem;
      box-sizing: border-box;
      margin-bottom: 0.4rem;
    }
    .new-variant-input:focus { outline: none; border-color: #38bdf8; }
    .new-variant-actions { display: flex; gap: 0.25rem; justify-content: flex-end; }

    /* ── Step editor panel ── */
    .step-editor-panel {
      flex: 1;
      display: flex;
      flex-direction: column;
      overflow: hidden;
      min-width: 0;
    }
    .step-editor-panel .panel-header {
      border-bottom: 1px solid #1e293b;
      flex-shrink: 0;
    }

    .activate-btn {
      font-size: 0.75rem;
      height: 28px;
      line-height: 28px;
      color: #38bdf8 !important;
      border-color: rgba(56,189,248,0.3) !important;
    }
    .active-badge {
      display: flex;
      align-items: center;
      gap: 0.3rem;
      font-size: 0.75rem;
      color: #4ade80;
    }
    .active-badge mat-icon { font-size: 1rem; width: 1rem; height: 1rem; }

    /* ── Steps table ── */
    .steps-table-wrap {
      flex: 1;
      overflow-y: auto;
      padding: 0.5rem 0.75rem;
    }
    .steps-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 0.78rem;
    }
    .steps-table th {
      padding: 0.4rem 0.5rem;
      text-align: left;
      font-size: 0.65rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.07em;
      color: #64748b;
      border-bottom: 1px solid #1e293b;
      white-space: nowrap;
    }
    .step-row { border-bottom: 1px solid #0f172a; }
    .step-row:last-child { border-bottom: none; }
    .step-row td { padding: 0.35rem 0.5rem; vertical-align: middle; }

    /* ── Column widths ── */
    .col-op      { width: 52px; text-align: center; }
    .col-name    { min-width: 120px; }
    .col-sv      { width: 130px; }
    .col-coeff   { width: 100px; }
    .col-exp     { width: 80px; }
    .col-unit    { width: 70px; }
    .col-actions { width: 40px; }

    /* ── Op display ── */
    .op-seed {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 28px; height: 24px;
      background: rgba(56,189,248,0.08);
      border: 1px solid rgba(56,189,248,0.2);
      border-radius: 4px;
      font-weight: 700;
      color: #38bdf8;
      font-size: 0.9rem;
    }
    .op-label {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 28px; height: 24px;
      background: #1e293b;
      border: 1px solid #334155;
      border-radius: 4px;
      color: #94a3b8;
      font-size: 0.9rem;
    }
    .op-select {
      width: 44px; height: 26px;
      background: #0f172a;
      border: 1px solid #334155;
      border-radius: 4px;
      color: #e2e8f0;
      font-size: 0.9rem;
      text-align: center;
      cursor: pointer;
    }
    .op-select:focus { outline: none; border-color: #38bdf8; }

    /* ── Cell inputs ── */
    .cell-input {
      width: 100%;
      background: transparent;
      border: 1px solid transparent;
      border-radius: 4px;
      color: #e2e8f0;
      font-size: 0.78rem;
      padding: 0.2rem 0.35rem;
      font-family: inherit;
      box-sizing: border-box;
      transition: border-color 0.1s, background 0.1s;
    }
    .cell-input:hover { border-color: #334155; background: #0f172a; }
    .cell-input:focus { outline: none; border-color: #38bdf8; background: #0f172a; }
    .cell-input--num { font-family: monospace; text-align: right; }

    .mono { font-family: monospace; color: #38bdf8; }

    /* ── Row action buttons ── */
    .save-btn { color: #4ade80 !important; width: 28px; height: 28px; }

    /* ── Footer ── */
    .dialog-footer {
      display: flex;
      justify-content: flex-end;
      padding: 0.75rem 1.25rem;
      border-top: 1px solid #1e293b;
      flex-shrink: 0;
    }
  `],
})
export class VariantEditorDialogComponent implements OnInit {
  data: VariantEditorDialogData = inject(MAT_DIALOG_DATA);
  private api      = inject(EctApiService);
  private snackbar = inject(MatSnackBar);
  private dialogRef = inject(MatDialogRef<VariantEditorDialogComponent>);

  // ── State ────────────────────────────────────────────────────────────────
  variants        = signal<ParameterVariant[]>([]);
  selectedVariantId = signal<number | null>(null);
  editRows        = signal<VariantStepRow[]>([]);
  dirtyRows       = signal<Set<number>>(new Set());
  savingRow       = signal<number | null>(null);
  activating      = signal(false);
  creatingVariant = signal(false);
  savingNewVariant = signal(false);
  newVariantName  = '';

  readonly operationOptions = Object.entries(STEP_OPERATION_LABELS).map(
    ([value, label]) => ({ value: +value as StepOperation, label })
  );

  ngOnInit() {
    this.variants.set([...this.data.doc.variants]);
  }

  // ── Variant selection ─────────────────────────────────────────────────────
  selectVariant(id: number | null) {
    this.selectedVariantId.set(id);
    this.dirtyRows.set(new Set());
    if (id === null) {
      this.editRows.set([]);
    } else {
      const v = this.variants().find(v => v.id === id);
      if (v) this.editRows.set(v.subParameters.map(s => this.toRow(s)));
    }
  }

  selectedVariant() {
    const id = this.selectedVariantId();
    return id === null ? null : this.variants().find(v => v.id === id) ?? null;
  }

  // ── Create new variant (clones base steps) ────────────────────────────────
  startNewVariant() {
    this.newVariantName = '';
    this.creatingVariant.set(true);
  }

  confirmNewVariant() {
    if (!this.newVariantName) return;
    this.savingNewVariant.set(true);

    const payload: CreateParameterVariantRequest = {
      name: this.newVariantName,
      subParameters: this.data.doc.subParameters.map(s => ({
        stepOrder:       s.stepOrder,
        name:            s.name,
        value:           s.value,
        unit:            s.unit,
        rationale:       s.rationale,
        sourceReference: s.sourceReference,
        operation:       s.operation,
      })),
    };

    this.api.addVariant(this.data.scenarioId, this.data.paramKey, payload).subscribe({
      next: (variant) => {
        this.variants.update(vs => [...vs, variant]);
        this.creatingVariant.set(false);
        this.savingNewVariant.set(false);
        this.selectVariant(variant.id);
      },
      error: () => {
        this.savingNewVariant.set(false);
        this.snackbar.open('Failed to create variant', 'Dismiss', { duration: 3000 });
      },
    });
  }

  // ── Delete variant ────────────────────────────────────────────────────────
  deleteVariant(variant: ParameterVariant) {
    if (!confirm(`Delete variant "${variant.name}"?`)) return;
    this.api.deleteVariant(this.data.scenarioId, this.data.paramKey, variant.id).subscribe({
      next: () => {
        this.variants.update(vs => vs.filter(v => v.id !== variant.id));
        if (this.selectedVariantId() === variant.id) {
          this.selectVariant(null);
        }
      },
      error: () =>
        this.snackbar.open('Failed to delete variant', 'Dismiss', { duration: 3000 }),
    });
  }

  // ── Activate variant ──────────────────────────────────────────────────────
  activateVariant(variant: ParameterVariant) {
    this.activating.set(true);
    this.api.activateVariant(this.data.scenarioId, this.data.paramKey, {
      variantId: variant.id,
    }).subscribe({
      next: (doc) => {
        // Refresh variant isActive flags from returned doc
        this.variants.set(doc.variants.map(v => ({ ...v })));
        this.activating.set(false);
        this.snackbar.open(`"${variant.name}" is now active`, 'Dismiss', { duration: 3000 });
      },
      error: () => {
        this.activating.set(false);
        this.snackbar.open('Failed to activate variant', 'Dismiss', { duration: 3000 });
      },
    });
  }

  // ── Save variant sub-parameter row ────────────────────────────────────────
  markRowDirty(row: VariantStepRow) {
    this.dirtyRows.update(s => { s.add(row.stepOrder); return new Set(s); });
  }

  saveRow(variant: ParameterVariant, row: VariantStepRow) {
    this.savingRow.set(row.stepOrder);
    const payload: UpsertVariantSubParameterRequest = {
      stepOrder:       row.stepOrder,
      name:            row.name,
      value:           { coefficient: row.coefficient, exponent: row.exponent },
      unit:            row.unit,
      rationale:       row.rationale,
      sourceReference: row.sourceReference,
      operation:       row.operation,
    };
    this.api.upsertVariantSubParameter(
      this.data.scenarioId, this.data.paramKey, variant.id, payload
    ).subscribe({
      next: () => {
        this.dirtyRows.update(s => { s.delete(row.stepOrder); return new Set(s); });
        this.savingRow.set(null);
        // Update local variant data
        this.variants.update(vs => vs.map(v => {
          if (v.id !== variant.id) return v;
          return {
            ...v,
            subParameters: v.subParameters.map(sp =>
              sp.stepOrder === row.stepOrder
                ? { ...sp, name: row.name, value: { coefficient: row.coefficient, exponent: row.exponent }, unit: row.unit, operation: row.operation }
                : sp
            ),
          };
        }));
      },
      error: () => {
        this.savingRow.set(null);
        this.snackbar.open('Failed to save step', 'Dismiss', { duration: 3000 });
      },
    });
  }

  // ── Helpers ──────────────────────────────────────────────────────────────
  opLabel(op: StepOperation): string {
    return STEP_OPERATION_LABELS[op] ?? '×';
  }

  private toRow(s: VariantSubParameter): VariantStepRow {
    return {
      stepOrder:       s.stepOrder,
      name:            s.name,
      coefficient:     s.value.coefficient,
      exponent:        s.value.exponent,
      unit:            s.unit,
      rationale:       s.rationale,
      sourceReference: s.sourceReference,
      operation:       s.operation,
    };
  }

  close() {
    this.dialogRef.close(this.variants());
  }
}
