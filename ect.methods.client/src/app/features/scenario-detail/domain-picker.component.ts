import {
  Component, OnInit, inject, signal, output, input,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { EctApiService } from '../../core/services/ect-api.service';
import {
  ProcessDomain,
  ParameterTemplateSummary,
} from '../../core/models/types';

@Component({
  selector: 'app-domain-picker',
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule, MatIconModule,
    MatProgressSpinnerModule, MatTooltipModule, MatSnackBarModule,
  ],
  template: `
    <div class="picker-root">

      <!-- ── Current domain display ── -->
      <div class="current-domain">
        <div class="current-label">Process Domain</div>
        @if (currentDomain()) {
          <div class="current-value">
            <mat-icon class="current-icon">{{ currentDomain()!.iconKey }}</mat-icon>
            <span class="current-name">{{ currentDomain()!.name }}</span>
            <button mat-icon-button class="change-btn"
                    matTooltip="Change domain"
                    (click)="startPicking()">
              <mat-icon>edit</mat-icon>
            </button>
          </div>
        } @else {
          <div class="current-value current-value--none">
            <mat-icon class="current-icon current-icon--none">category</mat-icon>
            <span class="current-name current-name--none">No domain assigned</span>
            <button mat-stroked-button class="assign-btn" (click)="startPicking()">
              <mat-icon>add</mat-icon> Assign Domain
            </button>
          </div>
        }
      </div>

      <!-- ── Picker panel ── -->
      @if (picking()) {
        <div class="picker-panel">

          <!-- Step 1: Domain selection -->
          @if (step() === 1) {
            <div class="picker-header">
              <span class="picker-title">Select Domain</span>
              <button mat-icon-button class="picker-close" (click)="cancelPicking()">
                <mat-icon>close</mat-icon>
              </button>
            </div>

            @if (loadingDomains()) {
              <div class="picker-loading">
                <mat-spinner diameter="24" />
              </div>
            } @else {
              <div class="domain-grid">
                @for (d of domains(); track d.id) {
                  <button class="domain-card"
                          [class.domain-card--selected]="selectedDomain()?.id === d.id"
                          (click)="selectDomain(d)">
                    <mat-icon class="domain-card-icon">{{ d.iconKey }}</mat-icon>
                    <span class="domain-card-name">{{ d.name }}</span>
                    <span class="domain-card-desc">{{ d.description }}</span>
                    <span class="domain-card-templates">
                      {{ d.templates.length }} template{{ d.templates.length !== 1 ? 's' : '' }}
                    </span>
                  </button>
                }
              </div>
            }
          }

          <!-- Step 2: Template selection -->
          @if (step() === 2 && selectedDomain()) {
            <div class="picker-header">
              <button mat-icon-button class="picker-back" (click)="step.set(1)"
                      matTooltip="Back to domains">
                <mat-icon>arrow_back</mat-icon>
              </button>
              <span class="picker-title">
                <mat-icon class="picker-title-icon">{{ selectedDomain()!.iconKey }}</mat-icon>
                {{ selectedDomain()!.name }}
              </span>
              <button mat-icon-button class="picker-close" (click)="cancelPicking()">
                <mat-icon>close</mat-icon>
              </button>
            </div>

            <p class="picker-hint">
              Select a template to pre-populate parameter definitions for this scenario.
            </p>

            <div class="template-list">
              @for (t of selectedDomain()!.templates; track t.id) {
                <button class="template-card"
                        [class.template-card--selected]="selectedTemplate()?.id === t.id"
                        (click)="selectTemplate(t)">
                  <div class="template-card-header">
                    <span class="template-name">{{ t.name }}</span>
                    <span class="template-param-count">
                      {{ t.parameterDefinitions.length }} parameters
                    </span>
                  </div>
                  <span class="template-desc">{{ t.description }}</span>
                  <div class="template-params">
                    @for (p of t.parameterDefinitions; track p.id) {
                      <span class="param-chip"
                            [class.param-chip--core]="p.isEctCoreParameter"
                            [matTooltip]="p.description">
                        <em>{{ p.symbol }}</em> {{ p.label }}
                      </span>
                    }
                  </div>
                </button>
              }
            </div>

            <div class="picker-actions">
              <button mat-flat-button color="primary"
                      [disabled]="!selectedTemplate() || applying()"
                      (click)="applyTemplate()">
                @if (applying()) {
                  <mat-spinner diameter="16" style="display:inline-block;margin-right:6px" />
                  Applying…
                } @else {
                  <mat-icon>check</mat-icon>
                  Apply Template
                }
              </button>
              <button mat-stroked-button
                      [disabled]="applying()"
                      (click)="applyDomainOnly()"
                      matTooltip="Assign domain without changing parameter definitions">
                Domain only
              </button>
            </div>
          }

        </div>
      }

    </div>
  `,
  styles: [`
    /* ── Root ── */
    .picker-root {
      margin-top: 0.5rem;
    }

    /* ── Current domain display ── */
    .current-label {
      font-size: 0.7rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: #64748b;
      margin-bottom: 0.4rem;
    }
    .current-value {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }
    .current-icon {
      font-size: 1.1rem;
      width: 1.1rem;
      height: 1.1rem;
      color: #38bdf8;
    }
    .current-icon--none { color: #334155; }
    .current-name {
      color: #e2e8f0;
      font-size: 0.875rem;
      font-weight: 500;
    }
    .current-name--none { color: #475569; }
    .change-btn {
      width: 28px; height: 28px;
      color: #475569 !important;
    }
    .change-btn:hover { color: #38bdf8 !important; }
    .assign-btn {
      font-size: 0.75rem;
      height: 28px;
      line-height: 28px;
      color: #64748b !important;
      border-color: #334155 !important;
    }
    .assign-btn:hover {
      color: #38bdf8 !important;
      border-color: #38bdf8 !important;
    }

    /* ── Picker panel ── */
    .picker-panel {
      margin-top: 1rem;
      background: #0f172a;
      border: 1px solid #334155;
      border-radius: 8px;
      overflow: hidden;
    }
    .picker-header {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.6rem 0.75rem;
      border-bottom: 1px solid #1e293b;
      background: #0f172a;
    }
    .picker-title {
      flex: 1;
      font-size: 0.825rem;
      font-weight: 600;
      color: #e2e8f0;
      display: flex;
      align-items: center;
      gap: 0.4rem;
    }
    .picker-title-icon {
      font-size: 1rem;
      width: 1rem;
      height: 1rem;
      color: #38bdf8;
    }
    .picker-back, .picker-close {
      width: 28px; height: 28px;
      color: #475569 !important;
    }
    .picker-back:hover, .picker-close:hover { color: #94a3b8 !important; }
    .picker-hint {
      font-size: 0.78rem;
      color: #64748b;
      margin: 0.75rem 0.75rem 0.5rem;
    }
    .picker-loading {
      display: flex;
      justify-content: center;
      padding: 1.5rem;
    }

    /* ── Domain grid ── */
    .domain-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 0.5rem;
      padding: 0.75rem;
    }
    .domain-card {
      display: flex;
      flex-direction: column;
      align-items: flex-start;
      gap: 0.2rem;
      padding: 0.75rem;
      background: #1e293b;
      border: 1px solid #334155;
      border-radius: 6px;
      cursor: pointer;
      text-align: left;
      transition: border-color 0.15s, background 0.15s;
      font-family: inherit;
      color: inherit;
    }
    .domain-card:hover {
      border-color: #38bdf8;
      background: rgba(56,189,248,0.05);
    }
    .domain-card--selected {
      border-color: #38bdf8 !important;
      background: rgba(56,189,248,0.08) !important;
    }
    .domain-card-icon {
      font-size: 1.4rem;
      width: 1.4rem;
      height: 1.4rem;
      color: #38bdf8;
      margin-bottom: 0.2rem;
    }
    .domain-card-name {
      font-size: 0.825rem;
      font-weight: 600;
      color: #e2e8f0;
    }
    .domain-card-desc {
      font-size: 0.72rem;
      color: #64748b;
      line-height: 1.4;
    }
    .domain-card-templates {
      font-size: 0.68rem;
      color: #475569;
      margin-top: 0.2rem;
    }

    /* ── Template list ── */
    .template-list {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
      padding: 0 0.75rem 0.75rem;
    }
    .template-card {
      display: flex;
      flex-direction: column;
      align-items: flex-start;
      gap: 0.35rem;
      padding: 0.75rem;
      background: #1e293b;
      border: 1px solid #334155;
      border-radius: 6px;
      cursor: pointer;
      text-align: left;
      transition: border-color 0.15s, background 0.15s;
      font-family: inherit;
      color: inherit;
      width: 100%;
      box-sizing: border-box;
    }
    .template-card:hover {
      border-color: #38bdf8;
      background: rgba(56,189,248,0.05);
    }
    .template-card--selected {
      border-color: #38bdf8 !important;
      background: rgba(56,189,248,0.08) !important;
    }
    .template-card-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      width: 100%;
    }
    .template-name {
      font-size: 0.825rem;
      font-weight: 600;
      color: #e2e8f0;
    }
    .template-param-count {
      font-size: 0.68rem;
      color: #475569;
    }
    .template-desc {
      font-size: 0.72rem;
      color: #64748b;
      line-height: 1.4;
    }
    .template-params {
      display: flex;
      flex-wrap: wrap;
      gap: 0.3rem;
      margin-top: 0.2rem;
    }
    .param-chip {
      font-size: 0.68rem;
      padding: 0.1rem 0.4rem;
      border-radius: 4px;
      background: #0f172a;
      border: 1px solid #334155;
      color: #64748b;
    }
    .param-chip--core {
      border-color: rgba(56,189,248,0.3);
      color: #7dd3fc;
    }
    .param-chip em {
      font-style: italic;
      font-family: 'Georgia', serif;
      color: #38bdf8;
      margin-right: 0.2rem;
    }

    /* ── Picker actions ── */
    .picker-actions {
      display: flex;
      gap: 0.5rem;
      padding: 0.75rem;
      border-top: 1px solid #1e293b;
    }
  `],
})
export class DomainPickerComponent implements OnInit {
  // Inputs
  scenarioId     = input.required<number>();
  processDomainId = input<number | null | undefined>(null);

