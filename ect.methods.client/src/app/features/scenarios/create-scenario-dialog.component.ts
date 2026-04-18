
import { CommonModule } from '@angular/common';
import { Component, inject, input, OnInit } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatSelectModule } from '@angular/material/select';
import { EctApiService } from '../../core/services/ect-api.service';
import { Scenario } from '../../core/models/types';

@Component({
  selector: 'app-create-scenario-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule, MatDialogModule,
    MatFormFieldModule, MatInputModule, MatButtonModule, MatSelectModule,
  ],
  styles: [`
    h2 { color: #f1f5f9; }
    .dialog-content    { display: flex; flex-direction: column; gap: 4px; padding: 8px 0; }
    .dialog-form-field { width: 100%; }
    .dialog-form-row   { display: flex; gap: 12px; }
    .dialog-form-field-half { flex: 1; }
  `],
  template: `
    <h2 mat-dialog-title>{{ isEdit() ? 'Edit Scenario' : 'New Scenario' }}</h2>
    <mat-dialog-content>
      <form [formGroup]="form">
        <div class="dialog-content">

          <mat-form-field appearance="outline" class="dialog-form-field">
            <mat-label>Name</mat-label>
            <input matInput formControlName="name" placeholder="e.g. Laser Cut Station - Baseline" />
          </mat-form-field>

          <mat-form-field appearance="outline" class="dialog-form-field">
            <mat-label>Description</mat-label>
            <textarea matInput formControlName="description" rows="3"
                      placeholder="Brief description of the scenario and its purpose"></textarea>
          </mat-form-field>

          <div class="dialog-form-row">
            <mat-form-field appearance="outline" class="dialog-form-field-half">
              <mat-label>Scenario Mode</mat-label>
              <mat-select formControlName="scenarioMode">
                <mat-option value="Flat">Flat (V1)</mat-option>
                <mat-option value="Hierarchical">Hierarchical (V2)</mat-option>
              </mat-select>
            </mat-form-field>

            <mat-form-field appearance="outline" class="dialog-form-field-half">
              <mat-label>Solve For</mat-label>
              <mat-select formControlName="solveForMode">
                @for (opt of solveForOptions; track opt.value) {
                  <mat-option [value]="opt.value">
                    {{ opt.label }}
                  </mat-option>
                }
              </mat-select>
            </mat-form-field>
          </div>

        </div>
      </form>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button (click)="cancel()">Cancel</button>
      <button mat-flat-button color="primary" (click)="submit()" [disabled]="form.invalid || saving">
        {{ saving ? (isEdit() ? 'Updating...' : 'Creating...') : (isEdit() ? 'Update' : 'Create') }}
      </button>
    </mat-dialog-actions>
  `,
})
export class CreateScenarioDialogComponent implements OnInit {
  scenario = input<Scenario | undefined>();
  isEdit = input<boolean>(false);

  solveForOptions = [
    { value: 'C', label: 'Control (C)' },
    { value: 'T', label: 'Throughput (T)' },
    { value: 'E', label: 'Energy (E)' },
    { value: 'k', label: 'Complexity (k)' },
    { value: 'EC', label: 'Energy × Control' },
    { value: 'T_ET', label: 'Throughput (E×T)' },
    { value: 'C_ET', label: 'Control (E×T)' }
  ];

  private fb = inject(FormBuilder);
  private api = inject(EctApiService);
  private ref = inject(MatDialogRef<CreateScenarioDialogComponent>);

  saving = false;
  form = this.fb.group({
    name:         ['', [Validators.required, Validators.minLength(3)]],
    description:  ['', Validators.required],
    scenarioMode: ['Flat', Validators.required],
    solveForMode: ['C', Validators.required],
  });

  ngOnInit(): void {
    if (this.scenario()) {
      this.form.patchValue({
        name: this.scenario()?.name,
        description: this.scenario()?.description,
        scenarioMode: this.scenario()?.scenarioMode,
        solveForMode: this.scenario()?.solveForMode
      });
    }
  }

  cancel(): void {
    this.ref.close(null);
  }

  submit(): void {
    if (this.form.invalid) return;
    this.saving = true;
    const { name, description, scenarioMode, solveForMode } = this.form.value;
    
    if (this.isEdit() && this.scenario()?.id) {
      this.api.updateScenario(this.scenario()!.id, {
        name: name!,
        description: description!,
        scenarioMode: scenarioMode!,
        solveForMode: solveForMode!,
      }).subscribe({
        next: (updated) => this.ref.close(updated),
        error: () => { this.saving = false; },
      });
    } else {
      this.api.createScenario({
        name: name!,
        description: description!,
        scenarioMode: scenarioMode!,
        solveForMode: solveForMode!,
      }).subscribe({
        next: (created) => this.ref.close(created),
        error: () => { this.saving = false; },
      });
    }
  }
}
