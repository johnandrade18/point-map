import { v4 as uuidv4 } from 'uuid';
import { Coordinates, PointFeature } from '../models/point.model';
import { DiscardReason } from '../models/import-result.model';

// ---------------------------------------------------------------------------
// Result types
// ---------------------------------------------------------------------------

export interface ValidationSuccess {
  valid: true;
  feature: PointFeature;
}

export interface ValidationFailure {
  valid: false;
  reason: DiscardReason;
}

export type ValidationResult = ValidationSuccess | ValidationFailure;

// ---------------------------------------------------------------------------
// Pure coordinate helpers (exported for unit testing)
// ---------------------------------------------------------------------------

export function isValidLongitude(lon: number): boolean {
  return lon >= -180 && lon <= 180;
}

export function isValidLatitude(lat: number): boolean {
  return lat >= -90 && lat <= 90;
}

export function isValidCoordinates(value: unknown): value is Coordinates {
  if (!Array.isArray(value) || value.length < 2) return false;
  const [lon, lat] = value as unknown[];
  return (
    typeof lon === 'number' &&
    typeof lat === 'number' &&
    !isNaN(lon) &&
    !isNaN(lat) &&
    isValidLongitude(lon) &&
    isValidLatitude(lat)
  );
}

// ---------------------------------------------------------------------------
// Main validator
// ---------------------------------------------------------------------------

/**
 * Validates a raw (parsed-JSON) value as a POI GeoJSON Feature.
 * Returns either a typed PoiFeature or a DiscardReason.
 */
export function validateGeoJsonFeature(raw: unknown): ValidationResult {
  if (typeof raw !== 'object' || raw === null) {
    return fail('not-feature-type');
  }

  const obj = raw as Record<string, unknown>;

  if (obj['type'] !== 'Feature') {
    return fail('not-feature-type');
  }

  const geometry = obj['geometry'];
  if (!geometry || typeof geometry !== 'object') {
    return fail('missing-geometry');
  }

  const geom = geometry as Record<string, unknown>;

  if (geom['type'] !== 'Point') {
    return fail('not-point-geometry');
  }

  if (!isValidCoordinates(geom['coordinates'])) {
    return fail('invalid-coordinates');
  }

  const rawProps = obj['properties'];
  if (!rawProps || typeof rawProps !== 'object' || Array.isArray(rawProps)) {
    return fail('missing-properties');
  }

  const props = rawProps as Record<string, unknown>;

  if (typeof props['name'] !== 'string' || (props['name'] as string).trim() === '') {
    return fail('invalid-name');
  }

  if (typeof props['category'] !== 'string' || (props['category'] as string).trim() === '') {
    return fail('invalid-category');
  }

  const feature: PointFeature = {
    type: 'Feature',
    id: resolveId(obj['id']),
    geometry: {
      type: 'Point',
      coordinates: geom['coordinates'] as Coordinates,
    },
    properties: {
      ...(props as PointFeature['properties']),
      name: (props['name'] as string).trim(),
      category: (props['category'] as string).trim(),
    },
  };

  return { valid: true, feature };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function fail(reason: DiscardReason): ValidationFailure {
  return { valid: false, reason };
}

function resolveId(raw: unknown): string {
  if (typeof raw === 'string' && raw.trim() !== '') return raw.trim();
  if (typeof raw === 'number') return String(raw);
  return uuidv4();
}
