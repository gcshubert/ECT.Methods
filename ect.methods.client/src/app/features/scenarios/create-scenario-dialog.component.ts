import { Component, inject } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { EctApiService } from '../../core/services/ect-api.service';

@Component({
  selector: 'app-create-scenario-dialog',
  standalone: true,
  imports: [
    ReactiveFormsModule, MatDialogModule,
    MatFormFieldModule, MatInputModule, MatButtonModule,
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
  private fb     = inject(FormBuilder);
  private api    = inject(EctApiService);
  private ref    = inject(MatDialogRef<CreateScenarioDialogComponent>);

  saving = false;

  form = this.fb.group({
    name:        ['', [Validators.required, Validators.minLength(3)]],
    description: ['', Validators.required],
  });

  cancel() { this.ref.close(null); }

  submit() {
    if (this.form.invalid) return;
    this.saving = true;
    const { name, description } = this.form.value;
    this.api.createScenario({
      name: name!,
      description: description!,
    }).subscribe({
      next: (created) => this.ref.close(created),
      error: ()        => { this.saving = false; },
    });
  }
}
