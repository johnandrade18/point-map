import {
  validateGeoJsonFeature,
  isValidLongitude,
  isValidLatitude,
  isValidCoordinates,
} from './geojson-feature.validator';

describe('isValidLongitude', () => {
  it('should return true for -180', () => expect(isValidLongitude(-180)).toBe(true));
  it('should return true for 180', () => expect(isValidLongitude(180)).toBe(true));
  it('should return true for 0', () => expect(isValidLongitude(0)).toBe(true));
  it('should return false for -181', () => expect(isValidLongitude(-181)).toBe(false));
  it('should return false for 181', () => expect(isValidLongitude(181)).toBe(false));
});

describe('isValidLatitude', () => {
  it('should return true for -90', () => expect(isValidLatitude(-90)).toBe(true));
  it('should return true for 90', () => expect(isValidLatitude(90)).toBe(true));
  it('should return false for -91', () => expect(isValidLatitude(-91)).toBe(false));
  it('should return false for 91', () => expect(isValidLatitude(91)).toBe(false));
});

describe('isValidCoordinates', () => {
  it('should return true for valid [lon, lat]', () =>
    expect(isValidCoordinates([-70.65, -33.44])).toBe(true));

  it('should return false for a single-element array', () =>
    expect(isValidCoordinates([-70.65])).toBe(false));

  it('should return false when longitude is out of range', () =>
    expect(isValidCoordinates([-200, -33.44])).toBe(false));

  it('should return false when latitude is out of range', () =>
    expect(isValidCoordinates([-70.65, 95])).toBe(false));

  it('should return false for non-array value', () =>
    expect(isValidCoordinates('invalid')).toBe(false));

  it('should return false when a coordinate is NaN', () =>
    expect(isValidCoordinates([NaN, -33.44])).toBe(false));
});

describe('validateGeoJsonFeature', () => {
  const validFeature = {
    type: 'Feature',
    id: 'test-001',
    geometry: { type: 'Point', coordinates: [-70.65, -33.44] },
    properties: { name: 'Test POI', category: 'landmark' },
  };

  describe('given a valid GeoJSON point feature', () => {
    it('should return valid: true', () => {
      const result = validateGeoJsonFeature(validFeature);
      expect(result.valid).toBe(true);
    });

    it('should map the id from the feature', () => {
      const result = validateGeoJsonFeature(validFeature);
      if (result.valid) expect(result.feature.id).toBe('test-001');
    });

    it('should preserve extra properties', () => {
      const withExtra = {
        ...validFeature,
        properties: { ...validFeature.properties, extra: 'value' },
      };
      const result = validateGeoJsonFeature(withExtra);
      if (result.valid) expect(result.feature.properties['extra']).toBe('value');
    });

    it('should generate a uuid when id is missing', () => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { id: _id, ...noId } = validFeature;
      const result = validateGeoJsonFeature(noId);
      if (result.valid) {
        expect(result.feature.id).toMatch(
          /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
        );
      }
    });
  });

  describe('given a non-object value', () => {
    it('should return not-feature-type', () => {
      const result = validateGeoJsonFeature('string');
      expect(result.valid).toBe(false);
      if (!result.valid) expect(result.reason).toBe('not-feature-type');
    });
  });

  describe('given type !== Feature', () => {
    it('should return not-feature-type', () => {
      const result = validateGeoJsonFeature({ ...validFeature, type: 'FeatureCollection' });
      expect(result.valid).toBe(false);
      if (!result.valid) expect(result.reason).toBe('not-feature-type');
    });
  });

  describe('given null geometry', () => {
    it('should return missing-geometry', () => {
      const result = validateGeoJsonFeature({ ...validFeature, geometry: null });
      expect(result.valid).toBe(false);
      if (!result.valid) expect(result.reason).toBe('missing-geometry');
    });
  });

  describe('given a non-Point geometry', () => {
    it('should return not-point-geometry for LineString', () => {
      const result = validateGeoJsonFeature({
        ...validFeature,
        geometry: {
          type: 'LineString',
          coordinates: [
            [-70.65, -33.44],
            [-70.64, -33.43],
          ],
        },
      });
      expect(result.valid).toBe(false);
      if (!result.valid) expect(result.reason).toBe('not-point-geometry');
    });
  });

  describe('given invalid coordinates', () => {
    it('should return invalid-coordinates for out-of-range longitude', () => {
      const result = validateGeoJsonFeature({
        ...validFeature,
        geometry: { type: 'Point', coordinates: [-200, -33.44] },
      });
      expect(result.valid).toBe(false);
      if (!result.valid) expect(result.reason).toBe('invalid-coordinates');
    });

    it('should return invalid-coordinates for a single coordinate', () => {
      const result = validateGeoJsonFeature({
        ...validFeature,
        geometry: { type: 'Point', coordinates: [-70.65] },
      });
      expect(result.valid).toBe(false);
      if (!result.valid) expect(result.reason).toBe('invalid-coordinates');
    });
  });

  describe('given missing or empty properties', () => {
    it('should return missing-properties when properties is null', () => {
      const result = validateGeoJsonFeature({ ...validFeature, properties: null });
      expect(result.valid).toBe(false);
      if (!result.valid) expect(result.reason).toBe('missing-properties');
    });

    it('should return missing-properties when properties is absent', () => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { properties: _p, ...noProps } = validFeature;
      const result = validateGeoJsonFeature(noProps);
      expect(result.valid).toBe(false);
      if (!result.valid) expect(result.reason).toBe('missing-properties');
    });
  });

  describe('given invalid name', () => {
    it('should return invalid-name when name is a number', () => {
      const result = validateGeoJsonFeature({
        ...validFeature,
        properties: { name: 123, category: 'landmark' },
      });
      expect(result.valid).toBe(false);
      if (!result.valid) expect(result.reason).toBe('invalid-name');
    });

    it('should return invalid-name when name is absent', () => {
      const result = validateGeoJsonFeature({
        ...validFeature,
        properties: { category: 'landmark' },
      });
      expect(result.valid).toBe(false);
      if (!result.valid) expect(result.reason).toBe('invalid-name');
    });
  });

  describe('given invalid category', () => {
    it('should return invalid-category when category is a boolean', () => {
      const result = validateGeoJsonFeature({
        ...validFeature,
        properties: { name: 'Test', category: true },
      });
      expect(result.valid).toBe(false);
      if (!result.valid) expect(result.reason).toBe('invalid-category');
    });

    it('should return invalid-category when category is absent', () => {
      const result = validateGeoJsonFeature({
        ...validFeature,
        properties: { name: 'Test' },
      });
      expect(result.valid).toBe(false);
      if (!result.valid) expect(result.reason).toBe('invalid-category');
    });
  });
});
