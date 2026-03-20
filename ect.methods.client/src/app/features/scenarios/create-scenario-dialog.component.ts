
import { CommonModule } from '@angular/common'; import { Component, inject } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatSelectModule } from '@angular/material/select';
import { EctApiService } from '../../core/services/ect-api.service';

@Component({
  selector: 'app-create-scenario-dialog',
  standalone: true,
  imports: [
    ReactiveFormsModule, MatDialogModule,
    MatFormFieldModule, MatInputModule, MatButtonModule, MatSelectModule,
  ],
  template: `
    <h2 mat-dialog-title>New Scenario</h2>
    <mat-dialog-content [formGroup]="form">
      <mat-form-field appearance="outline" class="full-width">
        <mat-label>Name</mat-label>
        <input matInput formControlName="name" placeholder="e.g. Laser Cut Station — Baseline" />
      </mat-form-field>
      <mat-form-field appearance="outline" class="full-width">
        <mat-label>Description</mat-label>
        <textarea matInput formControlName="description" rows="3"
                  placeholder="Brief description of the scenario and its purpose"></textarea>
      </mat-form-field>
      <mat-form-field appearance="outline" class="full-width">
        <mat-label>Scenario Mode</mat-label>
        <mat-select formControlName="scenarioMode">
          <mat-option value="Flat">Flat (V1)</mat-option>
          <mat-option value="Hierarchical">Hierarchical (V2)</mat-option>
        </mat-select>
      </mat-form-field>
      <mat-form-field appearance="outline" class="full-width">
        <mat-label>Solve For</mat-label>
        <mat-select formControlName="solveForMode">
          @for (opt of solveForOptions; track opt.value) {
            <mat-option [value]="opt.value">
              {{ opt.label }}
            </mat-option>
          }
        </mat-select>
      </mat-form-field>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button (click)="cancel()">Cancel</button>
      <button mat-flat-button color="primary" (click)="submit()" [disabled]="form.invalid || saving">
        {{ saving ? 'Creating…' : 'Create' }}
      </button>
    </mat-dialog-actions>
  `,
  styles: [`.full-width { width: 100%; margin-bottom: 0.5rem; }`],
})


export class CreateScenarioDialogComponent {

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
  private api    = inject(EctApiService);
  private ref    = inject(MatDialogRef<CreateScenarioDialogComponent>);

  saving = false;

  form = this.fb.group({
    name:        ['', [Validators.required, Validators.minLength(3)]],
    description: ['', Validators.required],
    scenarioMode: ['Flat', Validators.required],
    solveForMode: ['C', Validators.required],
  });

  cancel() { this.ref.close(null); }

  submit() {
    if (this.form.invalid) return;
    this.saving = true;
    const { name, description, scenarioMode, solveForMode } = this.form.value;
    this.api.createScenario({
      name: name!,
      description: description!,
      scenarioMode: scenarioMode!,
      solveForMode: solveForMode!,
    }).subscribe({
      next: (created) => this.ref.close(created),
      error: ()        => { this.saving = false; },
    });
  }
}
