/**
 * Represents WGS84 coordinates as [longitude, latitude].
 */
export type Coordinates = [number, number];

/**
 * Properties required for a Point of Interest feature.
 * Additional (extra) properties are allowed and preserved.
 */
export interface PointProperties {
  name: string;
  category: string;
  [key: string]: unknown;
}

/**
 * A GeoJSON Feature representing a single Point of Interest.
 */
export interface PointFeature {
  type: 'Feature';
  id: string;
  geometry: {
    type: 'Point';
    coordinates: Coordinates;
  };
  properties: PointProperties;
}

/**
 * A GeoJSON FeatureCollection holding POI features.
 */
export interface PointFeatureCollection {
  type: 'FeatureCollection';
  features: PointFeature[];
}
