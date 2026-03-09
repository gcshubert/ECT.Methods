import { Component, OnInit, inject, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { MatTabsModule } from '@angular/material/tabs';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { EctApiService } from '../../core/services/ect-api.service';
import { Scenario, EctParameters, ScientificValue } from '../../core/models/types';
import { ScientificPipe } from '../../shared/pipes/scientific.pipe';
import { ParamDerivationComponent } from './param-derivation.component';

/** Mini-form for a single ScientificValue (coefficient + exponent) */
function svGroup(fb: ReturnType<typeof inject<FormBuilder>>, val: ScientificValue) {
  return fb!.group({
    coefficient: [val.coefficient, [Validators.required, Validators.min(0)]],
    exponent:    [val.exponent,    [Validators.required]],
  });
}

@Component({
  selector: 'app-scenario-detail',
  standalone: true,
  imports: [
    CommonModule, RouterLink, ReactiveFormsModule, ScientificPipe,
    MatTabsModule, MatCardModule, MatButtonModule, MatIconModule,
    MatFormFieldModule, MatInputModule, MatSnackBarModule, MatProgressSpinnerModule,
    ParamDerivationComponent,
  ],
  template: `
    <div class="detail-page">

      @if (loading) {
        <div class="loading-state"><mat-spinner diameter="40" /></div>
      }

      @if (!loading && scenario) {
        <!-- Breadcrumb -->
        <div class="breadcrumb">
          <a routerLink="/scenarios">Scenarios</a>
          <mat-icon>chevron_right</mat-icon>
          <span>{{ scenario.name }}</span>
        </div>

        <h1 class="page-title">{{ scenario.name }}</h1>

        <mat-tab-group animationDuration="200ms">

          <!-- ── Info tab ── -->
          <mat-tab label="Info">
            <div class="tab-content">
              <mat-card class="info-card">
                <mat-card-content>
                  <div class="info-grid">
                    <div class="info-row">
                      <span class="info-label">Description</span>
                      <span class="info-value">{{ scenario.description }}</span>
                    </div>
                    <div class="info-row">
                      <span class="info-label">Created</span>
                      <span class="info-value">{{ scenario.createdDate | date:'long' }}</span>
                    </div>
                    <div class="info-row">
                      <span class="info-label">Analysis status</span>
                      <span class="badge" [class.badge-done]="scenario.hasAnalysis"
                                          [class.badge-pending]="!scenario.hasAnalysis">
                        {{ scenario.hasAnalysis ? 'Computed' : 'Not yet computed' }}
                      </span>
                    </div>
                  </div>
                  @if (scenario.hasAnalysis) {
                    <a mat-flat-button color="primary"
                       [routerLink]="['/scenarios', scenario.id, 'analysis']"
                       style="margin-top:1.5rem">
                      <mat-icon>analytics</mat-icon> View Analysis
                    </a>
                  }
                </mat-card-content>
              </mat-card>
            </div>
          </mat-tab>

          <!-- ── Parameters tab ── -->
          <mat-tab label="Parameters">
            <div class="tab-content">
              <p class="tab-hint">
                Enter each ECT parameter as a coefficient × 10^exponent pair.
                These values feed directly into the ACC deficit calculation.
              </p>

              @if (paramForm) {
                <form [formGroup]="paramForm" (ngSubmit)="saveParams()">
                  <div class="params-grid">
                    @for (param of paramDefs; track param.key) {
                      <mat-card class="param-card">
                        <mat-card-header>
                          <mat-card-title class="param-title">
                            <span class="param-symbol">{{ param.symbol }}</span>
                            {{ param.label }}
                          </mat-card-title>
                          <mat-card-subtitle>{{ param.description }}</mat-card-subtitle>
                        </mat-card-header>
                        <mat-card-content [formGroupName]="param.key">
                          <div class="sv-fields">
                            <mat-form-field appearance="outline" class="coeff-field">
                              <mat-label>Coefficient</mat-label>
                              <input matInput type="number" formControlName="coefficient" />
                            </mat-form-field>
                            <span class="times-sign">× 10^</span>
                            <mat-form-field appearance="outline" class="exp-field">
                              <mat-label>Exponent</mat-label>
                              <input matInput type="number" formControlName="exponent" />
                            </mat-form-field>
                          </div>
                          <div class="param-preview">
                            = {{ getParamValue(param.key) | scientific }}
                          </div>
                        </mat-card-content>
                      </mat-card>
                    }
                  </div>

                  <div class="form-actions">
                    <button mat-flat-button color="primary" type="submit"
                            [disabled]="paramForm.invalid || saving">
                      {{ saving ? 'Saving…' : 'Save Parameters' }}
                    </button>
                  </div>
                </form>
              }
            </div>
          </mat-tab>

          <!-- ── Derivation tab ── -->
          <mat-tab label="Derivation">
            <div class="tab-content">
              <p class="tab-hint">
                Document the derivation chain for each ECT parameter.
                Each step multiplies, divides, adds, or raises the running total.
              </p>

              <div class="derivation-grid">
                @for (param of paramDefs; track param.key) {
                  <mat-card class="deriv-card">
                    <mat-card-content>
                      <app-param-derivation
                        [scenarioId]="scenario.id"
                        [paramKey]="param.key"
                        [paramSymbol]="param.symbol"
                      />
                    </mat-card-content>
                  </mat-card>
                }
              </div>
            </div>
          </mat-tab>

        </mat-tab-group>
      }

    </div>
  `,
  styles: [`
    .detail-page    { max-width: 900px; }
    .breadcrumb     { display: flex; align-items: center; gap: 0.25rem; color: #64748b;
                      font-size: 0.85rem; margin-bottom: 1rem; }
    .breadcrumb a   { color: #38bdf8; text-decoration: none; }
    .breadcrumb mat-icon { font-size: 1rem; width: 1rem; height: 1rem; }
    .page-title     { font-size: 1.75rem; font-weight: 600; color: #f1f5f9; margin: 0 0 1.5rem; }

    .tab-content    { padding: 1.5rem 0; }
    .tab-hint       { color: #64748b; font-size: 0.875rem; margin-bottom: 1.5rem; }

    .info-card      { background: #1e293b !important; border: 1px solid #334155 !important; }
    .info-grid      { display: flex; flex-direction: column; gap: 1rem; }
    .info-row       { display: flex; flex-direction: column; gap: 0.25rem; }
    .info-label     { color: #64748b; font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.08em; }
    .info-value     { color: #e2e8f0; }

    .badge          { display: inline-block; padding: 0.2rem 0.6rem; border-radius: 9999px;
                      font-size: 0.75rem; font-weight: 500; }
    .badge-done     { background: rgba(56,189,248,0.15); color: #38bdf8; }
    .badge-pending  { background: rgba(100,116,139,0.2); color: #94a3b8; }

    .params-grid    { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 1.5rem; }
    .param-card     { background: #1e293b !important; border: 1px solid #334155 !important; }
    .param-title    { display: flex; align-items: center; gap: 0.5rem; color: #e2e8f0 !important; }
    .param-symbol   { font-size: 1.25rem; font-weight: 700; color: #38bdf8;
                      font-family: 'Georgia', serif; font-style: italic; }
    .sv-fields      { display: flex; align-items: center; gap: 0.5rem; margin-top: 0.75rem; }
    .coeff-field    { width: 120px; }
    .exp-field      { width: 100px; }
    .times-sign     { color: #64748b; font-size: 0.9rem; white-space: nowrap; }
    .param-preview  { color: #38bdf8; font-family: monospace; font-size: 0.85rem;
                      margin-top: 0.5rem; }

    .form-actions   { display: flex; justify-content: flex-end; }
    .loading-state  { display: flex; justify-content: center; padding: 3rem; }

    /* ── Derivation tab ── */
    .derivation-grid {
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }
    .deriv-card {
      background: #1e293b !important;
      border: 1px solid #334155 !important;
    }
  `],
})
export class ScenarioDetailComponent implements OnInit {
  id = input.required<string>();

  private api      = inject(EctApiService);
  private fb       = inject(FormBuilder);
  private snackbar = inject(MatSnackBar);

  scenario: Scenario | null = null;
  loading = true;
  saving  = false;
  paramForm: ReturnType<FormBuilder['group']> | null = null;

  readonly paramDefs = [
    { key: 'energy', symbol: 'E', label: 'Energy',     description: 'Usable energy available to the process' },
    { key: 'control', symbol: 'C', label: 'Control',    description: 'Available control capacity' },
    { key: 'complexity', symbol: 'k', label: 'Complexity', description: 'Complexity constant for the target outcome' },
    { key: 'timeAvailable', symbol: 'T', label: 'Time',       description: 'Time available for the process' },
  ];

  ngOnInit() {
    this.api.getScenario(+this.id()).subscribe({
      next: (s) => {
        this.scenario = s;
        if (s.parameters) this.buildForm(s.parameters);
        this.loading = false;
      },
      error: () => { this.loading = false; },
    });
  }

  buildForm(p: EctParameters) {
    this.paramForm = this.fb.group({
      energy: svGroup(this.fb, p.energy),
      control: svGroup(this.fb, p.control),
      complexity: svGroup(this.fb, p.complexity),
      timeAvailable: svGroup(this.fb, p.timeAvailable),
    });
  }

  getParamValue(key: string): ScientificValue {
    const g = this.paramForm?.get(key)?.value;
    return g ?? { coefficient: 0, exponent: 0 };
  }

  saveParams() {
    if (!this.paramForm || this.paramForm.invalid) return;
    this.saving = true;
    this.api.updateParameters(+this.id(), this.paramForm.value as EctParameters).subscribe({
      next: () => {
        this.snackbar.open('Parameters saved', 'Dismiss', { duration: 3000 });
        this.saving = false;
      },
      error: () => { this.saving = false; },
    });
  }
}
