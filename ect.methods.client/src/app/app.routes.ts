import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    redirectTo: 'dashboard',
    pathMatch: 'full',
  },
  {
    path: 'dashboard',
    loadComponent: () =>
      import('./features/dashboard/dashboard.component').then(
        (m) => m.DashboardComponent
      ),
    title: 'Dashboard — ECT Methods',
  },
  {
    path: 'scenarios',
    loadComponent: () =>
      import('./features/scenarios/scenarios.component').then(
        (m) => m.ScenariosComponent
      ),
    title: 'Scenarios — ECT Methods',
  },
  {
    path: 'scenarios/:id',
    loadComponent: () =>
      import('./features/scenario-detail/scenario-detail.component').then(
        (m) => m.ScenarioDetailComponent
      ),
    title: 'Scenario Detail — ECT Methods',
  },
  {
    path: 'scenarios/:id/analysis',
    loadComponent: () =>
      import('./features/analysis/analysis.component').then(
        (m) => m.AnalysisComponent
      ),
    title: 'Analysis — ECT Methods',
  },
  {
    path: '**',
    redirectTo: 'dashboard',
  },
];
