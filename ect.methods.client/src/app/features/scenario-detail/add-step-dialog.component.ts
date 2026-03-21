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
  CreateHierarchicalStepWithParametersDto,
  ScientificValue
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
    // Track 4 TODO: BaseValue should carry full ScientificValue (coefficient + exponent)
    // once UsesEdge schema is revised to Dictionary<string, ScientificValueDto>.

    if (this.stepForm.valid) {
      const formValue = this.stepForm.getRawValue();

      const toDouble = (coeff: number | null, exp: number | null): number =>
        (coeff ?? 1) * Math.pow(10, exp ?? 0);

      //console.log('Form raw value:', JSON.stringify(formValue));

      const parameters: CreateHierarchicalStepDto[] = [
        {
          role: 'E', key: 'energy', name: formValue.name ?? '',
          label: 'E', type: 'E',
          description: 'Energy for this step',
          baseValue: toDouble(formValue.energy.coefficient, formValue.energy.exponent),
          weight: 1,
          rollupOperator: formValue.rollupOperator ?? 'Sum'
        },
        {
          role: 'T', key: 'time', name: formValue.name ?? '',
          label: 'T', type: 'T',
          description: 'Time available for this step',
          baseValue: toDouble(formValue.timeAvailable.coefficient, formValue.timeAvailable.exponent),
          weight: 1,
          rollupOperator: formValue.rollupOperator ?? 'Sum'
        },
        {
          role: 'C', key: 'control', name: formValue.name ?? '',
          label: 'C', type: 'C',
          description: 'Control capacity for this step',
          baseValue: toDouble(formValue.control.coefficient, formValue.control.exponent),
          weight: 1,
          rollupOperator: formValue.rollupOperator ?? 'Sum'
        },
        {
          role: 'k', key: 'complexity', name: formValue.name ?? '',
          label: 'k', type: 'k',
          description: 'Complexity for this step',
          baseValue: toDouble(formValue.complexity.coefficient, formValue.complexity.exponent),
          weight: 1,
          rollupOperator: formValue.rollupOperator ?? 'Sum'
        }
      ];

      const payload: CreateHierarchicalStepWithParametersDto = {
        stepName: formValue.name ?? 'New Step',
        description: `Step for ${formValue.name}`,
        sortOrder: 0,
        parentNodeId: this.data.parentId,
        parameters
      };

      this.api.createHierarchicalStep(+this.data.scenarioId, payload).subscribe({
        next: () => {
          console.log('Hierarchy saved: Step + 4 Parameters created in Neo4j.');
          this.dialogRef.close(true);
        },
        error: (err) => console.error('Graph Save Failed:', err)
      });
    }
  }
}