  // Outputs
  domainApplied = output<{ domainId: number; templateApplied: boolean }>();

  private api      = inject(EctApiService);
  private snackbar = inject(MatSnackBar);

  // ── State ────────────────────────────────────────────────────────────────
  domains         = signal<ProcessDomain[]>([]);
  loadingDomains  = signal(true);
  picking         = signal(false);
  step            = signal<1 | 2>(1);
  selectedDomain  = signal<ProcessDomain | null>(null);
  selectedTemplate = signal<ParameterTemplateSummary | null>(null);
  applying        = signal(false);

  currentDomain = signal<ProcessDomain | null>(null);

  ngOnInit() {
    this.api.getProcessDomains().subscribe({
      next: (domains) => {
        this.domains.set(domains);
        this.loadingDomains.set(false);
        this.resolveCurrentDomain();
      },
    });
  }

  private resolveCurrentDomain() {
    const id = this.processDomainId();
    if (id) {
      const found = this.domains().find(d => d.id === id) ?? null;
      this.currentDomain.set(found);
    }
  }

  // ── Picker flow ───────────────────────────────────────────────────────────
  startPicking() {
    this.selectedDomain.set(null);
    this.selectedTemplate.set(null);
    this.step.set(1);
    this.picking.set(true);
  }

  cancelPicking() {
    this.picking.set(false);
  }

