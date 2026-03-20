import { Component, Inject, inject, signal } from '@angular/core'; // Added inject
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatDialogModule, MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { EctApiService } from '../../core/services/ect-api.service';
import {
  CreateHierarchicalStepDto,
  CreateHierarchicalStepWithParametersDto
} from '../../core/models/types';

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
  templateUrl: './add-step-dialog.component.html'
})
export class AddStepDialogComponent {
  // Use inject() to ensure FormBuilder is ready before property initialization
  private fb = inject(FormBuilder);
  private api = inject(EctApiService);

  roles = ['E', 'T', 'C', 'k'];
  operators = ['Sum', 'Product', 'WeightedSum', 'Max', 'Min'];

  stepForm = this.fb.group({
    name: ['', Validators.required],
    role: ['C', Validators.required], // Default and leave active for submission testing
    rollupOperator: ['Sum', Validators.required],

    // Scientific values for all parameters
    energy: this.fb.group({ coefficient: [1.0], exponent: [0] }),
    control: this.fb.group({ coefficient: [1.0], exponent: [0] }),
    complexity: this.fb.group({ coefficient: [1.0], exponent: [0] }),
    timeAvailable: this.fb.group({ coefficient: [1.0], exponent: [0] }),

    weight: [1.0]
  });

  constructor(
    private dialogRef: MatDialogRef<AddStepDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { scenarioId: string, parentId?: string }
  ) { }

  ngOnInit() {
    this.stepForm.get('role')?.disable();
  }

  onSave(): void {
    if (this.stepForm.valid) {
      const formValue = this.stepForm.getRawValue();

      // 1. Map the nested scientific groups into the 4 Parameter DTOs
      // This structure ensures Neo4j can "Walk" and find E, T, C, and k
      const parameters: CreateHierarchicalStepDto[] = [
        {
          role: 'E', key: 'Energy', name: 'Energy', label: 'E', type: 'Scientific',
          description: 'Energy coefficient for this step', // <--- Add this
          baseValue: formValue.energy.coefficient ?? 0,
          exponent: formValue.energy.exponent ?? 0,
          weight: 1
        },
        {
          role: 'T', key: 'Time', name: 'Time Available', label: 'T', type: 'Scientific',
          description: 'Time available for this step', // <--- Add this
          baseValue: formValue.timeAvailable.coefficient ?? 0,
          exponent: formValue.timeAvailable.exponent ?? 0,
          weight: 1
        },
        {
          role: 'C', key: 'Complexity', name: 'Complexity', label: 'C', type: 'Scientific',
          description: 'Complexity constant for this step', // <--- Add this
          baseValue: formValue.complexity.coefficient ?? 0,
          exponent: formValue.complexity.exponent ?? 0,
          weight: 1
        },
        {
          role: 'k', key: 'Control', name: 'Control Constant', label: 'k', type: 'Scientific',
          description: 'Control constant for this step', // <--- Add this
          baseValue: formValue.control.coefficient ?? 0,
          exponent: formValue.control.exponent ?? 0,
          weight: 1
        }
      ];
      // 2. Bundle the Step Anchor with its 4 coefficients
      const payload: CreateHierarchicalStepWithParametersDto = {
        stepName: formValue.name ?? 'New Step', // Fallback ensures it's always a string
        description: `Step for ${formValue.name}`,
        sortOrder: 0, // You can add a sortOrder field to your form later
        parentNodeId: this.data.parentId,
        parameters: parameters
      };

      // 3. POST to the ECT.ACC.Api (Port 5041)
      this.api.createHierarchicalStep(+this.data.scenarioId, payload).subscribe({
        next: () => {
          console.log('Hierarchy saved: Step + 4 Parameters created in Neo4j.');
          this.dialogRef.close(true); // Return true to trigger a refresh in the parent
        },
        error: (err) => console.error('Graph Save Failed:', err)
      });
    }
  }
}
