import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { EctApiService } from '../../core/services/ect-api.service';
import { Scenario, ProcessDomain } from '../../core/models/types';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule, RouterLink,
    MatCardModule, MatButtonModule, MatIconModule, MatProgressSpinnerModule,
  ],
  template: `
    <div class="dashboard">

      <h1 class="page-title">Dashboard</h1>
      <p class="page-sub">ECT Methods — Analysis & Documentation</p>

      <!-- ── Summary cards ── -->
      <div class="stat-grid">
        <mat-card class="stat-card">
          <mat-card-content>
            <div class="stat-value">{{ scenarios.length }}</div>
            <div class="stat-label">Total Scenarios</div>
          </mat-card-content>
        </mat-card>

        <mat-card class="stat-card">
          <mat-card-content>
            <div class="stat-value">{{ analysedCount }}</div>
            <div class="stat-label">Analyses Computed</div>
          </mat-card-content>
        </mat-card>

        <mat-card class="stat-card">
          <mat-card-content>
            <div class="stat-value deficit">{{ deficitCount }}</div>
            <div class="stat-label">Deficits Identified</div>
          </mat-card-content>
        </mat-card>
      </div>

      <!-- ── Recent scenarios ── -->
      <h2 class="section-title">Recent Scenarios</h2>

      @if (loading) {
        <div class="loading-state">
          <mat-spinner diameter="40" />
        </div>
      }

      @if (!loading && scenarios.length === 0) {
        <mat-card class="empty-state">
          <mat-card-content>
            <mat-icon>science</mat-icon>
            <p>No scenarios yet. <a routerLink="/scenarios">Create one</a> to get started.</p>
          </mat-card-content>
        </mat-card>
      }

      @if (!loading && scenarios.length > 0) {
        <div class="scenario-list">
          @for (s of recentScenarios; track s.id) {
            <mat-card class="scenario-row" [routerLink]="['/scenarios', s.id]">
              <mat-card-content>
                <div class="scenario-row-inner">
                  <mat-icon class="scenario-icon">{{ getDomain(s)?.iconKey ?? "help_outline" }}</mat-icon>
                  <div class="scenario-info">
                    <span class="scenario-name">{{ s.name }}</span>
                    <span class="scenario-date">{{ s.createdDate | date:'mediumDate' }}</span>
                  </div>
                  <span class="badge" [class.badge-deficit]="s.hasAnalysis" [class.badge-pending]="!s.hasAnalysis">
                    {{ s.hasAnalysis ? 'Analysed' : 'Pending' }}
                  </span>
                </div>
              </mat-card-content>
            </mat-card>
          }
        </div>
      }

    </div>
  `,
  styles: [`
    .dashboard       { max-width: 900px; }
    .page-title      { font-size: 1.75rem; font-weight: 600; color: #f1f5f9; margin: 0; }
    .page-sub        { color: #64748b; margin: 0.25rem 0 2rem; font-size: 0.9rem; }
    .section-title   { color: #94a3b8; font-size: 1rem; text-transform: uppercase;
                       letter-spacing: 0.1em; margin: 2rem 0 1rem; }

    .stat-grid       { display: grid; grid-template-columns: repeat(3, 1fr); gap: 1rem; margin-bottom: 1rem; }
    .stat-card       { background: #1e293b !important; border: 1px solid #334155 !important; }
    .stat-value      { font-size: 2.5rem; font-weight: 700; color: #38bdf8; }
    .stat-value.deficit { color: #f87171; }
    .stat-label      { font-size: 0.8rem; color: #64748b; text-transform: uppercase; letter-spacing: 0.08em; }

    .scenario-list   { display: flex; flex-direction: column; gap: 0.5rem; }
    .scenario-row    { background: #1e293b !important; border: 1px solid #334155 !important; cursor: pointer;
                       transition: border-color 0.15s; }
    .scenario-row:hover { border-color: #38bdf8 !important; }
    .scenario-row-inner { display: flex; align-items: center; gap: 1rem; }
    .scenario-icon   { color: #475569; }
    .scenario-info   { flex: 1; display: flex; flex-direction: column; }
    .scenario-name   { color: #e2e8f0; font-weight: 500; }
    .scenario-date   { color: #64748b; font-size: 0.8rem; }

    .badge           { padding: 0.2rem 0.6rem; border-radius: 9999px; font-size: 0.75rem; font-weight: 500; }
    .badge-deficit   { background: rgba(56,189,248,0.15); color: #38bdf8; }
    .badge-pending   { background: rgba(100,116,139,0.2); color: #94a3b8; }

    .domain-badge       { display: inline-flex; align-items: center; gap: 0.3rem; padding: 0.2rem 0.6rem;
                              border-radius: 9999px; font-size: 0.72rem; font-weight: 500;
                              background: rgba(100,116,139,0.15); color: #64748b; white-space: nowrap; }
    .domain-badge--set  { background: rgba(56,189,248,0.08); color: #7dd3fc; }
    .domain-badge-icon  { font-size: 0.85rem; width: 0.85rem; height: 0.85rem; }

    .loading-state, .empty-state { display: flex; justify-content: center; align-items: center;
                                    padding: 3rem; color: #64748b; }
  `],
})
export class DashboardComponent implements OnInit {
  private api = inject(EctApiService);

  scenarios: Scenario[] = [];
  domains: ProcessDomain[] = [];
  loading = true;

  get recentScenarios() { return this.scenarios.slice(0, 5); }
  get analysedCount()   { return this.scenarios.filter(s => s.hasAnalysis).length; }
  get deficitCount()    { return this.analysedCount; }

  ngOnInit() {
    this.api.getProcessDomains().subscribe(d => this.domains = d);
    this.api.getScenarios().subscribe({
      next: (data) => { this.scenarios = data; this.loading = false; },
      error: ()     => { this.loading = false; },
    });
  }

  getDomain(s: Scenario): ProcessDomain | null {
    return this.domains.find(d => d.id === s.processDomainId) ?? null;
  }
}
