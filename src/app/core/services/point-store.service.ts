import { computed, effect, inject, Injectable, signal } from '@angular/core';
import { v4 as uuidv4 } from 'uuid';
import { PointFeature, PointFeatureCollection } from '../models/point.model';
import { ImportResult } from '../models/import-result.model';
import { LocalStorageService } from './local-storage.service';
import { haversineMeters } from '../utils/haversine';

/** Minimum distance (metres) before a duplicate warning is raised. */
const DUPLICATE_THRESHOLD_M = 15;

@Injectable({ providedIn: 'root' })
export class PointStoreService {
  private readonly storage = inject(LocalStorageService);
  // ---------------------------------------------------------------------------
  // Private writable signals
  // ---------------------------------------------------------------------------
  private readonly _points = signal<PointFeature[]>([]);
  private readonly _selectedId = signal<string | null>(null);
  private readonly _importSummary = signal<ImportResult | null>(null);
  private readonly _isAddMode = signal(false);
  private readonly _searchQuery = signal('');
  private readonly _categoryFilter = signal('');

  /** Incremented each time a GeoJSON import happens → triggers fit-bounds in MapComponent. */
  private readonly _fitBoundsTick = signal(0);

  /** Non-null while a duplicate POI is within threshold distance. */
  private readonly _duplicateWarning = signal<string | null>(null);

  /** Undo/redo stacks hold snapshots of points + selection (max 50 entries each). */
  private readonly _undoStack = signal<{ points: PointFeature[]; selectedId: string | null }[]>([]);
  private readonly _redoStack = signal<{ points: PointFeature[]; selectedId: string | null }[]>([]);

  // ---------------------------------------------------------------------------
  // Public read-only signals
  // ---------------------------------------------------------------------------
  readonly points = this._points.asReadonly();
  readonly selectedId = this._selectedId.asReadonly();
  readonly importSummary = this._importSummary.asReadonly();
  readonly isAddMode = this._isAddMode.asReadonly();
  readonly searchQuery = this._searchQuery.asReadonly();
  readonly categoryFilter = this._categoryFilter.asReadonly();
  readonly fitBoundsTick = this._fitBoundsTick.asReadonly();
  readonly duplicateWarning = this._duplicateWarning.asReadonly();
  readonly canUndo = computed(() => this._undoStack().length > 0);
  readonly canRedo = computed(() => this._redoStack().length > 0);

  // ---------------------------------------------------------------------------
  // Derived (computed) signals
  // ---------------------------------------------------------------------------

  readonly filteredPoints = computed(() => {
    const query = this._searchQuery().toLowerCase().trim();
    const category = this._categoryFilter();
    return this._points().filter((p) => {
      const matchesQuery = !query || p.properties.name.toLowerCase().includes(query);
      const matchesCategory = !category || p.properties.category === category;
      return matchesQuery && matchesCategory;
    });
  });

  readonly selectedPoint = computed(
    () => this._points().find((p) => p.id === this._selectedId()) ?? null,
  );

  readonly categories = computed(() =>
    [...new Set(this._points().map((p) => p.properties.category))].sort(),
  );

  /** Maps category → number of POIs in that category (across ALL pois, not filtered). */
  readonly categoryCountMap = computed(() => {
    const map: Record<string, number> = {};
    for (const p of this._points()) {
      map[p.properties.category] = (map[p.properties.category] ?? 0) + 1;
    }
    return map;
  });

  // ---------------------------------------------------------------------------
  // Constructor – restore persisted state
  // ---------------------------------------------------------------------------

  constructor() {
    this.restoreFromStorage();

    // Auto-save to localStorage whenever points change
    effect(() => {
      const collection: PointFeatureCollection = {
        type: 'FeatureCollection',
        features: this._points(),
      };
      this.storage.save(collection);
    });
  }

  // ---------------------------------------------------------------------------
  // Mutations
  // ---------------------------------------------------------------------------

  addPoint(lon: number, lat: number): string {
    const nearby = this._points().find((p) => {
      const [pLon, pLat] = p.geometry.coordinates;
      return haversineMeters(lon, lat, pLon, pLat) < DUPLICATE_THRESHOLD_M;
    });
    this._duplicateWarning.set(
      nearby ? `Near "${nearby.properties.name}" (< ${DUPLICATE_THRESHOLD_M} m)` : null,
    );

    this.pushUndo();
    const newPoint: PointFeature = {
      type: 'Feature',
      id: uuidv4(),
      geometry: { type: 'Point', coordinates: [lon, lat] },
      properties: { name: 'New Point', category: 'other' },
    };
    this._points.update((points) => [...points, newPoint]);
    this._selectedId.set(newPoint.id);
    this._isAddMode.set(false);
    return newPoint.id;
  }

