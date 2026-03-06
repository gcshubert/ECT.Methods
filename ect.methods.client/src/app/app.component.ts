import { Component } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatListModule } from '@angular/material/list';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
    MatSidenavModule,
    MatToolbarModule,
    MatListModule,
    MatIconModule,
    MatButtonModule,
  ],
  template: `
    <mat-sidenav-container class="app-container">

      <!-- ── Sidenav ── -->
      <mat-sidenav mode="side" opened class="app-sidenav">
        <div class="sidenav-header">
          <span class="logo">ECT</span>
          <span class="logo-sub">Framework</span>
        </div>

        <mat-nav-list>
          <a mat-list-item
             routerLink="/dashboard"
             routerLinkActive="active-link">
            <mat-icon matListItemIcon>dashboard</mat-icon>
            <span matListItemTitle>Dashboard</span>
          </a>
          <a mat-list-item
             routerLink="/scenarios"
             routerLinkActive="active-link">
            <mat-icon matListItemIcon>science</mat-icon>
            <span matListItemTitle>Scenarios</span>
          </a>
        </mat-nav-list>
      </mat-sidenav>

      <!-- ── Main content ── -->
      <mat-sidenav-content class="app-content">
        <mat-toolbar class="app-toolbar" color="primary">
          <span>ECT Methods</span>
        </mat-toolbar>
        <div class="page-wrapper">
          <router-outlet />
        </div>
      </mat-sidenav-content>

    </mat-sidenav-container>
  `,
  styles: [`
    .app-container  { height: 100vh; }
    .app-sidenav    { width: 220px; background: #0f172a; border-right: 1px solid #1e293b; }
    .app-toolbar    { background: #0f172a; border-bottom: 1px solid #1e293b; }
    .page-wrapper   { padding: 2rem; }

    .sidenav-header {
      padding: 1.5rem 1rem 1rem;
      display: flex;
      flex-direction: column;
      border-bottom: 1px solid #1e293b;
      margin-bottom: 0.5rem;
    }
    .logo     { font-size: 1.6rem; font-weight: 700; color: #38bdf8; letter-spacing: 0.1em; }
    .logo-sub { font-size: 0.75rem; color: #64748b; letter-spacing: 0.15em; text-transform: uppercase; }

    .active-link { background: rgba(56,189,248,0.1) !important; border-left: 3px solid #38bdf8; }

    /* Global dark theme overrides */
    :host ::ng-deep .mat-mdc-list-item { color: #94a3b8 !important; }
    :host ::ng-deep .mat-icon { color: #64748b; }
    :host ::ng-deep .active-link .mat-icon { color: #38bdf8 !important; }
  `],
})
export class AppComponent {}
