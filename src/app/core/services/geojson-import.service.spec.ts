import { GeoJsonImportService } from './geojson-import.service';

describe('GeoJsonImportService', () => {
  let service: GeoJsonImportService;

  beforeEach(() => {
    service = new GeoJsonImportService();
  });

  const validFeature = (override: object = {}) => ({
    type: 'Feature',
    geometry: { type: 'Point', coordinates: [-70.65, -33.44] },
    properties: { name: 'Test', category: 'landmark' },
    ...override,
  });

  describe('parseFeatureCollection', () => {
    describe('given a non-FeatureCollection input', () => {
      it('should return empty features and zero counts for null', () => {
        const result = service.parseFeatureCollection(null);
        expect(result.features.length).toBe(0);
        expect(result.result.imported).toBe(0);
      });

      it('should return empty features for a plain object without features array', () => {
        const result = service.parseFeatureCollection({ type: 'Feature' });
        expect(result.features.length).toBe(0);
      });
    });

    describe('given a FeatureCollection with only valid features', () => {
      it('should import all features', () => {
        const input = {
          type: 'FeatureCollection',
          features: [validFeature({ id: 'a' }), validFeature({ id: 'b' })],
        };
        const { result } = service.parseFeatureCollection(input);
        expect(result.imported).toBe(2);
        expect(result.discarded.length).toBe(0);
      });
    });

    describe('given a FeatureCollection mixing valid and invalid features', () => {
      it('should import only valid features', () => {
        const input = {
          type: 'FeatureCollection',
          features: [
            validFeature(),
            { type: 'Feature', geometry: null, properties: { name: 'X', category: 'Y' } },
            validFeature(),
          ],
        };
        const { features, result } = service.parseFeatureCollection(input);
        expect(features.length).toBe(2);
        expect(result.imported).toBe(2);
        expect(result.discarded.length).toBe(1);
      });

      it('should record the correct index and reason for discarded items', () => {
        const input = {
          type: 'FeatureCollection',
          features: [
            validFeature(),
            { type: 'Feature', geometry: { type: 'Point', coordinates: [-200, 0] }, properties: { name: 'X', category: 'Y' } },
          ],
        };
        const { result } = service.parseFeatureCollection(input);
        expect(result.discarded[0].index).toBe(1);
        expect(result.discarded[0].reason).toBe('invalid-coordinates');
      });
    });

    describe('given a FeatureCollection where all features are invalid', () => {
      it('should return zero imports and correct discard count', () => {
        const input = {
          type: 'FeatureCollection',
          features: [
            { type: 'Feature', geometry: null, properties: null },
            { type: 'NotFeature', geometry: null, properties: null },
          ],
        };
        const { result } = service.parseFeatureCollection(input);
        expect(result.imported).toBe(0);
        expect(result.discarded.length).toBe(2);
      });
    });
  });
});
