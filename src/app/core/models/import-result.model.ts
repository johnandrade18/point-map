/**
 * Human-readable labels for each discard reason.
 */
export const DISCARD_REASON_LABELS: Record<string, string> = {
  'not-feature-type': 'not a Feature type',
  'missing-geometry': 'missing or null geometry',
  'not-point-geometry': 'geometry is not a Point',
  'invalid-coordinates': 'invalid or out-of-range coordinates',
  'missing-properties': 'missing properties object',
  'invalid-name': 'name is missing or not a non-empty string',
  'invalid-category': 'category is missing or not a non-empty string',
  'duplicate-id': 'duplicate — already exists in current data',
};

export type DiscardReason = keyof typeof DISCARD_REASON_LABELS;

/**
 * Describes a single feature that was discarded during import.
 */
export interface DiscardedItem {
  index: number;
  reason: DiscardReason;
}

/**
 * Summary of a GeoJSON import operation.
 */
export interface ImportResult {
  imported: number;
  discarded: DiscardedItem[];
}
