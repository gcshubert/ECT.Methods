/**
 * ECT Math Utilities — Angular boundary helpers.
 *
 * These are pure functions for converting between the collapsed double
 * representation (used in Neo4j USES edges until Track 4) and the
 * coefficient/exponent form used in the UI.
 *
 * Track 4 TODO: once UsesEdge carries ScientificValueDto, fromDouble()
 * can be replaced with a direct mapping and toDouble() becomes the
 * canonical serialisation step at the API boundary only.
 */

/**
 * Collapses a scientific notation pair to a plain double.
 * Used when sending values to the API.
 */
export function toDouble(coefficient: number | null, exponent: number | null): number {
  return (coefficient ?? 1) * Math.pow(10, exponent ?? 0);
}

/**
 * Decomposes a plain double into a standard scientific notation pair.
 * Used when pre-populating form fields from stored values.
 *
 * Examples:
 *   3000   → { coefficient: 3,    exponent: 3 }
 *   0.005  → { coefficient: 5,    exponent: -3 }
 *   1      → { coefficient: 1,    exponent: 0 }
 *   0      → { coefficient: 0,    exponent: 0 }
 */
export function fromDouble(value: number | null | undefined): { coefficient: number; exponent: number } {
  if (!value) return { coefficient: 0, exponent: 0 };

  const exponent = Math.floor(Math.log10(Math.abs(value)));
  const coefficient = parseFloat((value / Math.pow(10, exponent)).toFixed(6));

  return { coefficient, exponent };
}
