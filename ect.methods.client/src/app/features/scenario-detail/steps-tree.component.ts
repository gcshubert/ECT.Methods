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
  E?: ScientificValue | null;
  C?: ScientificValue | null;
  K?: ScientificValue | null;
  T?: ScientificValue | null;
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

  clearScenario() {
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      width: '420px',
      panelClass: 'dark-dialog',
      data: {
        title: 'Clear Scenario',
        message: 'Delete all steps and parameters for this scenario? This cannot be undone.'
      }
    });

    dialogRef.afterClosed().subscribe((confirmed: boolean) => {
      if (!confirmed) return;
      this.api.clearScenario(+this.scenarioId()).subscribe({
        next: () => this.loadSteps(),
        error: (err) => console.error('Failed to clear scenario:', err)
      });
    });
  }

  dataSource = new MatTreeNestedDataSource<StepNode>();
  childrenAccessor = (node: StepNode) => node.children ?? [];
  hasChild = (_: number, node: StepNode) =>
    // All step anchor nodes (role="k") should be expandable, even if they have no parameters yet
    node.role === 'k' || (!!node.children && node.children.length > 0);

  
  ngOnInit() {
    this.loadSteps();
  }

  loadSteps() {
    this.api.getHierarchicalSteps(+this.scenarioId()).subscribe({
      next: (steps) => {
        console.log('API Response - steps from backend:', steps);
        steps.forEach(step => {
          console.log(`Step ${step.nodeId}:`, {
            label: step.label,
            E: step.E,
            C: step.C,
            K: step.K,
            T: step.T
          });
        });
        this.dataSource.data = this.buildTree(steps);
      },
      error: (err) => console.error('Failed to load steps:', err)
    });
  }

  private buildTree(steps: HierarchicalStepDto[]): StepNode[] {
    const nodeMap = new Map<string, StepNode>();
    const roots: StepNode[] = [];

    for (const s of steps) {
      // Debug what's in the step from API
      console.log(`buildTree - processing step ${s.nodeId}:`, {
        label: s.label,
        E: s.E,
        C: s.C,
        K: s.K,
        T: s.T
      });
      
      // Create parameter info children for display (but not separate nodes)
      const paramChildren: StepNode[] = [];
      if (s.E) paramChildren.push({
        nodeId: s.nodeId + '-E', label: 'E',
        role: 'E', isLeaf: true, baseValue: s.E, children: []
      });
      if (s.C) paramChildren.push({
        nodeId: s.nodeId + '-C', label: 'C',
        role: 'C', isLeaf: true, baseValue: s.C, children: []
      });
      if (s.K) paramChildren.push({
        nodeId: s.nodeId + '-k', label: 'k',
        role: 'k', isLeaf: true, baseValue: s.K, children: []
      });
      if (s.T) paramChildren.push({
        nodeId: s.nodeId + '-T', label: 'T',
        role: 'T', isLeaf: true, baseValue: s.T, children: []
      });

      const e = s.E;
      const c = s.C;
      const k = s.K;
      const t = s.T;

      nodeMap.set(s.nodeId, {
        nodeId: s.nodeId,
        label: s.label,
        role: s.role,
        parentNodeId: s.parentNodeId ?? null,
        parentNodeIds: s.parentNodeIds ?? [],
        rollupOperator: s.rollupOperator,
        weight: s.weight ?? null,
        baseValue: null,
        E: e,
        C: c,
        K: k,
        T: t,
        children: paramChildren   // display parameters as children for UI
      });
    }

    for (const s of steps) {
      const node = nodeMap.get(s.nodeId)!;
      if (s.parentNodeId && nodeMap.has(s.parentNodeId)) {
        // Insert before param children so sub-steps appear above params
        const parent = nodeMap.get(s.parentNodeId)!;
        parent.children = [node, ...(parent.children ?? [])];
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
      if (result) this.loadSteps();
    });
  }

  editStep(node: StepNode) {
    // Debug node role and data
    console.log('editStep called with node:', node);
    console.log('Node role:', node.role);
    console.log('Node type:', typeof node.role);
    console.log('Node E:', node.E);
    console.log('Node C:', node.C);
    console.log('Node K:', node.K);
    console.log('Node T:', node.T);
    
    // Only allow editing of anchor nodes (role="k"), not parameter leaf nodes
    if (node.role !== 'k') {
      console.log('Edit blocked: node role is not "k"');
      return;
    }
    
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
    // Debug node role
    console.log('deleteStep called with node:', node);
    console.log('Node role:', node.role);
    console.log('Node type:', typeof node.role);
    
    // Only allow deleting of anchor nodes (role="k"), not parameter leaf nodes
    if (node.role !== 'k') {
      console.log('Delete blocked: node role is not "k"');
      return;
    }
    
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
