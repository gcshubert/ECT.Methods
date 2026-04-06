import { Component, Inject, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatDialogModule, MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { EctApiService } from '../../core/services/ect-api.service';
import { UpdateHierarchicalStepDto, ScientificValue } from '../../core/models/types';
import { toDouble, fromDouble } from '../../core/utils/math.utils';
import { from, concatMap } from 'rxjs';
import { ChangeDetectorRef } from '@angular/core';

// StepNode is defined in steps-tree.component.ts — re-declare the minimal
// shape needed here to avoid a circular import. Track 4 TODO: move StepNode
// to types.ts so it can be shared across components.
interface StepNode {
  nodeId: string;
  label: string;
  role: string;
  rollupOperator?: string | null;
  weight?: number | null;
  baseValue?: ScientificValue | null;
  children?: StepNode[];
}

export interface EditStepDialogData {
  scenarioId: string;
  stepNode: StepNode;   // the anchor node, children carry leaf values
}

@Component({
  selector: 'app-edit-step-dialog',
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
  templateUrl: './edit-step-dialog.component.html'
})
export class EditStepDialogComponent implements OnInit {
  private fb = inject(FormBuilder);
  private api = inject(EctApiService);

  operators = ['Sum', 'Product', 'WeightedSum', 'Max', 'Min'];

  stepForm: FormGroup;

  constructor(
    public dialogRef: MatDialogRef<EditStepDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: EditStepDialogData,
    private cdr: ChangeDetectorRef
  ) {
    this.stepForm = this.fb.group({
      name: [this.data.stepNode.label, Validators.required],
      rollupOperator: [this.data.stepNode.rollupOperator ?? 'Sum', Validators.required],
      energy: this.fb.group({ coefficient: [1.0], exponent: [0] }),
      control: this.fb.group({ coefficient: [1.0], exponent: [0] }),
      complexity: this.fb.group({ coefficient: [1.0], exponent: [0] }),
      timeAvailable: this.fb.group({ coefficient: [1.0], exponent: [0] }),
    });
  }

  ngOnInit(): void {
    const node = this.data.stepNode;

    // Pre-populate E/C/k/T from leaf children by role
    for (const child of node.children ?? []) {
      const baseValue = child.baseValue ?? { coefficient: 1.0, exponent: 0 };
      switch (child.role) {
        case 'E': this.stepForm.patchValue({ energy: { coefficient: baseValue.coefficient, exponent: baseValue.exponent } }); break;
        case 'T': this.stepForm.patchValue({ timeAvailable: { coefficient: baseValue.coefficient, exponent: baseValue.exponent } }); break;
        case 'C': this.stepForm.patchValue({ control: { coefficient: baseValue.coefficient, exponent: baseValue.exponent } }); break;
        case 'k': this.stepForm.patchValue({ complexity: { coefficient: baseValue.coefficient, exponent: baseValue.exponent } }); break;
      }
    }
  }

  onSave(): void {
    if (!this.stepForm.valid) return;

    const fv = this.stepForm.getRawValue();
    const node = this.data.stepNode;
    const scenarioId = +this.data.scenarioId;

    // Build leaf updates — baseValue only, no rollupOperator
    // Rollup operator belongs to the anchor node, not the leaves
    const leafUpdates: { nodeId: string; dto: UpdateHierarchicalStepDto }[] = [];

    for (const child of node.children ?? []) {
      let baseValue: ScientificValue | undefined;
      switch (child.role) {
        case 'E': baseValue = { coefficient: fv.energy.coefficient ?? 1.0, exponent: fv.energy.exponent ?? 0 }; break;
        case 'T': baseValue = { coefficient: fv.timeAvailable.coefficient ?? 1.0, exponent: fv.timeAvailable.exponent ?? 0 }; break;
        case 'C': baseValue = { coefficient: fv.control.coefficient ?? 1.0, exponent: fv.control.exponent ?? 0 }; break;
        case 'k': baseValue = { coefficient: fv.complexity.coefficient ?? 1.0, exponent: fv.complexity.exponent ?? 0 }; break;      }
      if (baseValue !== undefined) {
        leafUpdates.push({
          nodeId: child.nodeId,
          dto: { baseValue }   // baseValue only — no rollupOperator on leaves
        });
      }
    }

    // Anchor update — name and rollup operator
    const anchorDto: UpdateHierarchicalStepDto = {
      label: fv.name ?? node.label,
      name: fv.name ?? node.label,
      rollupOperator: fv.rollupOperator ?? 'Sum'
    };

    // Fire anchor first, then leaves sequentially via concatMap
    this.api.updateHierarchicalStep(scenarioId, node.nodeId, anchorDto).subscribe({
      next: () => {
        if (leafUpdates.length === 0) {
          this.dialogRef.close(true);
          return;
        }

        from(leafUpdates).pipe(
          concatMap(leaf => this.api.updateHierarchicalStep(scenarioId, leaf.nodeId, leaf.dto))
        ).subscribe({
          next: () => { },
          error: (err) => console.error('Failed to update leaf:', err),
          complete: () => this.dialogRef.close(true)
        });
      },
      error: (err) => console.error('Failed to update step anchor:', err)
    });
  }
}
