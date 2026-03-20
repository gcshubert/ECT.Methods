import { Component, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatTreeModule, MatTreeNestedDataSource } from '@angular/material/tree';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { AddStepDialogComponent } from './add-step-dialog.component';

interface StepNode {
  id: number;
  name: string;
  role: string;
  rollupOperator: string;
  children?: StepNode[];
}

@Component({
  selector: 'app-steps-tree',
  standalone: true,
  imports: [CommonModule, MatTreeModule, MatIconModule, MatButtonModule, MatDialogModule],
  templateUrl: './steps-tree.component.html',
  styleUrl: './steps-tree.component.scss'
})
export class StepsTreeComponent {
  scenarioId = input.required<string>();
  dataSource = new MatTreeNestedDataSource<StepNode>();

  childrenAccessor = (node: StepNode) => node.children ?? [];

  constructor(private dialog: MatDialog) {
    this.dataSource.data = [
      { id: 1, name: 'Base Process', role: 'To Be Assigned', rollupOperator: 'Sum', children: [] }
    ];
  }

  hasChild = (_: number, node: StepNode) => !!node.children && node.children.length > 0;

  addStep() {
    const dialogRef = this.dialog.open(AddStepDialogComponent, {
      width: '750px',            // Prevents the narrow/squashed layout
      maxWidth: '95vw',
      panelClass: 'dark-dialog', // Matches your styles.css background
      data: { scenarioId: this.scenarioId() }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        // Create the new node from the result (which contains E, T, C, k)
        const newNode: StepNode = {
          id: Date.now(), // Temporary ID for UI display
          name: result.name,
          role: result.role,
          rollupOperator: result.rollupOperator,
          children: []
        };

        // FORCE RE-RENDER: Re-assign the data source with a new array reference
        const data = this.dataSource.data;
        data[0].children = [...(data[0].children || []), newNode];
        this.dataSource.data = [...data];
      }
    });
  }
}
