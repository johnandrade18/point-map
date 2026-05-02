import { Injectable } from '@angular/core';
import { PointFeatureCollection } from '../models/point.model';

export const STORAGE_KEY = 'point_editor_state';

/**
 * Thin wrapper around localStorage that handles serialization and errors gracefully.
 * Abstracted as a service to allow easy mocking in tests.
 */
@Injectable({ providedIn: 'root' })
export class LocalStorageService {
  save(data: PointFeatureCollection): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (error) {
      console.error('[LocalStorageService] save failed:', error);
    }
  }

  load(): PointFeatureCollection | null {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw === null) return null;
      return JSON.parse(raw) as PointFeatureCollection;
    } catch (error) {
      console.error('[LocalStorageService] load failed:', error);
      return null;
    }
  }

  clear(): void {
    localStorage.removeItem(STORAGE_KEY);
  }
}
