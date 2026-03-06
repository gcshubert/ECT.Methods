import { Pipe, PipeTransform } from '@angular/core';
import { ScientificValue } from '../../core/models/types';

/**
 * Formats a ScientificValue { coefficient, exponent } as "1.85 × 10^174000"
 * Usage in template:  {{ analysis.cDeficit | scientific }}
 */
@Pipe({ name: 'scientific', standalone: true })
export class ScientificPipe implements PipeTransform {
  transform(value: ScientificValue | null | undefined): string {
    if (!value) return '—';
    const { coefficient, exponent } = value;
    if (exponent === 0) return `${coefficient}`;
    return `${coefficient} × 10^${exponent.toLocaleString()}`;
  }
}
