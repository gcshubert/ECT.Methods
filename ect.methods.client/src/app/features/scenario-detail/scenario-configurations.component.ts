// ═══════════════════════════════════════════════════════════════════════════
// FILE 1: src/app/features/scenario-detail/scenario-configurations.component.ts
// ═══════════════════════════════════════════════════════════════════════════

import {
  Component, OnInit, OnChanges, SimpleChanges,
  inject, input, signal, computed,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { EctApiService } from '../../core/services/ect-api.service';
import { ScientificPipe } from '../../shared/pipes/scientific.pipe';
import {
  ScenarioConfiguration,
  ScenarioConfigurationEntry,
  ParameterDocumentation,
  CreateScenarioConfigurationRequest,
} from '../../core/models/types';

// ── param metadata (mirrors scenario-detail.paramDefs) ──────────────────────
const PARAM_DEFS = [
  { key: 'energy',        symbol: 'E', label: 'Energy'     },
  { key: 'control',       symbol: 'C', label: 'Control'    },
  { key: 'complexity',    symbol: 'k', label: 'Complexity' },
  { key: 'timeAvailable', symbol: 'T', label: 'Time'       },
];

@Component({
  selector: 'app-scenario-configurations',
  standalone: true,
  imports: [
    CommonModule, FormsModule, ScientificPipe,
    MatButtonModule, MatIconModule,
    MatProgressSpinnerModule, MatTooltipModule, MatSnackBarModule,
  ],
  template: `
    <div class="configs-root">

      <!-- ── Toolbar ── -->
      <div class="configs-toolbar">
        <span class="toolbar-hint">
          Each configuration captures which variant is active per parameter.
          Activate a configuration to apply it and recompute the deficit.
        </span>
        <button mat-stroked-button class="new-config-btn"
                (click)="startCreate()"
                [disabled]="creating()">
          <mat-icon>add</mat-icon> New Configuration
        </button>
      </div>

      <!-- ── Inline create form ── -->
      @if (creating()) {
        <div class="create-form">
          <div class="create-form-inner">
            <mat-icon class="create-icon">tune</mat-icon>
            <div class="create-fields">
              <input
                class="create-input"
                type="text"
                [(ngModel)]="newName"
                placeholder="Configuration name…"
                (keydown.enter)="confirmCreate()"
                (keydown.escape)="cancelCreate()"
                autofocus
              />
              <input
                class="create-input create-input--sub"
                type="text"
                [(ngModel)]="newDescription"
                placeholder="Description (optional)"
                (keydown.enter)="confirmCreate()"
                (keydown.escape)="cancelCreate()"
              />
              <div class="create-hint">
                <mat-icon class="hint-icon">info</mat-icon>
                Will clone the current active variant state across all parameters.
              </div>
            </div>
            <div class="create-actions">
              <button mat-icon-button class="save-btn"
                      matTooltip="Create configuration"
                      [disabled]="!newName || saving()"
                      (click)="confirmCreate()">
                @if (saving()) {
                  <mat-spinner diameter="16" />
                } @else {
                  <mat-icon>check</mat-icon>
                }
              </button>
              <button mat-icon-button (click)="cancelCreate()" matTooltip="Cancel">
                <mat-icon>close</mat-icon>
              </button>
            </div>
          </div>
        </div>
      }

      <!-- ── Loading ── -->
      @if (loading()) {
        <div class="loading-row">
          <mat-spinner diameter="28" />
          <span>Loading configurations…</span>
        </div>
      }

      <!-- ── Empty state ── -->
      @if (!loading() && !creating() && !configs().length) {
        <div class="empty-state">
          <mat-icon class="empty-icon">tune</mat-icon>
          <p>No configurations yet.</p>
          <p class="empty-sub">
            Create a configuration to capture the current variant state
            and run a named deficit analysis.
          </p>
        </div>
      }

      <!-- ── Configuration cards ── -->
      @if (!loading() && configs().length) {
        <div class="configs-list">
          @for (config of configs(); track config.id) {
            <div class="config-card" [class.config-card--activating]="activatingId() === config.id">

              <!-- Card header -->
              <div class="card-header">
                <div class="card-title-row">
                  <span class="config-index">{{ config.sortOrder + 1 }}</span>
                  <div class="card-title-block">
                    <span class="config-name">{{ config.name }}</span>
                    @if (config.description) {
                      <span class="config-desc">{{ config.description }}</span>
                    }
                  </div>
                </div>
                <div class="card-actions">
                  <button mat-stroked-button class="activate-btn"
                          [disabled]="activatingId() !== null"
                          (click)="activate(config)"
                          matTooltip="Apply all variants and recompute deficit">
                    @if (activatingId() === config.id) {
                      <mat-spinner diameter="14" />
                      <span>Activating…</span>
                    } @else {
                      <ng-container>
                        <mat-icon>play_arrow</mat-icon>
                        <span>Activate & Run</span>
                      </ng-container>
                    }
                  </button>
                  <button mat-icon-button class="delete-btn"
                          matTooltip="Delete configuration"
                          [disabled]="activatingId() !== null"
                          (click)="deleteConfig(config)">
                    <mat-icon>delete_outline</mat-icon>
                  </button>
                </div>
              </div>

              <!-- Parameter entries grid -->
              <div class="entries-grid">
                @for (param of paramDefs; track param.key) {
                  @if (entryFor(config, param.key); as entry) {
                    <div class="entry-cell" [class.entry-cell--variant]="entry.variantId !== null">
                      <span class="entry-symbol">{{ param.symbol }}</span>
                      <div class="entry-info">
                        <span class="entry-param">{{ param.label }}</span>
                        <span class="entry-variant"
                              [class.entry-variant--base]="!entry.variantId">
                          {{ entry.variantLabel }}
                        </span>
                      </div>
                      @if (entry.snapshotValue) {
                        <span class="entry-snapshot">
                          {{ entry.snapshotValue | scientific }}
                        </span>
                      }
                    </div>
                  } @else {
                    <div class="entry-cell entry-cell--empty">
                      <span class="entry-symbol">{{ param.symbol }}</span>
                      <div class="entry-info">
                        <span class="entry-param">{{ param.label }}</span>
                        <span class="entry-variant entry-variant--base">Base</span>
                      </div>
                    </div>
                  }
                }
              </div>

              <!-- Deficit result -->
              @if (config.deficitAnalysis) {
                <div class="deficit-row">
                  <span class="deficit-label">Last result</span>
                  <span class="deficit-type">{{ config.deficitAnalysis.deficitType }}</span>
                  <span class="deficit-notes">{{ config.deficitAnalysis.deficitInterpretation }}</span>
                  <div class="deficit-values">
                    <span class="deficit-val">
                      C<sub>req</sub> = {{ config.deficitAnalysis.cRequired | scientific }}
                    </span>
                    <span class="deficit-sep">·</span>
                    <span class="deficit-val">
                      C<sub>avail</sub> = {{ config.deficitAnalysis.cAvailable | scientific }}
                    </span>
                    <span class="deficit-sep">·</span>
                    <span class="deficit-val deficit-val--highlight">
                      Δ = {{ config.deficitAnalysis.cDeficit | scientific }}
                    </span>
                  </div>
                </div>
              } @else {
                <div class="deficit-row deficit-row--empty">
                  <mat-icon class="deficit-empty-icon">pending</mat-icon>
                  <span>Not yet run — click Activate & Run to compute deficit.</span>
                </div>
              }

            </div>
          }
        </div>
      }

    </div>
  `,
  styles: [`
    .configs-root { padding: 0; }

    /* ── Toolbar ── */
    .configs-toolbar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 1.25rem;
      gap: 1rem;
    }
    .toolbar-hint {
      color: #64748b;
      font-size: 0.8rem;
      line-height: 1.4;
      max-width: 520px;
    }
    .new-config-btn {
      color: #38bdf8 !important;
      border-color: #38bdf8 !important;
      white-space: nowrap;
      flex-shrink: 0;
    }

    /* ── Create form ── */
    .create-form {
      background: #1e293b;
      border: 1px dashed #38bdf8;
      border-radius: 8px;
      padding: 1rem 1.25rem;
      margin-bottom: 1rem;
    }
    .create-form-inner {
      display: flex;
      align-items: flex-start;
      gap: 0.75rem;
    }
    .create-icon { color: #38bdf8; margin-top: 0.35rem; flex-shrink: 0; }
    .create-fields { flex: 1; display: flex; flex-direction: column; gap: 0.5rem; }
    .create-input {
      width: 100%;
      background: #0f172a;
      border: 1px solid #334155;
      border-radius: 6px;
      color: #e2e8f0;
      font-size: 0.9rem;
      padding: 0.5rem 0.75rem;
      font-family: inherit;
      box-sizing: border-box;
    }
    .create-input:focus { outline: none; border-color: #38bdf8; }
    .create-input--sub { font-size: 0.82rem; color: #94a3b8; }
    .create-hint {
      display: flex;
      align-items: center;
      gap: 0.35rem;
      color: #475569;
      font-size: 0.75rem;
    }
    .hint-icon { font-size: 0.9rem; width: 0.9rem; height: 0.9rem; }
    .create-actions { display: flex; flex-direction: column; gap: 0.25rem; }
    .save-btn { color: #4ade80 !important; }

    /* ── Loading ── */
    .loading-row {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      color: #64748b;
      padding: 2rem 0;
    }

    /* ── Empty state ── */
    .empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 3rem 1rem;
      color: #475569;
      text-align: center;
    }
    .empty-icon { font-size: 2.5rem; width: 2.5rem; height: 2.5rem; margin-bottom: 0.75rem; }
    .empty-sub { font-size: 0.82rem; color: #334155; max-width: 380px; line-height: 1.5; }

    /* ── Config card ── */
    .configs-list { display: flex; flex-direction: column; gap: 0.875rem; }

    .config-card {
      background: #1e293b;
      border: 1px solid #334155;
      border-radius: 10px;
      overflow: hidden;
      transition: border-color 0.15s;
    }
    .config-card:hover { border-color: #475569; }
    .config-card--activating { border-color: #38bdf8; opacity: 0.85; }

    /* Card header */
    .card-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0.875rem 1.25rem;
      border-bottom: 1px solid #1e293b;
      gap: 1rem;
    }
    .card-title-row {
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }
    .config-index {
      width: 24px; height: 24px;
      border-radius: 50%;
      background: #0f172a;
      border: 1px solid #334155;
      color: #64748b;
      font-size: 0.72rem;
      font-weight: 600;
      display: flex; align-items: center; justify-content: center;
      flex-shrink: 0;
    }
    .card-title-block { display: flex; flex-direction: column; gap: 0.15rem; }
    .config-name { color: #e2e8f0; font-weight: 600; font-size: 0.95rem; }
    .config-desc { color: #64748b; font-size: 0.78rem; }

    .card-actions { display: flex; align-items: center; gap: 0.5rem; }
    .activate-btn {
      display: flex; align-items: center; gap: 0.35rem;
      color: #4ade80 !important;
      border-color: #4ade80 !important;
      font-size: 0.82rem !important;
      height: 32px !important;
      padding: 0 0.75rem !important;
    }
    .activate-btn mat-icon { font-size: 1rem; width: 1rem; height: 1rem; }
    .delete-btn { color: #475569 !important; width: 32px; height: 32px; }
    .delete-btn:hover { color: #f87171 !important; }

    /* Entries grid */
    .entries-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      border-bottom: 1px solid #0f172a;
    }
    .entry-cell {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.625rem 1rem;
      border-right: 1px solid #0f172a;
    }
    .entry-cell:last-child { border-right: none; }
    .entry-cell--variant { background: rgba(56,189,248,0.04); }
    .entry-cell--empty { opacity: 0.5; }

    .entry-symbol {
      font-size: 1.1rem;
      font-weight: 700;
      color: #38bdf8;
      font-family: 'Georgia', serif;
      font-style: italic;
      flex-shrink: 0;
      width: 18px;
    }
    .entry-info { display: flex; flex-direction: column; gap: 0.1rem; flex: 1; min-width: 0; }
    .entry-param { color: #64748b; font-size: 0.7rem; text-transform: uppercase; letter-spacing: 0.06em; }
    .entry-variant {
      color: #38bdf8;
      font-size: 0.78rem;
      font-weight: 500;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .entry-variant--base { color: #475569; }
    .entry-snapshot {
      color: #94a3b8;
      font-family: monospace;
      font-size: 0.7rem;
      white-space: nowrap;
      flex-shrink: 0;
    }

    /* Deficit row */
    .deficit-row {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      padding: 0.625rem 1.25rem;
      background: #0f172a;
      flex-wrap: wrap;
    }
    .deficit-row--empty {
      color: #334155;
      font-size: 0.78rem;
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }
    .deficit-empty-icon { font-size: 1rem; width: 1rem; height: 1rem; color: #334155; }
    .deficit-label {
      color: #475569;
      font-size: 0.7rem;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      flex-shrink: 0;
    }
    .deficit-type {
      background: rgba(56,189,248,0.12);
      color: #38bdf8;
      font-size: 0.72rem;
      font-weight: 700;
      padding: 0.15rem 0.5rem;
      border-radius: 4px;
      flex-shrink: 0;
    }
    .deficit-notes { color: #64748b; font-size: 0.78rem; flex: 1; }
    .deficit-values {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      flex-wrap: wrap;
    }
    .deficit-val { color: #94a3b8; font-family: monospace; font-size: 0.75rem; }
    .deficit-val--highlight { color: #f59e0b; }
    .deficit-sep { color: #334155; }
  `],
})
export class ScenarioConfigurationsComponent implements OnInit, OnChanges {
  scenarioId = input.required<number>();

  private api      = inject(EctApiService);
  private snackbar = inject(MatSnackBar);

  readonly paramDefs = PARAM_DEFS;

  configs      = signal<ScenarioConfiguration[]>([]);
  loading      = signal(true);
  creating     = signal(false);
  saving       = signal(false);
  activatingId = signal<number | null>(null);

  newName        = '';
  newDescription = '';

  ngOnInit() { this.load(); }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['scenarioId'] && !changes['scenarioId'].firstChange) {
      this.load();
    }
  }

  private load() {
    this.loading.set(true);
    this.api.getConfigurations(this.scenarioId()).subscribe({
      next: (cs) => { this.configs.set(cs); this.loading.set(false); },
      error: ()  => { this.loading.set(false); },
    });
  }

  // ── Create ──────────────────────────────────────────────────────────────

  startCreate() {
    this.newName        = '';
    this.newDescription = '';
    this.creating.set(true);
  }

  cancelCreate() { this.creating.set(false); }

  confirmCreate() {
    if (!this.newName) return;
    this.saving.set(true);
    const payload: CreateScenarioConfigurationRequest = {
      name:        this.newName,
      description: this.newDescription,
    };
    this.api.createConfiguration(this.scenarioId(), payload).subscribe({
      next: (config) => {
        this.configs.update(cs => [...cs, config]);
        this.creating.set(false);
        this.saving.set(false);
        this.snackbar.open(`"${config.name}" created`, 'Dismiss', { duration: 3000 });
      },
      error: () => {
        this.saving.set(false);
        this.snackbar.open('Failed to create configuration', 'Dismiss', { duration: 3000 });
      },
    });
  }

  // ── Activate ─────────────────────────────────────────────────────────────

  activate(config: ScenarioConfiguration) {
    this.activatingId.set(config.id);
    this.api.activateConfiguration(this.scenarioId(), config.id).subscribe({
      next: (updated) => {
        this.configs.update(cs => cs.map(c => c.id === updated.id ? updated : c));
        this.activatingId.set(null);
        this.snackbar.open(`"${config.name}" activated — deficit recomputed`, 'Dismiss', { duration: 4000 });
      },
      error: () => {
        this.activatingId.set(null);
        this.snackbar.open('Failed to activate configuration', 'Dismiss', { duration: 3000 });
      },
    });
  }

  // ── Delete ───────────────────────────────────────────────────────────────

  deleteConfig(config: ScenarioConfiguration) {
    if (!confirm(`Delete configuration "${config.name}"?`)) return;
    this.api.deleteConfiguration(this.scenarioId(), config.id).subscribe({
      next: () => {
        this.configs.update(cs => cs.filter(c => c.id !== config.id));
        this.snackbar.open(`"${config.name}" deleted`, 'Dismiss', { duration: 3000 });
      },
      error: () =>
        this.snackbar.open('Failed to delete configuration', 'Dismiss', { duration: 3000 }),
    });
  }

  // ── Helper ───────────────────────────────────────────────────────────────

  entryFor(config: ScenarioConfiguration, paramKey: string): ScenarioConfigurationEntry | null {
    return config.entries?.find(e => e.parameterKey === paramKey) ?? null;
  }
}
