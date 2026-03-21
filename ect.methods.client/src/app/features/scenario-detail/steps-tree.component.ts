import { Component, input, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatTreeModule, MatTreeNestedDataSource } from '@angular/material/tree';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { AddStepDialogComponent } from './add-step-dialog.component';
import { EctApiService } from '../../core/services/ect-api.service';
import { HierarchicalStepDto } from '../../core/models/types';

interface StepNode {
  nodeId: string;
  label: string;
  role: string;
  rollupOperator?: string | null;
  baseValue?: number | null;
  children?: StepNode[];
}

@Component({
  selector: 'app-steps-tree',
  standalone: true,
  imports: [CommonModule, MatTreeModule, MatIconModule, MatButtonModule, MatDialogModule],
  templateUrl: './steps-tree.component.html',
  styleUrl: './steps-tree.component.scss'
})
export class StepsTreeComponent implements OnInit {
  scenarioId = input.required<string>();
  private api = inject(EctApiService);
  private dialog = inject(MatDialog);

  dataSource = new MatTreeNestedDataSource<StepNode>();
  childrenAccessor = (node: StepNode) => node.children ?? [];
  hasChild = (_: number, node: StepNode) =>
    !!node.children && node.children.length > 0;

  ngOnInit() {
    this.loadSteps();
  }

  loadSteps() {
    this.api.getHierarchicalSteps(+this.scenarioId()).subscribe({
      next: (steps) => {
        this.dataSource.data = this.buildTree(steps);
      },
      error: (err) => console.error('Failed to load steps:', err)
    });
  }

  private buildTree(steps: HierarchicalStepDto[]): StepNode[] {
    const nodeMap = new Map<string, StepNode>();
    const roots: StepNode[] = [];

    for (const s of steps) {
      nodeMap.set(s.nodeId, {
        nodeId: s.nodeId,
        label: s.label,
        role: s.role,
        rollupOperator: s.rollupOperator,
        baseValue: s.baseValue,
        children: []
      });
    }

    for (const s of steps) {
      const node = nodeMap.get(s.nodeId)!;
      if (s.parentNodeId && nodeMap.has(s.parentNodeId)) {
        nodeMap.get(s.parentNodeId)!.children!.push(node);
      } else {
        roots.push(node);
      }
    }

    return roots;
  }

  addStep() {
    const dialogRef = this.dialog.open(AddStepDialogComponent, {
      width: '750px',
      maxWidth: '95vw',
      panelClass: 'dark-dialog',
      data: { scenarioId: this.scenarioId() }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.loadSteps();
      }
    });
  }
}
