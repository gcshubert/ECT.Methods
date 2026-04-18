import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatDialogModule, MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { EctApiService } from '../../core/services/ect-api.service';
import { UpdateHierarchicalStepDto, ScientificValue } from '../../core/models/types';

// Minimal StepNode shape — Track 4 TODO: move to types.ts
interface StepNode {
  nodeId: string;
  label: string;
  role: string;
  rollupOperator?: string | null;
  weight?: number | null;
  baseValue?: ScientificValue | null;
  // Parameter values on step anchor
  E?: ScientificValue | null;
  C?: ScientificValue | null;
  K?: ScientificValue | null;
  T?: ScientificValue | null;
  children?: StepNode[];
}

export interface EditStepDialogData {
  scenarioId: string;
  stepNode: StepNode;
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
  templateUrl: './edit-step-dialog.component.html',
  })
export class EditStepDialogComponent implements OnInit {
  private fb = inject(FormBuilder);
  private api = inject(EctApiService);
  public dialogRef = inject(MatDialogRef<EditStepDialogComponent>);
  public data = inject<EditStepDialogData>(MAT_DIALOG_DATA);

  operators = ['Sum', 'Product', 'WeightedSum', 'Max', 'Min'];

  stepForm: FormGroup;

  constructor() {
    this.stepForm = this.fb.group({
      name:         [this.data.stepNode.label, Validators.required],
      rollupOperator: [this.data.stepNode.rollupOperator ?? 'Sum', Validators.required],
      energy:       this.fb.group({ coefficient: [1.0], exponent: [0] }),
      control:      this.fb.group({ coefficient: [1.0], exponent: [0] }),
      complexity:   this.fb.group({ coefficient: [1.0], exponent: [0] }),
      timeAvailable: this.fb.group({ coefficient: [1.0], exponent: [0] }),
    });
  }

  ngOnInit(): void {
    const node = this.data.stepNode;
    
    // Debug received data
    console.log('EditDialog - received node:', node);
    console.log('EditDialog - node.E:', node.E);
    console.log('EditDialog - node.C:', node.C);
    console.log('EditDialog - node.K:', node.K);
    console.log('EditDialog - node.T:', node.T);

    // Pre-populate from step anchor properties passed via stepNode
    // Falls back to API fetch only if values are absent from the node
    if (node.E || node.C || node.K || node.T) {
      this.stepForm.patchValue({
        energy:        { coefficient: node.E?.coefficient ?? 1.0, exponent: node.E?.exponent ?? 0 },
        control:       { coefficient: node.C?.coefficient ?? 1.0, exponent: node.C?.exponent ?? 0 },
        complexity:    { coefficient: node.K?.coefficient ?? 1.0, exponent: node.K?.exponent ?? 0 },
        timeAvailable: { coefficient: node.T?.coefficient ?? 1.0, exponent: node.T?.exponent ?? 0 },
      });
    } else {
      // Fallback: fetch from API if node didn't carry parameter values
      this.api.getHierarchicalSteps(+this.data.scenarioId).subscribe({
        next: (steps) => {
          const fullStep = steps.find(s => s.nodeId === node.nodeId);
          if (fullStep) {
            this.stepForm.patchValue({
              energy:        { coefficient: fullStep.E?.coefficient ?? 1.0, exponent: fullStep.E?.exponent ?? 0 },
              control:       { coefficient: fullStep.C?.coefficient ?? 1.0, exponent: fullStep.C?.exponent ?? 0 },
              complexity:    { coefficient: fullStep.K?.coefficient ?? 1.0, exponent: fullStep.K?.exponent ?? 0 },
              timeAvailable: { coefficient: fullStep.T?.coefficient ?? 1.0, exponent: fullStep.T?.exponent ?? 0 },
            });
          }
        },
        error: (err) => console.error('Failed to load step data:', err)
      });
    }
  }

  onSave(): void {
    if (!this.stepForm.valid) return;

    const fv = this.stepForm.getRawValue();
    const node = this.data.stepNode;

    const anchorDto: UpdateHierarchicalStepDto = {
      label: fv.name ?? node.label,
      name:  fv.name ?? node.label,
      rollupOperator: fv.rollupOperator ?? 'Sum',
      E: { coefficient: fv.energy.coefficient ?? 1.0,       exponent: fv.energy.exponent ?? 0 },
      C: { coefficient: fv.control.coefficient ?? 1.0,      exponent: fv.control.exponent ?? 0 },
      K: { coefficient: fv.complexity.coefficient ?? 1.0,   exponent: fv.complexity.exponent ?? 0 },
      T: { coefficient: fv.timeAvailable.coefficient ?? 1.0, exponent: fv.timeAvailable.exponent ?? 0 }
    };

    this.api.updateHierarchicalStep(+this.data.scenarioId, node.nodeId, anchorDto).subscribe({
      next: () => this.dialogRef.close(true),
      error: (err) => console.error('Failed to update step:', err)
    });
  }
}
