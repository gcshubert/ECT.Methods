import { Component, input, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatTreeModule, MatTreeNestedDataSource } from '@angular/material/tree';
import { CdkTreeModule } from '@angular/cdk/tree';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatTooltipModule } from '@angular/material/tooltip';
import { AddStepDialogComponent } from './add-step-dialog.component';
import { EditStepDialogComponent } from './edit-step-dialog.component';
import { ConfirmDialogComponent } from './confirm-dialog.component';
import { EctApiService } from '../../core/services/ect-api.service';
import { HierarchicalStepDto, ScientificValue } from '../../core/models/types';

interface StepNode {
  nodeId: string;
  label: string;
  role: string;
  parentNodeId?: string | null;
  parentNodeIds?: string[];
  isLeaf?: boolean;
  rollupOperator?: string | null;
  weight?: number | null;
  baseValue?: ScientificValue | null;
  effectiveValue?: number | null;
  weightedContribution?: number | null;
  isBottleneck?: boolean;
  provenance?: string | null;
  children?: StepNode[];
}

@Component({
  selector: 'app-steps-tree',
  standalone: true,
  imports: [
    CommonModule,
    MatTreeModule,
    CdkTreeModule,
    MatIconModule,
    MatButtonModule,
    MatDialogModule,
    MatTooltipModule
  ],
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

  expandedNodes = new Set<string>();

  isExpanded(node: StepNode): boolean {
    return this.expandedNodes.has(node.nodeId);
  }

  toggleNode(node: StepNode): void {
    if (this.expandedNodes.has(node.nodeId)) {
      this.expandedNodes.delete(node.nodeId);
    } else {
      this.expandedNodes.add(node.nodeId);
    }
  }

  ngOnInit() {
    this.loadSteps();
  }

  loadSteps() {
    this.api.getHierarchicalSteps(+this.scenarioId()).subscribe({
      next: (steps) => { this.dataSource.data = this.buildTree(steps); },
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
        parentNodeId: s.parentNodeId ?? null,
        parentNodeIds: s.parentNodeIds ?? [],
        rollupOperator: s.rollupOperator,
        weight: s.weight ?? null,
        baseValue: s.baseValue,
        children: []
      });
    }

    for (const s of steps) {
      const node = nodeMap.get(s.nodeId)!;
      if (s.parentNodeId && nodeMap.has(s.parentNodeId)) {
        nodeMap.get(s.parentNodeId)!.children!.push(node);
      } else {
        // Only anchor nodes (role='k', id doesn't end in '-k') become roots
        // Leaf parameter nodes without a recognised parent are orphans — skip them
        const isAnchor = s.role === 'k' && !s.nodeId.endsWith('-k');
        if (isAnchor) roots.push(node);
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
      if (result) this.loadSteps();
    });
  }

  editStep(node: StepNode) {
    const dialogRef = this.dialog.open(EditStepDialogComponent, {
      width: '750px',
      maxWidth: '95vw',
      panelClass: 'dark-dialog',
      data: { scenarioId: this.scenarioId(), stepNode: node }
    });
    dialogRef.afterClosed().subscribe(result => {
      if (result) this.loadSteps();
    });
  }

  deleteStep(node: StepNode) {
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      width: '420px',
      panelClass: 'dark-dialog',
      data: {
        title: 'Delete Step',
        message: `Delete "${node.label}" and its parameters? This cannot be undone.`
      }
    });

    dialogRef.afterClosed().subscribe((confirmed: boolean) => {
      if (!confirmed) return;
      this.api.deleteHierarchicalStep(+this.scenarioId(), node.nodeId).subscribe({
        next: () => this.loadSteps(),
        error: (err) => console.error(`Failed to delete step ${node.nodeId}:`, err)
      });
    });
  }

  formatScientificValue(value: ScientificValue | null): string {
    if (!value) return '';
    return `${value.coefficient} × 10^${value.exponent}`;
  }
}
