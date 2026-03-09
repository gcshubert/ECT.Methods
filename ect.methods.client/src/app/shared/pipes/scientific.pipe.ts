import { Pipe, PipeTransform } from '@angular/core';
import { ScientificValue } from '../../core/models/types';

/**
 * Formats a ScientificValue as a readable string.
 * e.g. { coefficient: 1.85, exponent: 174000 } → "1.85 × 10^174000"
 * Falls back gracefully for null/undefined.
 */
@Pipe({
  name: 'scientific',
  standalone: true,
  pure: true,
})
export class ScientificPipe implements PipeTransform {
  transform(value: ScientificValue | null | undefined): string {
    if (value == null) return '—';
    const { coefficient, exponent } = value;
    if (exponent === 0) return `${coefficient}`;
    if (exponent === 1) return `${coefficient} × 10`;
    return `${coefficient} × 10^${exponent}`;
  }
}
