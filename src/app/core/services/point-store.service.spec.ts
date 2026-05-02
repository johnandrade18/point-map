import { TestBed } from '@angular/core/testing';
import { PointStoreService } from './point-store.service';
import { LocalStorageService } from './local-storage.service';
import { PointFeature } from '../models/point.model';

function makeFeature(overrides: Partial<PointFeature> = {}): PointFeature {
  return {
    type: 'Feature',
    id: 'test-id',
    geometry: { type: 'Point', coordinates: [-70.65, -33.44] },
    properties: { name: 'Test POINT', category: 'landmark' },
    ...overrides,
  };
}

function makeMockStorage(loadReturnValue: unknown = null) {
  return {
    save: vi.fn(),
    load: vi.fn().mockReturnValue(loadReturnValue),
    clear: vi.fn(),
  };
}

describe('PointStoreService', () => {
  let store: PointStoreService;
  let mockStorage: ReturnType<typeof makeMockStorage>;

  beforeEach(() => {
    mockStorage = makeMockStorage();

    TestBed.configureTestingModule({
      providers: [
        PointStoreService,
        { provide: LocalStorageService, useValue: mockStorage },
      ],
    });

    store = TestBed.inject(PointStoreService);
  });

  describe('initial state', () => {
    it('should start with an empty POINT list', () =>
      expect(store.points().length).toBe(0));

    it('should start with no selection', () =>
      expect(store.selectedId()).toBeNull());

    it('should start with add-mode off', () =>
      expect(store.isAddMode()).toBe(false));

    it('should start with no import summary', () =>
      expect(store.importSummary()).toBeNull());
  });

  describe('restoreFromStorage', () => {
    it('should load features from storage on construction', () => {
      const saved = {
        type: 'FeatureCollection' as const,
        features: [makeFeature({ id: 'stored-1' })],
      };

      TestBed.resetTestingModule();
      TestBed.configureTestingModule({
        providers: [
          PointStoreService,
          { provide: LocalStorageService, useValue: makeMockStorage(saved) },
        ],
      });
      const freshStore = TestBed.inject(PointStoreService);
      expect(freshStore.points().length).toBe(1);
      expect(freshStore.points()[0].id).toBe('stored-1');
    });
  });

  describe('addPoint', () => {
    it('should add a new POINT with the given coordinates', () => {
      store.addPoint(-70.65, -33.44);
      expect(store.points().length).toBe(1);
      expect(store.points()[0].geometry.coordinates).toEqual([-70.65, -33.44]);
    });

    it('should auto-select the newly added POINT', () => {
      store.addPoint(-70.65, -33.44);
      const newId = store.points()[0].id;
      expect(store.selectedId()).toBe(newId);
    });

    it('should turn off add mode after adding', () => {
      store.toggleAddMode();
      store.addPoint(-70.65, -33.44);
      expect(store.isAddMode()).toBe(false);
    });
  });

  describe('updatePoint', () => {
    it('should update only the specified POINT properties', () => {
      store.addPoint(-70.65, -33.44);
      const id = store.points()[0].id;
      store.updatePoint(id, { name: 'Updated Name', category: 'park' });
      expect(store.points()[0].properties.name).toBe('Updated Name');
      expect(store.points()[0].properties.category).toBe('park');
    });

    it('should not affect other POINTs', () => {
      store.addPoint(-70.65, -33.44);
      store.addPoint(-70.60, -33.40);
      const firstId = store.points()[0].id;
      const secondId = store.points()[1].id;
      store.updatePoint(firstId, { name: 'Only First' });
      expect(store.points()[1].properties.name).not.toBe('Only First');
      expect(store.points()[1].id).toBe(secondId);
    });
  });

  describe('deletePoint', () => {
    it('should remove the POINT with the given id', () => {
      store.addPoint(-70.65, -33.44);
      const id = store.points()[0].id;
      store.deletePoint(id);
      expect(store.points().length).toBe(0);
    });

    it('should clear selection when the selected POINT is deleted', () => {
      store.addPoint(-70.65, -33.44);
      const id = store.points()[0].id;
      store.selectPoint(id);
      store.deletePoint(id);
      expect(store.selectedId()).toBeNull();
    });
  });

  describe('selectPoint', () => {
    it('should set the selectedId', () => {
      store.addPoint(-70.65, -33.44);
      const id = store.points()[0].id;
      store.selectPoint(id);
      expect(store.selectedId()).toBe(id);
    });

    it('should turn off add mode when selecting a POINT', () => {
      store.toggleAddMode();
      store.addPoint(-70.65, -33.44);
      const id = store.points()[0].id;
      store.selectPoint(id);
      expect(store.isAddMode()).toBe(false);
    });
  });

  describe('filteredPoints', () => {
    beforeEach(() => {
      store.importPoints(
        [
          makeFeature({ id: '1', properties: { name: 'Alpha Park', category: 'park' } }),
          makeFeature({ id: '2', properties: { name: 'Beta Mall', category: 'mall' } }),
          makeFeature({ id: '3', properties: { name: 'Gamma Park', category: 'park' } }),
        ],
        { imported: 3, discarded: [] }
      );
    });

    it('should return all points when query and category are empty', () =>
      expect(store.filteredPoints().length).toBe(3));

    it('should filter by name query (case-insensitive)', () => {
      store.setSearchQuery('alpha');
      expect(store.filteredPoints().length).toBe(1);
      expect(store.filteredPoints()[0].id).toBe('1');
    });

    it('should filter by category', () => {
      store.setCategoryFilter('park');
      expect(store.filteredPoints().length).toBe(2);
    });

    it('should apply both query and category filters simultaneously', () => {
      store.setSearchQuery('gamma');
      store.setCategoryFilter('park');
      expect(store.filteredPoints().length).toBe(1);
      expect(store.filteredPoints()[0].id).toBe('3');
    });
  });

  describe('categories', () => {
    it('should return unique, sorted categories', () => {
      store.importPoints(
        [
          makeFeature({ id: '1', properties: { name: 'A', category: 'zoo' } }),
          makeFeature({ id: '2', properties: { name: 'B', category: 'landmark' } }),
          makeFeature({ id: '3', properties: { name: 'C', category: 'landmark' } }),
        ],
        { imported: 3, discarded: [] }
      );
      expect(store.categories()).toEqual(['landmark', 'zoo']);
    });
  });

  describe('save', () => {
    it('should call storage.save with a FeatureCollection', () => {
      store.addPoint(-70.65, -33.44);
      store.save();
      expect(mockStorage.save).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'FeatureCollection' })
      );
    });
  });

  describe('reset', () => {
    it('should clear all state', () => {
      store.addPoint(-70.65, -33.44);
      store.toggleAddMode();
      store.reset();
      expect(store.points().length).toBe(0);
      expect(store.isAddMode()).toBe(false);
      expect(store.selectedId()).toBeNull();
    });

    it('should call storage.clear', () => {
      store.reset();
      expect(mockStorage.clear).toHaveBeenCalled();
    });
  });

  describe('undo / redo', () => {
    it('canUndo should be false when no mutations have occurred', () =>
      expect(store.canUndo()).toBe(false));

    it('canRedo should be false initially', () =>
      expect(store.canRedo()).toBe(false));

    it('should undo an addPoint operation', () => {
      store.addPoint(-70.65, -33.44);
      expect(store.points().length).toBe(1);
      store.undo();
      expect(store.points().length).toBe(0);
    });

    it('canUndo should be true after an addPoint', () => {
      store.addPoint(-70.65, -33.44);
      expect(store.canUndo()).toBe(true);
    });

    it('canRedo should be true after undo', () => {
      store.addPoint(-70.65, -33.44);
      store.undo();
      expect(store.canRedo()).toBe(true);
    });

    it('should redo a previously undone addPoint', () => {
      store.addPoint(-70.65, -33.44);
      store.undo();
      store.redo();
      expect(store.points().length).toBe(1);
    });

    it('should clear redo stack when a new mutation occurs after undo', () => {
      store.addPoint(-70.65, -33.44);
      store.undo();
      store.addPoint(-70.60, -33.40);
      expect(store.canRedo()).toBe(false);
    });

    it('should undo a deletePoint operation', () => {
      store.addPoint(-70.65, -33.44);
      const id = store.points()[0].id;
      store.deletePoint(id);
      expect(store.points().length).toBe(0);
      store.undo();
      expect(store.points().length).toBe(1);
    });
  });

  describe('categoryCountMap', () => {
    it('should return counts per category', () => {
      store.importPoints(
        [
          makeFeature({ id: '1', properties: { name: 'A', category: 'park' } }),
          makeFeature({ id: '2', properties: { name: 'B', category: 'park' } }),
          makeFeature({ id: '3', properties: { name: 'C', category: 'landmark' } }),
        ],
        { imported: 3, discarded: [] }
      );
      expect(store.categoryCountMap()['park']).toBe(2);
      expect(store.categoryCountMap()['landmark']).toBe(1);
    });

    it('should return empty map when no points', () =>
      expect(Object.keys(store.categoryCountMap()).length).toBe(0));
  });

  describe('movePointCoordinates', () => {
    it('should update only the geometry coordinates', () => {
      store.addPoint(-70.65, -33.44);
      const id = store.points()[0].id;
      store.movePointCoordinates(id, -70.60, -33.40);
      expect(store.points()[0].geometry.coordinates).toEqual([-70.60, -33.40]);
    });

    it('should be undoable', () => {
      store.addPoint(-70.65, -33.44);
      const id = store.points()[0].id;
      store.movePointCoordinates(id, -70.60, -33.40);
      store.undo();
      expect(store.points()[0].geometry.coordinates).toEqual([-70.65, -33.44]);
    });
  });

  describe('duplicateWarning', () => {
    it('should be null initially', () =>
      expect(store.duplicateWarning()).toBeNull());

    it('should be null when adding a point far from others', () => {
      store.addPoint(-70.65, -33.44);
      store.addPoint(-70.60, -33.40); // ~6 km away
      expect(store.duplicateWarning()).toBeNull();
    });

    it('should be non-null when adding a point within threshold distance', () => {
      store.addPoint(-70.65000, -33.44000);
      store.addPoint(-70.65001, -33.44001); // ~13 m away
      expect(store.duplicateWarning()).not.toBeNull();
    });

    it('should still add the point even when a duplicate warning fires', () => {
      store.addPoint(-70.65000, -33.44000);
      store.addPoint(-70.65001, -33.44001);
      expect(store.points().length).toBe(2);
    });
  });

  describe('fitBoundsTick', () => {
    it('should be 0 initially', () =>
      expect(store.fitBoundsTick()).toBe(0));

    it('should increment on importPoints', () => {
      store.importPoints([], { imported: 0, discarded: [] });
      expect(store.fitBoundsTick()).toBe(1);
      store.importPoints([], { imported: 0, discarded: [] });
      expect(store.fitBoundsTick()).toBe(2);
    });
  });
});