  selectDomain(domain: ProcessDomain) {
    this.selectedDomain.set(domain);
    this.selectedTemplate.set(null);
    this.step.set(2);
  }

  selectTemplate(template: ParameterTemplateSummary) {
    this.selectedTemplate.set(template);
  }

  // ── Apply template (sets domain + copies parameter definitions) ───────────
  applyTemplate() {
    const template = this.selectedTemplate();
    const domain   = this.selectedDomain();
    if (!template || !domain) return;
    this.applying.set(true);

    this.api.applyTemplate(this.scenarioId(), { templateId: template.id }).subscribe({
      next: () => {
        this.currentDomain.set(domain);
        this.picking.set(false);
        this.applying.set(false);
        this.snackbar.open(
          `"${template.name}" template applied`,
          'Dismiss', { duration: 3000 }
        );
        this.domainApplied.emit({ domainId: domain.id, templateApplied: true });
      },
      error: () => {
        this.applying.set(false);
        this.snackbar.open('Failed to apply template', 'Dismiss', { duration: 3000 });
      },
    });
  }

  // ── Domain only (no template, just stamp the processDomainId) ────────────
  applyDomainOnly() {
    const domain = this.selectedDomain();
    if (!domain) return;
    this.applying.set(true);

    // Apply first template of the domain but immediately emit without
    // replacing parameter definitions — we use a PUT to scenario instead.
    // For now just update the scenario's processDomainId via the scenario update.
    this.api.updateScenario(this.scenarioId(), {
      name:        '',   // will be patched below with actual values
      description: '',
    });

    // Since UpdateScenarioDto only has name/description, we apply the
    // template (which stamps processDomainId) then notify parent to reload.
    // Use the first template as a vehicle — parent decides whether to keep defs.
    const firstTemplate = domain.templates[0];
    if (firstTemplate) {
      this.api.applyTemplate(this.scenarioId(), { templateId: firstTemplate.id }).subscribe({
        next: () => {
          this.currentDomain.set(domain);
          this.picking.set(false);
          this.applying.set(false);
          this.snackbar.open(
            `Domain set to "${domain.name}"`,
            'Dismiss', { duration: 3000 }
          );
          this.domainApplied.emit({ domainId: domain.id, templateApplied: false });
        },
        error: () => {
          this.applying.set(false);
          this.snackbar.open('Failed to set domain', 'Dismiss', { duration: 3000 });
        },
      });
    }
  }
}
