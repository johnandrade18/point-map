import { Injectable } from '@angular/core';
import maplibregl, { GeoJSONSource, StyleSpecification } from 'maplibre-gl';
import { PointFeature } from '../../core/models/point.model';

export const SOURCE_ID = 'points-source';
export const LAYER_ID = 'points-layer';
export const LAYER_SELECTED_ID = 'points-selected-layer';
export const LAYER_LABEL_ID = 'points-label-layer';
export const LAYER_CLUSTER_ID = 'points-cluster-layer';
export const LAYER_CLUSTER_COUNT_ID = 'points-cluster-count-layer';

/** Category → circle fill color mapping */
const CATEGORY_COLORS: Record<string, string> = {
  landmark: '#e74c3c',
  park: '#27ae60',
  mall: '#9b59b6',
  stadium: '#e67e22',
  station: '#3498db',
  bus_terminal: '#1abc9c',
  airport: '#2980b9',
  viewpoint: '#f39c12',
  square: '#d35400',
  restaurant: '#c0392b',
  hotel: '#8e44ad',
  museum: '#16a085',
  hospital: '#e74c3c',
  school: '#f39c12',
  other: '#7f8c8d',
};

export interface MapPointClickEvent {
  id: string;
}

export interface MapPointsClickEvent {
  lon: number;
  lat: number;
}

export interface MapPointDragEndEvent {
  id: string;
  lon: number;
  lat: number;
}

/**
 * Wraps all MapLibre GL interactions so Angular components stay decoupled
 * from the mapping library. Only this service touches the maplibregl API.
 */
@Injectable({ providedIn: 'root' })
export class MapRendererService {
  private map: maplibregl.Map | null = null;
  private popup: maplibregl.Popup | null = null;
  private onPointClickCb: ((e: MapPointClickEvent) => void) | null = null;
  private onMapClickCb: ((e: MapPointsClickEvent) => void) | null = null;
  private onReadyCb: (() => void) | null = null;
  private onPointDragEndCb: ((e: MapPointDragEndEvent) => void) | null = null;

  /** Local cache of the last rendered features (needed for live drag updates). */
  private _currentFeatures: PointFeature[] = [];
  private _currentSelectedId: string | null = null;

  // ---------------------------------------------------------------------------
  // Lifecycle
  // ---------------------------------------------------------------------------

  initialize(container: HTMLElement, onReady: () => void): void {
    this.onReadyCb = onReady;

    this.map = new maplibregl.Map({
      container,
      style: this.buildOsmStyle(),
      center: [-70.6506, -33.4378], // Santiago, Chile
      zoom: 12,
    });

    this.map.on('load', () => {
      this.initSource();
      this.initLayers();
      this.initClickHandlers();
      this.initCursorHandlers();
      this.initDragHandlers();
      this.onReadyCb?.();
    });
  }

  destroy(): void {
    this.closePopup();
    this.map?.remove();
    this.map = null;
  }

  // ---------------------------------------------------------------------------
  // Data updates
  // ---------------------------------------------------------------------------

  /**
   * Re-renders the point circle layer with the current feature list.
   * Must be called after the map is ready (onReady callback fired).
   */
  updatePoints(features: PointFeature[], selectedId: string | null): void {
    this._currentFeatures = features;
    this._currentSelectedId = selectedId;

    const source = this.map?.getSource(SOURCE_ID) as GeoJSONSource | undefined;
    if (!source) return;

    source.setData(this.buildGeoJsonData(features));

    if (this.map?.getLayer(LAYER_SELECTED_ID)) {
      this.map.setFilter(
        LAYER_SELECTED_ID,
        selectedId ? ['==', ['get', 'id'], selectedId] : ['boolean', false]
      );
    }
  }

  /**
   * Smoothly pans / zooms to the given coordinates.
   */
  flyTo(lon: number, lat: number, zoom = 15): void {
    this.map?.flyTo({ center: [lon, lat], zoom, duration: 600 });
  }

  /**
   * Fits the map viewport to encompass all given POIs.
   */
  fitBounds(features: PointFeature[]): void {
    if (!this.map || features.length === 0) return;

    const lons = features.map(f => f.geometry.coordinates[0]);
    const lats = features.map(f => f.geometry.coordinates[1]);
    const sw: [number, number] = [Math.min(...lons), Math.min(...lats)];
    const ne: [number, number] = [Math.max(...lons), Math.max(...lats)];
    const padding = features.length === 1 ? 120 : 60;

    this.map.fitBounds([sw, ne], { padding, duration: 800, maxZoom: 16 });
  }

