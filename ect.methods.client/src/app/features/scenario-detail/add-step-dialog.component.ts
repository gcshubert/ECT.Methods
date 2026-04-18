import { Component, Inject, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatDialogModule, MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { EctApiService } from '../../core/services/ect-api.service';
import { CreateHierarchicalStepDto } from '../../core/models/types';

@Component({
  selector: 'app-add-step-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule
  ],
  templateUrl: './add-step-dialog.component.html',
  })
export class AddStepDialogComponent {
  private fb = inject(FormBuilder);
  private api = inject(EctApiService);

  operators = ['Sum', 'Product', 'WeightedSum', 'Max', 'Min'];

  stepForm = this.fb.group({
    name: ['', Validators.required],
    description: [''],
    rollupOperator: ['Sum', Validators.required],
    energy:        this.fb.group({ coefficient: [1.0], exponent: [0] }),
    control:       this.fb.group({ coefficient: [1.0], exponent: [0] }),
    complexity:    this.fb.group({ coefficient: [1.0], exponent: [0] }),
    timeAvailable: this.fb.group({ coefficient: [1.0], exponent: [0] }),
    weight: [1.0]
  });

  constructor(
    private dialogRef: MatDialogRef<AddStepDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { scenarioId: string, parentId?: string }
  ) { 
    // Debug dialog data
    console.log('AddStepDialog constructor - data:', this.data);
    console.log('AddStepDialog constructor - scenarioId:', this.data.scenarioId);
    console.log('AddStepDialog constructor - scenarioId type:', typeof this.data.scenarioId);
  }

  onSave(): void {
    if (!this.stepForm.valid) return;

    const fv = this.stepForm.getRawValue();

    // Debug scenario ID
    console.log('Dialog data:', this.data);
    console.log('Raw scenario ID:', this.data.scenarioId);
    console.log('Type of scenario ID:', typeof this.data.scenarioId);

    // Validate scenario ID
    const scenarioId = parseInt(this.data.scenarioId, 10);
    console.log('Parsed scenario ID:', scenarioId);
    
    if (isNaN(scenarioId) || scenarioId <= 0) {
      console.error('Invalid scenario ID:', this.data.scenarioId);
      return;
    }

    console.log('Parsed scenario ID:', scenarioId);
    console.log('Type of scenario ID:', typeof scenarioId);
    console.log('Scenario ID:', scenarioId);

    const payload: CreateHierarchicalStepDto = {
      key: '',
      name: fv.name ?? 'New Step',
      label: fv.name ?? 'New Step',
      description: fv.description ?? '',
      role: 'k',
      type: 'k',
      rollupOperator: fv.rollupOperator ?? 'Sum',
      weight: fv.weight ?? 1.0,
      parentNodeId: this.data.parentId,
      baseValue: { coefficient: fv.energy?.coefficient ?? 1.0, exponent: fv.energy?.exponent ?? 0 },
      E: { coefficient: fv.energy?.coefficient ?? 1.0, exponent: fv.energy?.exponent ?? 0 },
      C: { coefficient: fv.control?.coefficient ?? 1.0, exponent: fv.control?.exponent ?? 0 },
      K: { coefficient: fv.complexity?.coefficient ?? 1.0, exponent: fv.complexity?.exponent ?? 0 },
      T: { coefficient: fv.timeAvailable?.coefficient ?? 1.0, exponent: fv.timeAvailable?.exponent ?? 0 }
    };

    // Debug payload being sent
    console.log('Create step payload:', payload);
    console.log('Payload E:', payload.E);
    console.log('Payload C:', payload.C);
    console.log('Payload K:', payload.K);
    console.log('Payload T:', payload.T);

    this.api.createHierarchicalStep(scenarioId, payload).subscribe({
      next: () => this.dialogRef.close(true),
      error: (err) => {
        console.error('Step creation failed:', err);
        console.error('Error status:', err.status);
        console.error('Error message:', err.message);
        console.error('Error error:', err.error);
        if (err.error && err.error.detail) {
          console.error('Error detail:', err.error.detail);
        }
      }
    });
  }
}
