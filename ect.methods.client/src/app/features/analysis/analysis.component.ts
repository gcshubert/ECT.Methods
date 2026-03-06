import { Component, OnInit, inject, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { EctApiService } from '../../core/services/ect-api.service';
import { DeficitAnalysis, DEFICIT_TYPE_LABELS } from '../../core/models/types';
import { ScientificPipe } from '../../shared/pipes/scientific.pipe';

@Component({
  selector: 'app-analysis',
  standalone: true,
  imports: [
    CommonModule, RouterLink, ScientificPipe,
    MatCardModule, MatButtonModule, MatIconModule,
    MatProgressSpinnerModule, MatSnackBarModule,
  ],
  template: `
    <div class="analysis-page">

      <div class="breadcrumb">
        <a [routerLink]="['/scenarios', id()]">Scenario</a>
        <mat-icon>chevron_right</mat-icon>
        <span>Analysis</span>
      </div>

      <div class="page-header">
        <h1 class="page-title">Deficit Analysis</h1>
        <button mat-flat-button color="primary" (click)="compute()" [disabled]="computing">
          <mat-icon>refresh</mat-icon>
          {{ computing ? 'Computing…' : 'Recompute' }}
        </button>
      </div>

      @if (loading) {
        <div class="loading-state"><mat-spinner diameter="40" /></div>
      }

      @if (!loading && !analysis) {
        <mat-card class="empty-state">
          <mat-card-content>
            <mat-icon>analytics</mat-icon>
            <p>No analysis yet. Click <strong>Recompute</strong> to run the ACC deficit calculation.</p>
          </mat-card-content>
        </mat-card>
      }

      @if (!loading && analysis) {

        <!-- ── Result cards ── -->
        <div class="result-grid">
          <mat-card class="result-card">
            <mat-card-content>
              <div class="result-label">C Required</div>
              <div class="result-value mono">{{ analysis.cRequired | scientific }}</div>
            </mat-card-content>
          </mat-card>
          <mat-card class="result-card">
            <mat-card-content>
              <div class="result-label">C Available</div>
              <div class="result-value mono">{{ analysis.cAvailable | scientific }}</div>
            </mat-card-content>
          </mat-card>
          <mat-card class="result-card highlight">
            <mat-card-content>
              <div class="result-label">C Deficit</div>
              <div class="result-value mono deficit">{{ analysis.cDeficit | scientific }}</div>
            </mat-card-content>
          </mat-card>
        </div>

        <!-- ── Classification ── -->
        <mat-card class="classification-card">
          <mat-card-content>
            <div class="classification-row">
              <div>
                <div class="result-label">Deficit Type</div>
                <div class="type-badge">
                  Type {{ analysis.deficitType }} —
                  {{ deficitTypeLabel }}
                </div>
              </div>
              <div>
                <div class="result-label">Interpretation</div>
                <div class="interp-badge"
                     [class.minor]="analysis.deficitInterpretation === 'Minor'"
                     [class.significant]="analysis.deficitInterpretation === 'Significant'"
                     [class.profound]="analysis.deficitInterpretation === 'Profound'">
                  {{ analysis.deficitInterpretation }}
                </div>
              </div>
              <div>
                <div class="result-label">Computed</div>
                <div class="result-value">{{ analysis.computedAt | date:'medium' }}</div>
              </div>
            </div>
          </mat-card-content>
        </mat-card>

        <!-- ── Coverage visualisation ── -->
        <mat-card class="coverage-card">
          <mat-card-header>
            <mat-card-title>Control Coverage</mat-card-title>
            <mat-card-subtitle>
              Proportion of required control that is available (exponent scale)
            </mat-card-subtitle>
          </mat-card-header>
          <mat-card-content>
            <div class="coverage-bar-wrap">
              <div class="coverage-bar">
                <div class="coverage-fill" [style.width.%]="coveragePercent"></div>
                <div class="deficit-fill" [style.width.%]="100 - coveragePercent"></div>
              </div>
              <div class="coverage-labels">
                <span class="label-available">
                  Available: {{ coveragePercent | number:'1.4-4' }}%
                </span>
                <span class="label-deficit">
                  Deficit: {{ 100 - coveragePercent | number:'1.4-4' }}%
                </span>
              </div>
            </div>
          </mat-card-content>
        </mat-card>

      }
    </div>
  `,
  styles: [`
    .analysis-page   { max-width: 900px; }
    .breadcrumb      { display: flex; align-items: center; gap: 0.25rem; color: #64748b;
                       font-size: 0.85rem; margin-bottom: 1rem; }
    .breadcrumb a    { color: #38bdf8; text-decoration: none; }
    .breadcrumb mat-icon { font-size: 1rem; width: 1rem; height: 1rem; }
    .page-header     { display: flex; align-items: center; justify-content: space-between; margin-bottom: 2rem; }
    .page-title      { font-size: 1.75rem; font-weight: 600; color: #f1f5f9; margin: 0; }

    .result-grid     { display: grid; grid-template-columns: repeat(3, 1fr); gap: 1rem; margin-bottom: 1rem; }
    .result-card     { background: #1e293b !important; border: 1px solid #334155 !important; }
    .result-card.highlight { border-color: #f87171 !important; }
    .result-label    { color: #64748b; font-size: 0.75rem; text-transform: uppercase;
                       letter-spacing: 0.08em; margin-bottom: 0.5rem; }
    .result-value    { color: #e2e8f0; font-size: 0.9rem; }
    .result-value.mono { font-family: monospace; }
    .result-value.deficit { color: #f87171; }

    .classification-card { background: #1e293b !important; border: 1px solid #334155 !important;
                           margin-bottom: 1rem; }
    .classification-row  { display: flex; gap: 3rem; align-items: flex-start; }
    .type-badge      { color: #38bdf8; font-weight: 600; margin-top: 0.25rem; }
    .interp-badge    { font-weight: 600; margin-top: 0.25rem; }
    .interp-badge.minor       { color: #4ade80; }
    .interp-badge.significant { color: #fbbf24; }
    .interp-badge.profound    { color: #f87171; }

    .coverage-card   { background: #1e293b !important; border: 1px solid #334155 !important; }
    .coverage-bar-wrap { padding-top: 0.5rem; }
    .coverage-bar    { display: flex; height: 2rem; border-radius: 4px; overflow: hidden;
                       border: 1px solid #334155; }
    .coverage-fill   { background: #16a34a; transition: width 0.5s ease; }
    .deficit-fill    { background: #dc2626; flex: 1; }
    .coverage-labels { display: flex; justify-content: space-between; margin-top: 0.5rem; font-size: 0.8rem; }
    .label-available { color: #4ade80; }
    .label-deficit   { color: #f87171; }

    .loading-state, .empty-state { display: flex; justify-content: center; padding: 3rem; color: #64748b; }
  `],
})
export class AnalysisComponent implements OnInit {
  id = input.required<string>();

  private api      = inject(EctApiService);
  private snackbar = inject(MatSnackBar);

  analysis: DeficitAnalysis | null = null;
  loading   = true;
  computing = false;

  get deficitTypeLabel() {
    return this.analysis
      ? DEFICIT_TYPE_LABELS[this.analysis.deficitType]
      : '';
  }

  /** Coverage % — ratio of available exponent to required exponent, clamped 0-100 */
  get coveragePercent(): number {
    if (!this.analysis) return 0;
    const req = this.analysis.cRequired.exponent;
    const avl = this.analysis.cAvailable.exponent;
    if (req <= 0) return 100;
    return Math.min(100, Math.max(0, (avl / req) * 100));
  }

  ngOnInit() {
    this.api.getAnalysis(+this.id()).subscribe({
      next:  (a) => { this.analysis = a; this.loading = false; },
      error: ()  => { this.loading = false; },
    });
  }

  compute() {
    this.computing = true;
    this.api.computeAnalysis(+this.id()).subscribe({
      next: (a) => {
        this.analysis  = a;
        this.computing = false;
        this.snackbar.open('Analysis complete', 'Dismiss', { duration: 3000 });
      },
      error: () => { this.computing = false; },
    });
  }
}