  /**
   * Shows a popup for the point identified by properties from a map feature.
   */
  showPopup(name: string, category: string, lon: number, lat: number): void {
    this.closePopup();
    if (!this.map) return;

    this.popup = new maplibregl.Popup({
      closeButton: false,
      closeOnClick: false,
      className: 'point-popup',
      offset: 14,
    })
      .setLngLat([lon, lat])
      .setHTML(
        `<div class="point-popup__name">${this.escapeHtml(name)}</div>` +
        `<div class="point-popup__cat">${this.escapeHtml(category)}</div>` +
        `<div class="point-popup__coords">${lat.toFixed(5)}, ${lon.toFixed(5)}</div>`,
      )
      .addTo(this.map);
  }

  closePopup(): void {
    this.popup?.remove();
    this.popup = null;
  }

  /**
   * Changes the canvas cursor (e.g. 'crosshair' in add-mode).
   */
  setCursor(cursor: string): void {
    if (this.map) {
      this.map.getCanvas().style.cursor = cursor;
    }
  }

  // ---------------------------------------------------------------------------
  // Event registration
  // ---------------------------------------------------------------------------

  onPointClick(cb: (e: MapPointClickEvent) => void): void {
    this.onPointClickCb = cb;
  }

  onMapClick(cb: (e: MapPointsClickEvent) => void): void {
    this.onMapClickCb = cb;
  }

  onPointDragEnd(cb: (e: MapPointDragEndEvent) => void): void {
    this.onPointDragEndCb = cb;
  }

  // ---------------------------------------------------------------------------
  // Private map setup helpers
  // ---------------------------------------------------------------------------

  private initSource(): void {
    this.map!.addSource(SOURCE_ID, {
      type: 'geojson',
      data: { type: 'FeatureCollection', features: [] },
      cluster: true,
      clusterMaxZoom: 14,
      clusterRadius: 50,
    });
  }

  private initLayers(): void {
    // ---- Cluster circle layer -----------------------------------------------
    this.map!.addLayer({
      id: LAYER_CLUSTER_ID,
      type: 'circle',
      source: SOURCE_ID,
      filter: ['has', 'point_count'],
      paint: {
        'circle-color': [
          'step', ['get', 'point_count'],
          '#93c5fd', 10, '#3b82f6', 30, '#1d4ed8',
        ],
        'circle-radius': [
          'step', ['get', 'point_count'],
          18, 10, 24, 30, 30,
        ],
        'circle-stroke-width': 2,
        'circle-stroke-color': '#ffffff',
      },
    });

    // ---- Cluster count label ------------------------------------------------
    this.map!.addLayer({
      id: LAYER_CLUSTER_COUNT_ID,
      type: 'symbol',
      source: SOURCE_ID,
      filter: ['has', 'point_count'],
      layout: {
        'text-field': '{point_count_abbreviated}',
        'text-font': ['Open Sans Regular'],
        'text-size': 13,
      },
      paint: { 'text-color': '#ffffff' },
    });

    // ---- Base circle layer (non-clustered) ----------------------------------
    this.map!.addLayer({
      id: LAYER_ID,
      type: 'circle',
      source: SOURCE_ID,
      filter: ['!', ['has', 'point_count']],
      paint: {
        'circle-radius': 9,
        'circle-color': this.buildCategoryColorExpression(),
        'circle-stroke-width': 2,
        'circle-stroke-color': '#ffffff',
        'circle-opacity': 0.9,
      },
    });

    // ---- Selected POI outline -----------------------------------------------
    this.map!.addLayer({
      id: LAYER_SELECTED_ID,
      type: 'circle',
      source: SOURCE_ID,
      filter: ['boolean', false],
      paint: {
        'circle-radius': 14,
        'circle-color': 'rgba(0,0,0,0)',
        'circle-stroke-width': 3,
        'circle-stroke-color': '#f1c40f',
      },
    });

    // ---- Label layer --------------------------------------------------------
    this.map!.addLayer({
      id: LAYER_LABEL_ID,
      type: 'symbol',
      source: SOURCE_ID,
      filter: ['!', ['has', 'point_count']],
      layout: {
        'text-field': ['get', 'name'],
        'text-font': ['Open Sans Regular'],
        'text-offset': [0, 1.4],
        'text-anchor': 'top',
        'text-size': 11,
      },
      paint: {
        'text-color': '#2c3e50',
        'text-halo-color': '#ffffff',
        'text-halo-width': 1.5,
      },
    });
  }

