import { Injectable } from '@angular/core';
import { validateGeoJsonFeature } from '../validators/geojson-feature.validator';
import { PointFeature } from '../models/point.model';
import { DiscardedItem, ImportResult } from '../models/import-result.model';

export interface ParsedImport {
  features: PointFeature[];
  result: ImportResult;
}

/**
 * Responsible for parsing raw JSON or File input into validated POI features,
 * collecting a summary of accepted vs. discarded features.
 */
@Injectable({ providedIn: 'root' })
export class GeoJsonImportService {
  /**
   * Parses a raw JavaScript value (already JSON-decoded) as a FeatureCollection.
   * Returns all valid POI features and a summary of discarded ones.
   */
  parseFeatureCollection(raw: unknown): ParsedImport {
    if (!this.isFeatureCollection(raw)) {
      return { features: [], result: { imported: 0, discarded: [] } };
    }

    const collection = raw as { features: unknown[] };
    const rawFeatures = Array.isArray(collection.features) ? collection.features : [];

    const features: PointFeature[] = [];
    const discarded: DiscardedItem[] = [];

    rawFeatures.forEach((rawFeature, index) => {
      const validation = validateGeoJsonFeature(rawFeature);
      if (validation.valid) {
        features.push(validation.feature);
      } else {
        discarded.push({ index, reason: validation.reason });
      }
    });

    return { features, result: { imported: features.length, discarded } };
  }

  /** Maximum accepted file size in bytes (10 MB). */
  static readonly MAX_FILE_SIZE = 10 * 1024 * 1024;

  /**
   * Reads a File as text, parses it as JSON, then delegates to parseFeatureCollection.
   * Throws if the file exceeds MAX_FILE_SIZE or contains invalid JSON.
   */
  async parseFile(file: File): Promise<ParsedImport> {
    if (file.size > GeoJsonImportService.MAX_FILE_SIZE) {
      throw new Error(`File is too large (${(file.size / 1024 / 1024).toFixed(1)} MB). Maximum allowed size is 10 MB.`);
    }
    const text = await file.text();
    let raw: unknown;
    try {
      raw = JSON.parse(text);
    } catch {
      throw new Error('Invalid JSON — the file could not be parsed.');
    }
    return this.parseFeatureCollection(raw);
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  private isFeatureCollection(value: unknown): boolean {
    if (typeof value !== 'object' || value === null) return false;
    const obj = value as Record<string, unknown>;
    return obj['type'] === 'FeatureCollection' && Array.isArray(obj['features']);
  }
}
