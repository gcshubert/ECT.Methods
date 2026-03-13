// ═══════════════════════════════════════════════════════════════════════════
// FILE: src/app/features/scenario-detail/scenario-configurations.component.ts
// Phase 5d — Per-entry variant override (click cell to swap variant)
// ═══════════════════════════════════════════════════════════════════════════

import {
  Component, OnInit, OnChanges, SimpleChanges,
  inject, input, signal,
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
  ParameterDefinition,
  ParameterVariant,
  CreateScenarioConfigurationRequest,
  UpdateScenarioConfigurationRequest,
  UpdateConfigurationEntryRequest,
} from '../../core/models/types';


/** Identifies an open variant picker by its config + param key. */
interface PickerTarget {
  configId:  number;
  paramKey:  string;
}

/** Identifies an in-flight entry save. */
interface SavingEntry {
  configId: number;
  paramKey: string;
}


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
                @if (editingId() === config.id) {
                  <!-- ── Inline rename form ── -->
                  <span class="config-index">{{ config.sortOrder + 1 }}</span>
                  <div class="edit-fields">
                    <input
                      class="create-input edit-name-input"
                      type="text"
                      [(ngModel)]="editName"
                      placeholder="Configuration name…"
                      (keydown.enter)="confirmEdit(config)"
                      (keydown.escape)="cancelEdit()"
                      autofocus
                    />
                    <input
                      class="create-input create-input--sub"
                      type="text"
                      [(ngModel)]="editDescription"
                      placeholder="Description (optional)"
                      (keydown.enter)="confirmEdit(config)"
                      (keydown.escape)="cancelEdit()"
                    />
                  </div>
                  <div class="create-actions">
                    <button mat-icon-button class="save-btn"
                            matTooltip="Save"
                            [disabled]="!editName || renaming()"
                            (click)="confirmEdit(config)">
                      @if (renaming()) {
                        <mat-spinner diameter="16" />
                      } @else {
                        <mat-icon>check</mat-icon>
                      }
                    </button>
                    <button mat-icon-button (click)="cancelEdit()" matTooltip="Cancel">
                      <mat-icon>close</mat-icon>
                    </button>
                  </div>
                } @else if (cloningId() === config.id) {
                  <!-- ── Inline clone form ── -->
                  <span class="config-index">{{ config.sortOrder + 1 }}</span>
                  <div class="create-fields">
                    <div class="clone-source-hint">
                      <mat-icon class="hint-icon">content_copy</mat-icon>
                      Cloning <strong>{{ config.name }}</strong>
                    </div>
                    <input
                      class="create-input"
                      type="text"
                      [(ngModel)]="cloneName"
                      placeholder="New configuration name…"
                      (keydown.enter)="confirmClone(config)"
                      (keydown.escape)="cancelClone()"
                      autofocus
                    />
                    <input
                      class="create-input create-input--sub"
                      type="text"
                      [(ngModel)]="cloneDescription"
                      placeholder="Description (optional)"
                      (keydown.enter)="confirmClone(config)"
                      (keydown.escape)="cancelClone()"
                    />
                  </div>
                  <div class="create-actions">
                    <button mat-icon-button class="save-btn"
                            matTooltip="Clone configuration"
                            [disabled]="!cloneName || cloning()"
                            (click)="confirmClone(config)">
                      @if (cloning()) {
                        <mat-spinner diameter="16" />
                      } @else {
                        <mat-icon>check</mat-icon>
                      }
                    </button>
                    <button mat-icon-button (click)="cancelClone()" matTooltip="Cancel">
                      <mat-icon>close</mat-icon>
                    </button>
                  </div>
                } @else {
                  <!-- ── Normal header ── -->
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
                    <button mat-icon-button class="clone-btn"
                            matTooltip="Clone configuration"
                            [disabled]="activatingId() !== null || cloningId() !== null"
                            (click)="startClone(config)">
                      <mat-icon>content_copy</mat-icon>
                    </button>
                    <button mat-icon-button class="edit-btn"
                            matTooltip="Rename configuration"
                            [disabled]="activatingId() !== null"
                            (click)="startEdit(config)">
                      <mat-icon>edit</mat-icon>
                    </button>
                    <button mat-icon-button class="delete-btn"
                            matTooltip="Delete configuration"
                            [disabled]="activatingId() !== null"
                            (click)="deleteConfig(config)">
                      <mat-icon>delete_outline</mat-icon>
                    </button>
                  </div>
                }
              </div>

              <!-- ── Parameter entries grid ── -->
              <div class="entries-grid" [style.grid-template-columns]="'repeat(' + paramDefs().length + ', 1fr)'">
                @for (param of paramDefs(); track param.key) {

                  <!-- Wrapper column: cell + optional picker below -->
                  <div class="entry-col"
                       [class.entry-col--open]="isPickerOpen(config.id, param.key)">

                    @if (entryFor(config, param.key); as entry) {
                      <!-- ── Populated entry cell ── -->
                      <div class="entry-cell"
                           [class.entry-cell--variant]="entry.variantId !== null"
                           [class.entry-cell--clickable]="!isSavingEntry(config.id, param.key)"
                           [class.entry-cell--picker-open]="isPickerOpen(config.id, param.key)"
                           [class.entry-cell--saving]="isSavingEntry(config.id, param.key)"
                           [matTooltip]="isPickerOpen(config.id, param.key) ? '' : param.label + ': ' + entry.variantLabel"
                           matTooltipShowDelay="600"
                           (click)="onCellClick(config, param.key, $event)">

                        @if (isSavingEntry(config.id, param.key)) {
                          <mat-spinner diameter="14" class="entry-spinner" />
                        } @else {
                          <span class="entry-symbol">{{ param.symbol }}</span>
                        }

                        <div class="entry-info">
                          <span class="entry-param">{{ param.label }}</span>
                          <span class="entry-variant"
                                [class.entry-variant--base]="!entry.variantId">
                            {{ entry.variantLabel }}
                          </span>
                        </div>
                        @if (entry.snapshotValue && !isPickerOpen(config.id, param.key)) {
                          <span class="entry-snapshot">
                            {{ entry.snapshotValue | scientific }}
                          </span>
                        }
                        @if (!isSavingEntry(config.id, param.key)) {
                          <mat-icon class="entry-edit-icon">
                            {{ isPickerOpen(config.id, param.key) ? 'expand_less' : 'edit' }}
                          </mat-icon>
                        }
                      </div>
                    } @else {
                      <!-- ── Empty / base entry cell ── -->
                      <div class="entry-cell entry-cell--empty"
                           [class.entry-cell--clickable]="!isSavingEntry(config.id, param.key)"
                           [class.entry-cell--picker-open]="isPickerOpen(config.id, param.key)"
                           [class.entry-cell--saving]="isSavingEntry(config.id, param.key)"
                           [matTooltip]="isPickerOpen(config.id, param.key) ? '' : param.label + ': Base'"
                           matTooltipShowDelay="600"
                           (click)="onCellClick(config, param.key, $event)">

                        @if (isSavingEntry(config.id, param.key)) {
                          <mat-spinner diameter="14" class="entry-spinner" />
                        } @else {
                          <span class="entry-symbol">{{ param.symbol }}</span>
                        }

                        <div class="entry-info">
                          <span class="entry-param">{{ param.label }}</span>
                          <span class="entry-variant entry-variant--base">Base</span>
                        </div>
                        @if (!isSavingEntry(config.id, param.key)) {
                          <mat-icon class="entry-edit-icon">
                            {{ isPickerOpen(config.id, param.key) ? 'expand_less' : 'edit' }}
                          </mat-icon>
                        }
                      </div>
                    }

                    <!-- ── Inline variant picker ── -->
                    @if (isPickerOpen(config.id, param.key)) {
                      <div class="variant-picker" (click)="$event.stopPropagation()">

                        @if (loadingVariants()) {
                          <div class="picker-loading">
                            <mat-spinner diameter="14" />
                            <span>Loading variants…</span>
                          </div>
                        } @else {
                          <!-- Base option -->
                          <button class="picker-option"
                                  [class.picker-option--active]="!entryFor(config, param.key)?.variantId"
                                  (click)="selectVariant(config, param.key, null)">
                            <mat-icon class="picker-check">
                              {{ !entryFor(config, param.key)?.variantId ? 'radio_button_checked' : 'radio_button_unchecked' }}
                            </mat-icon>
                            <span class="picker-option-label picker-option-label--base">Base</span>
                            <span class="picker-option-sub">Default derivation chain</span>
                          </button>

                          @for (variant of variantsFor(param.key); track variant.id) {
                            <button class="picker-option"
                                    [class.picker-option--active]="entryFor(config, param.key)?.variantId === variant.id"
                                    (click)="selectVariant(config, param.key, variant.id)">
                              <mat-icon class="picker-check">
                                {{ entryFor(config, param.key)?.variantId === variant.id ? 'radio_button_checked' : 'radio_button_unchecked' }}
                              </mat-icon>
                              <span class="picker-option-label">{{ variant.name }}</span>
                            </button>
                          }

                          @if (!variantsFor(param.key).length) {
                            <div class="picker-empty">No variants defined for this parameter.</div>
                          }
                        }
                      </div>
                    }

                  </div><!-- /entry-col -->
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

    .edit-fields {
      flex: 1;
      display: flex;
      gap: 0.5rem;
      align-items: center;
    }
    .edit-name-input { flex: 1 1 180px; }
    .edit-btn { color: #475569 !important; width: 32px; height: 32px; }
    .edit-btn:hover { color: #38bdf8 !important; }
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

    /* ── Entries grid ── */
    .entries-grid {
      display: grid;
      border-bottom: 1px solid #0f172a;
    }

    /* Each column in the grid wraps the cell + picker vertically */
    .entry-col {
      display: flex;
      flex-direction: column;
      border-right: 1px solid #0f172a;
    }
    .entry-col:last-child { border-right: none; }
    .entry-col--open { background: rgba(56,189,248,0.03); }

    /* Entry cell */
    .entry-cell {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.625rem 1rem;
      position: relative;
      transition: background 0.1s;
    }
    .entry-cell--variant { background: rgba(56,189,248,0.04); }
    .entry-cell--empty { opacity: 0.6; }
    .entry-cell--saving { opacity: 0.6; pointer-events: none; }

    /* Clickable affordance */
    .entry-cell--clickable {
      cursor: pointer;
    }
    .entry-cell--clickable:hover {
      background: rgba(56,189,248,0.08);
    }
    .entry-cell--clickable:hover .entry-edit-icon {
      opacity: 1;
    }
    .entry-cell--picker-open {
      background: rgba(56,189,248,0.1) !important;
      border-bottom: 1px solid rgba(56,189,248,0.3);
    }

    /* Edit icon — only visible on hover or when picker open */
    .entry-edit-icon {
      font-size: 0.85rem;
      width: 0.85rem;
      height: 0.85rem;
      color: #38bdf8;
      opacity: 0;
      flex-shrink: 0;
      margin-left: auto;
      transition: opacity 0.1s;
    }
    .entry-cell--picker-open .entry-edit-icon { opacity: 1; }

    .entry-spinner { flex-shrink: 0; }

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
    .entry-param {
      color: #64748b;
      font-size: 0.7rem;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      max-width: 100%;
    }
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

    /* ── Variant picker ── */
    .variant-picker {
      border-top: 1px solid rgba(56,189,248,0.15);
      background: #0f172a;
      padding: 0.375rem 0;
    }

    .picker-loading {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.5rem 0.875rem;
      color: #64748b;
      font-size: 0.75rem;
    }

    .picker-option {
      display: grid;
      grid-template-columns: 16px 1fr;
      grid-template-rows: auto auto;
      column-gap: 0.4rem;
      width: 100%;
      background: none;
      border: none;
      padding: 0.45rem 0.875rem;
      text-align: left;
      cursor: pointer;
      transition: background 0.1s;
      font-family: inherit;
    }
    .picker-option:hover { background: rgba(56,189,248,0.07); }
    .picker-option--active { background: rgba(56,189,248,0.1); }

    .picker-check {
      grid-row: 1 / 3;
      align-self: center;
      font-size: 0.9rem;
      width: 0.9rem;
      height: 0.9rem;
      color: #38bdf8;
      flex-shrink: 0;
    }
    .picker-option-label {
      color: #e2e8f0;
      font-size: 0.8rem;
      font-weight: 500;
      line-height: 1.3;
    }
    .picker-option-label--base { color: #94a3b8; }
    .picker-option-sub {
      color: #475569;
      font-size: 0.7rem;
      line-height: 1.3;
      grid-column: 2;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .picker-empty {
      padding: 0.5rem 0.875rem;
      color: #334155;
      font-size: 0.75rem;
      font-style: italic;
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
      width: fit-content;
    }
    .clone-btn { color: #475569 !important; width: 32px; height: 32px; }
    .clone-btn:hover { color: #38bdf8 !important; }
    .clone-source-hint {
      display: flex;
      align-items: center;
      gap: 0.35rem;
      color: #475569;
      font-size: 0.75rem;
      margin-bottom: 0.25rem;
    }
    .clone-source-hint strong { color: #94a3b8; }
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

  configs      = signal<ScenarioConfiguration[]>([]);
  paramDefs    = signal<ParameterDefinition[]>([]);
  loading      = signal(true);
  creating     = signal(false);
  saving       = signal(false);
  activatingId = signal<number | null>(null);
  editingId    = signal<number | null>(null);
  renaming     = signal(false);
  cloningId    = signal<number | null>(null);
  cloning      = signal(false);

  // ── Phase 5d: variant picker state ──────────────────────────────────────
  /** Which cell's picker is currently open, or null. */
  pickerTarget  = signal<PickerTarget | null>(null);
  /** Are we loading variants for the currently open picker? */
  loadingVariants = signal(false);
  /** Variant lists keyed by paramKey — loaded on first open, then cached. */
  private variantCache = new Map<string, ParameterVariant[]>();
  /** Which entry save is in flight, or null. */
  savingEntryTarget = signal<SavingEntry | null>(null);

  newName        = '';
  newDescription = '';
  editName        = '';
  editDescription = '';
  cloneName        = '';
  cloneDescription = '';

  ngOnInit() { this.load(); }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['scenarioId'] && !changes['scenarioId'].firstChange) {
      this.variantCache.clear();
      this.pickerTarget.set(null);
      this.load();
    }
  }

  private load() {
    this.loading.set(true);
    this.api.getParameterDefinitions(this.scenarioId()).subscribe({
      next: (defs) => this.paramDefs.set(defs.slice().sort((a, b) => a.sortOrder - b.sortOrder)),
      error: () => {},
    });
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
    this.pickerTarget.set(null);  // close any open picker before activating
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

  // ── Rename ───────────────────────────────────────────────────────────────

  startEdit(config: ScenarioConfiguration) {
    this.editingId.set(config.id);
    this.editName        = config.name;
    this.editDescription = config.description ?? '';
  }

  cancelEdit() {
    this.editingId.set(null);
    this.editName = '';
    this.editDescription = '';
  }

  confirmEdit(config: ScenarioConfiguration) {
    if (!this.editName) return;
    this.renaming.set(true);
    const payload: UpdateScenarioConfigurationRequest = {
      name:        this.editName,
      description: this.editDescription,
      sortOrder:   config.sortOrder,
    };
    this.api.updateConfiguration(this.scenarioId(), config.id, payload).subscribe({
      next: (updated) => {
        this.configs.update(cs => cs.map(c => c.id === updated.id ? updated : c));
        this.renaming.set(false);
        this.cancelEdit();
        this.snackbar.open('Configuration updated', 'Dismiss', { duration: 2500 });
      },
      error: () => {
        this.renaming.set(false);
        this.snackbar.open('Failed to update configuration', 'Dismiss', { duration: 3000 });
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

  // ── Clone ────────────────────────────────────────────────────────────────

  startClone(config: ScenarioConfiguration) {
    this.cloningId.set(config.id);
    this.cloneName        = `Copy of ${config.name}`;
    this.cloneDescription = config.description ?? '';
  }

  cancelClone() {
    this.cloningId.set(null);
    this.cloneName        = '';
    this.cloneDescription = '';
  }

  confirmClone(config: ScenarioConfiguration) {
    if (!this.cloneName) return;
    this.cloning.set(true);
    const payload: CreateScenarioConfigurationRequest = {
      name:                    this.cloneName,
      description:             this.cloneDescription,
      cloneFromConfigurationId: config.id,
    };
    this.api.createConfiguration(this.scenarioId(), payload).subscribe({
      next: (created) => {
        this.configs.update(cs => [...cs, created]);
        this.cloning.set(false);
        this.cancelClone();
        this.snackbar.open(`Cloned as "${created.name}"`, 'Dismiss', { duration: 3000 });
      },
      error: () => {
        this.cloning.set(false);
        this.snackbar.open('Failed to clone configuration', 'Dismiss', { duration: 3000 });
      },
    });
  }

  // ── Phase 5d: Variant picker ─────────────────────────────────────────────

  /** Called when a user clicks any entry cell. */
  onCellClick(config: ScenarioConfiguration, paramKey: string, event: MouseEvent) {
    event.stopPropagation();

    const current = this.pickerTarget();

    // If this cell is already open → toggle closed
    if (current?.configId === config.id && current?.paramKey === paramKey) {
      this.pickerTarget.set(null);
      return;
    }

    // Open this picker (closing any other)
    this.pickerTarget.set({ configId: config.id, paramKey });

    // Load variants if not cached
    if (!this.variantCache.has(paramKey)) {
      this.loadingVariants.set(true);
      this.api.getDocumentation(this.scenarioId(), paramKey).subscribe({
        next: (doc) => {
          this.variantCache.set(paramKey, doc.variants ?? []);
          this.loadingVariants.set(false);
        },
        error: () => {
          this.variantCache.set(paramKey, []);
          this.loadingVariants.set(false);
        },
      });
    }
  }

  /** Called when the user picks a variant (or Base) in the picker. */
  selectVariant(config: ScenarioConfiguration, paramKey: string, variantId: number | null) {
    // No-op if already the current selection
    const existing = this.entryFor(config, paramKey);
    if ((existing?.variantId ?? null) === variantId) {
      this.pickerTarget.set(null);
      return;
    }

    this.pickerTarget.set(null);
    this.savingEntryTarget.set({ configId: config.id, paramKey });

    const payload: UpdateConfigurationEntryRequest = { variantId };

    this.api.updateConfigurationEntry(
      this.scenarioId(), config.id, paramKey, payload
    ).subscribe({
      next: (updated) => {
        this.configs.update(cs => cs.map(c => c.id === updated.id ? updated : c));
        this.savingEntryTarget.set(null);
        const label = updated.entries.find(e => e.parameterKey === paramKey)?.variantLabel ?? paramKey.toUpperCase();
        this.snackbar.open(
          `${label} variant updated — re-run Activate & Run to refresh deficit`,
          'Dismiss',
          { duration: 5000 }
        );
      },
      error: () => {
        this.savingEntryTarget.set(null);
        this.snackbar.open('Failed to update variant', 'Dismiss', { duration: 3000 });
      },
    });
  }

  /** Returns cached variants for a paramKey (empty array until loaded). */
  variantsFor(paramKey: string): ParameterVariant[] {
    return this.variantCache.get(paramKey) ?? [];
  }

  isPickerOpen(configId: number, paramKey: string): boolean {
    const t = this.pickerTarget();
    return t?.configId === configId && t?.paramKey === paramKey;
  }

  isSavingEntry(configId: number, paramKey: string): boolean {
    const s = this.savingEntryTarget();
    return s?.configId === configId && s?.paramKey === paramKey;
  }

  // ── Helper ───────────────────────────────────────────────────────────────

  entryFor(config: ScenarioConfiguration, paramKey: string): ScenarioConfigurationEntry | null {
    return config.entries?.find(e => e.parameterKey === paramKey) ?? null;
  }
}