  private initClickHandlers(): void {
    // Click on a cluster → zoom in to expand it
    this.map!.on('click', LAYER_CLUSTER_ID, async e => {
      const features = this.map!.queryRenderedFeatures(e.point, {
        layers: [LAYER_CLUSTER_ID],
      });
      if (!features.length) return;
      const clusterId = features[0].properties?.['cluster_id'] as number;
      const source = this.map!.getSource(SOURCE_ID) as GeoJSONSource;
      const zoom = await source.getClusterExpansionZoom(clusterId);
      const coords = (features[0].geometry as GeoJSON.Point).coordinates as [number, number];
      this.map!.flyTo({ center: coords, zoom: zoom + 1, duration: 500 });
      e.originalEvent.stopPropagation();
    });

    // Click on an individual POI circle → select it and show popup
    this.map!.on('click', LAYER_ID, e => {
      const feature = e.features?.[0];
      if (!feature) return;
      const id = String(feature.properties?.['id'] ?? feature.id ?? '');
      if (id) {
        this.onPointClickCb?.({ id });
        const { name, category } = feature.properties as { name: string; category: string };
        const coords = (feature.geometry as GeoJSON.Point).coordinates as [number, number];
        this.showPopup(name, category, coords[0], coords[1]);
      }
      e.originalEvent.stopPropagation();
    });

    // Click on the map background → add-point or deselect
    this.map!.on('click', e => {
      const hits = this.map!.queryRenderedFeatures(e.point, {
        layers: [LAYER_ID, LAYER_CLUSTER_ID],
      });
      if (hits.length === 0) {
        this.closePopup();
        this.onMapClickCb?.({ lon: e.lngLat.lng, lat: e.lngLat.lat });
      }
    });
  }

  private initCursorHandlers(): void {
    const setCursor = (cursor: string) => () => {
      this.map!.getCanvas().style.cursor = cursor;
    };
    this.map!.on('mouseenter', LAYER_ID, setCursor('pointer'));
    this.map!.on('mouseleave', LAYER_ID, setCursor(''));
    this.map!.on('mouseenter', LAYER_CLUSTER_ID, setCursor('pointer'));
    this.map!.on('mouseleave', LAYER_CLUSTER_ID, setCursor(''));
  }

  private initDragHandlers(): void {
    this.map!.on('mousedown', LAYER_ID, e => {
      const feature = e.features?.[0];
      if (!feature) return;

      const id = String(feature.properties?.['id'] ?? feature.id ?? '');
      if (!id) return;

      // Prevent map panning while dragging a marker
      e.preventDefault();
      this.map!.dragPan.disable();
      this.map!.getCanvas().style.cursor = 'grabbing';
      this.closePopup();

      const onMove = (moveEvent: maplibregl.MapMouseEvent) => {
        // Live visual update: re-render source with the dragged point at new position
        const updated = this._currentFeatures.map(f =>
          f.id === id
            ? {
                ...f,
                geometry: {
                  type: 'Point' as const,
                  coordinates: [moveEvent.lngLat.lng, moveEvent.lngLat.lat] as [number, number],
                },
              }
            : f
        );
        const source = this.map?.getSource(SOURCE_ID) as GeoJSONSource | undefined;
        source?.setData(this.buildGeoJsonData(updated));
      };

      const onUp = (upEvent: maplibregl.MapMouseEvent) => {
        this.map!.off('mousemove', onMove);
        this.map!.dragPan.enable();
        this.map!.getCanvas().style.cursor = 'pointer';
        this.onPointDragEndCb?.({
          id,
          lon: upEvent.lngLat.lng,
          lat: upEvent.lngLat.lat,
        });
      };

      this.map!.on('mousemove', onMove);
      this.map!.once('mouseup', onUp);
    });
  }

  // ---------------------------------------------------------------------------
  // Style helpers
  // ---------------------------------------------------------------------------

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private buildCategoryColorExpression(): any {
    const matchArgs: unknown[] = [['get', 'category']];
    Object.entries(CATEGORY_COLORS).forEach(([cat, color]) => {
      matchArgs.push(cat, color);
    });
    matchArgs.push('#7f8c8d');
    return ['match', ...matchArgs];
  }

  private buildOsmStyle(): StyleSpecification {
    return {
      version: 8,
      sources: {
        osm: {
          type: 'raster',
          tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
          tileSize: 256,
          attribution:
            '© <a href="https://www.openstreetmap.org/copyright" target="_blank">OpenStreetMap</a> contributors',
          maxzoom: 19,
        },
      },
      layers: [
        {
          id: 'osm-tiles',
          type: 'raster',
          source: 'osm',
          minzoom: 0,
          maxzoom: 22,
        },
      ],
    };
  }

  private buildGeoJsonData(features: PointFeature[]): GeoJSON.FeatureCollection {
    return {
      type: 'FeatureCollection',
      features: features.map(f => ({
        ...f,
        properties: { ...f.properties, id: f.id },
      })),
    };
  }

  private escapeHtml(s: string): string {
    return s
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }
}
