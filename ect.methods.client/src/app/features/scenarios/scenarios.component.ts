import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { EctApiService } from '../../core/services/ect-api.service';
import { Scenario } from '../../core/models/types';
import { CreateScenarioDialogComponent } from './create-scenario-dialog.component';

@Component({
  selector: 'app-scenarios',
  standalone: true,
  imports: [
    CommonModule, RouterLink, ReactiveFormsModule,
    MatCardModule, MatButtonModule, MatIconModule, MatDialogModule,
    MatFormFieldModule, MatInputModule, MatProgressSpinnerModule, MatSnackBarModule,
  ],
  template: `
    <div class="scenarios-page">

      <div class="page-header">
        <div>
          <h1 class="page-title">Scenarios</h1>
          <p class="page-sub">Manage ECT analysis scenarios</p>
        </div>
        <button mat-flat-button color="primary" (click)="openCreate()">
          <mat-icon>add</mat-icon> New Scenario
        </button>
      </div>

      @if (loading) {
        <div class="loading-state"><mat-spinner diameter="40" /></div>
      }

      @if (!loading && scenarios.length === 0) {
        <mat-card class="empty-state">
          <mat-card-content>
            <mat-icon>science</mat-icon>
            <p>No scenarios yet. Create one to begin your analysis.</p>
          </mat-card-content>
        </mat-card>
      }

      @if (!loading && scenarios.length > 0) {
        <div class="scenario-list">
          @for (s of scenarios; track s.id) {
            <mat-card class="scenario-row">
              <mat-card-content>
                <div class="row-inner">
                  <mat-icon class="row-icon">biotech</mat-icon>
                  <div class="row-info" [routerLink]="['/scenarios', s.id]" style="cursor:pointer; flex:1">
                    <span class="row-name">{{ s.name }}</span>
                    <span class="row-desc">{{ s.description }}</span>
                    <span class="row-date">Created {{ s.createdDate | date:'mediumDate' }}</span>
                  </div>
                  <span class="badge" [class.badge-analysed]="s.hasAnalysis" [class.badge-pending]="!s.hasAnalysis">
                    {{ s.hasAnalysis ? 'Analysed' : 'Pending' }}
                  </span>
                  <button mat-icon-button color="warn"
                          (click)="delete(s); $event.stopPropagation()"
                          [attr.aria-label]="'Delete ' + s.name">
                    <mat-icon>delete_outline</mat-icon>
                  </button>
                </div>
              </mat-card-content>
            </mat-card>
          }
        </div>
      }

    </div>
  `,
  styles: [`
    .scenarios-page  { max-width: 900px; }
    .page-header     { display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 2rem; }
    .page-title      { font-size: 1.75rem; font-weight: 600; color: #f1f5f9; margin: 0; }
    .page-sub        { color: #64748b; margin: 0.25rem 0 0; font-size: 0.9rem; }

    .scenario-list   { display: flex; flex-direction: column; gap: 0.5rem; }
    .scenario-row    { background: #1e293b !important; border: 1px solid #334155 !important;
                       transition: border-color 0.15s; }
    .scenario-row:hover { border-color: #38bdf8 !important; }
    .row-inner       { display: flex; align-items: center; gap: 1rem; }
    .row-icon        { color: #475569; flex-shrink: 0; }
    .row-info        { display: flex; flex-direction: column; gap: 0.15rem; }
    .row-name        { color: #e2e8f0; font-weight: 500; }
    .row-desc        { color: #94a3b8; font-size: 0.85rem; }
    .row-date        { color: #475569; font-size: 0.75rem; }

    .badge           { padding: 0.2rem 0.6rem; border-radius: 9999px; font-size: 0.75rem;
                       font-weight: 500; white-space: nowrap; }
    .badge-analysed  { background: rgba(56,189,248,0.15); color: #38bdf8; }
    .badge-pending   { background: rgba(100,116,139,0.2); color: #94a3b8; }

    .loading-state, .empty-state { display: flex; justify-content: center; padding: 3rem; color: #64748b; }
  `],
})
export class ScenariosComponent implements OnInit {
  private api     = inject(EctApiService);
  private dialog  = inject(MatDialog);
  private snackbar = inject(MatSnackBar);

  scenarios: Scenario[] = [];
  loading = true;

  ngOnInit() { this.load(); }

  load() {
    this.loading = true;
    this.api.getScenarios().subscribe({
      next: (data) => { this.scenarios = data; this.loading = false; },
      error: ()     => { this.loading = false; },
    });
  }

  openCreate() {
    const ref = this.dialog.open(CreateScenarioDialogComponent, { width: '480px' });
    ref.afterClosed().subscribe((created) => { if (created) this.load(); });
  }

  delete(s: Scenario) {
    if (!confirm(`Delete "${s.name}"? This cannot be undone.`)) return;
    this.api.deleteScenario(s.id).subscribe({
      next: () => {
        this.snackbar.open('Scenario deleted', 'Dismiss', { duration: 3000 });
        this.load();
      },
    });
  }
}