  updatePoint(id: string, updates: Partial<PointFeature['properties']>): void {
    this.pushUndo();
    this._points.update((points) =>
      points.map((p) => (p.id === id ? { ...p, properties: { ...p.properties, ...updates } } : p)),
    );
  }

  /** Updates only the geometry coordinates of a POI (used by drag & drop). */
  movePointCoordinates(id: string, lon: number, lat: number): void {
    this.pushUndo();
    this._points.update((points) =>
      points.map((p) =>
        p.id === id ? { ...p, geometry: { type: 'Point', coordinates: [lon, lat] } } : p,
      ),
    );
  }

  deletePoint(id: string): void {
    this.pushUndo();
    this._points.update((points) => points.filter((p) => p.id !== id));
    if (this._selectedId() === id) {
      this._selectedId.set(null);
    }
  }

  selectPoint(id: string | null): void {
    this._selectedId.set(id);
    if (id !== null) {
      this._isAddMode.set(false);
    }
  }

  toggleAddMode(): void {
    const next = !this._isAddMode();
    this._isAddMode.set(next);
    if (next) {
      this._selectedId.set(null);
    }
  }

  setAddMode(value: boolean): void {
    this._isAddMode.set(value);
  }

  importPoints(features: PointFeature[], result: ImportResult, mode: 'replace' | 'append' = 'replace'): void {
    if (mode === 'append') {
      this.pushUndo();
      this._points.update((existing) => {
        const existingIds = new Set(existing.map((p) => p.id));
        const newFeatures = features.filter((f) => !existingIds.has(f.id));
        const duplicatesSkipped = features.length - newFeatures.length;
        if (duplicatesSkipped > 0) {
          result = {
            ...result,
            imported: newFeatures.length,
            discarded: [
              ...result.discarded,
              ...Array.from({ length: duplicatesSkipped }, (_, i) => ({
                index: -1 - i,
                reason: 'duplicate-id',
              })),
            ],
          };
        }
        return [...existing, ...newFeatures];
      });
      this._selectedId.set(null);
      this._importSummary.set(result);
      this._fitBoundsTick.update((t) => t + 1);
    } else {
      this.pushUndo();
      this._points.set(features);
      this._selectedId.set(null);
      this._importSummary.set(result);
      this._fitBoundsTick.update((t) => t + 1);
    }
  }

  setSearchQuery(query: string): void {
    this._searchQuery.set(query);
  }

  setCategoryFilter(category: string): void {
    this._categoryFilter.set(category);
  }

  clearImportSummary(): void {
    this._importSummary.set(null);
  }

  save(): void {
    const collection: PointFeatureCollection = {
      type: 'FeatureCollection',
      features: this._points(),
    };
    this.storage.save(collection);
  }

  reset(): void {
    this.pushUndo();
    this._points.set([]);
    this._selectedId.set(null);
    this._importSummary.set(null);
    this._isAddMode.set(false);
    this._searchQuery.set('');
    this._categoryFilter.set('');
    this._duplicateWarning.set(null);
    this.storage.clear();
  }

  // ---------------------------------------------------------------------------
  // Undo / redo
  // ---------------------------------------------------------------------------

  undo(): void {
    const stack = this._undoStack();
    if (stack.length === 0) return;
    this._redoStack.update((s) => [
      ...s.slice(-49),
      { points: [...this._points()], selectedId: this._selectedId() },
    ]);
    const snapshot = stack[stack.length - 1];
    this._points.set(snapshot.points);
    this._selectedId.set(snapshot.selectedId);
    this._undoStack.update((s) => s.slice(0, -1));
  }

  redo(): void {
    const stack = this._redoStack();
    if (stack.length === 0) return;
    this._undoStack.update((s) => [
      ...s.slice(-49),
      { points: [...this._points()], selectedId: this._selectedId() },
    ]);
    const snapshot = stack[stack.length - 1];
    this._points.set(snapshot.points);
    this._redoStack.update((s) => s.slice(0, -1));
    this._selectedId.set(snapshot.selectedId);
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  private pushUndo(): void {
    this._undoStack.update((s) => [
      ...s.slice(-49),
      { points: [...this._points()], selectedId: this._selectedId() },
    ]);
    this._redoStack.set([]);
  }

  private restoreFromStorage(): void {
    const saved = this.storage.load();
    if (saved?.type === 'FeatureCollection' && Array.isArray(saved.features)) {
      this._points.set(saved.features);
    }
  }
}
