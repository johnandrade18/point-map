import { Injectable } from '@angular/core';
import { PointFeature, PointFeatureCollection } from '../models/point.model';

/**
 * Converts in-memory POI features to a downloadable GeoJSON file.
 */
@Injectable({ providedIn: 'root' })
export class GeoJsonExportService {
  toFeatureCollection(features: PointFeature[]): PointFeatureCollection {
    return { type: 'FeatureCollection', features };
  }

  /**
   * Serializes the feature list to a GeoJSON blob and triggers a browser download.
   */
  download(features: PointFeature[], filename = 'points-export.geojson'): void {
    const collection = this.toFeatureCollection(features);
    const json = JSON.stringify(collection, null, 2);
    this.triggerDownload(json, filename, 'application/geo+json');
  }

  /**
   * Serializes the feature list to a CSV (name, category, lat, lng)
   * and triggers a browser download.
   */
  downloadCsv(features: PointFeature[], filename = 'points-export.csv'): void {
    const header = 'name,category,lat,lng';
    const rows = features.map(f => {
      const { name, category } = f.properties;
      const [lng, lat] = f.geometry.coordinates;
      const escape = (v: string) => `"${String(v).replace(/"/g, '""')}"`;
      return [escape(name), escape(category), lat.toFixed(6), lng.toFixed(6)].join(',');
    });
    const csv = [header, ...rows].join('\r\n');
    this.triggerDownload(csv, filename, 'text/csv;charset=utf-8');
  }

  private triggerDownload(content: string, filename: string, mime: string): void {
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    anchor.click();
    URL.revokeObjectURL(url);
  }
}
