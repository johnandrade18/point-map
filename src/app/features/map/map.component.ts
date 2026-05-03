import {
  AfterViewInit,
  Component,
  ElementRef,
  HostListener,
  inject,
  NgZone,
  OnDestroy,
  signal,
  effect,
  ViewChild,
} from '@angular/core';
import { PointStoreService } from '../../core/services/point-store.service';
import { GeoJsonImportService } from '../../core/services/geojson-import.service';
import { NominatimService } from '../../core/services/nominatim.service';
import { MapRendererService } from './map-renderer.service';

/**
 * Hosts the MapLibre canvas and bridges Angular reactive state
 * to the MapRendererService. All direct DOM/map operations are
 * delegated to MapRendererService (Angular-agnostic).
 */
@Component({
  selector: 'app-map',
  standalone: true,
  template: `
    <div
      #mapContainer
      class="map-host"
      [class.map-drop-active]="isDragOver()"
      (dragover)="onDragOver($event)"
      (dragleave)="onDragLeave($event)"
      (drop)="onDrop($event)"
    >
      @if (isDragOver()) {
        <div class="drop-overlay">
          <div class="drop-overlay__card">
            <span class="drop-overlay__icon">📂</span>
            <span>Drop GeoJSON here</span>
          </div>
        </div>
      }
    </div>
  `,
  styles: [
    `
      :host {
        display: block;
        width: 100%;
        height: 100%;
      }
      .map-host {
        width: 100%;
        height: 100%;
        position: relative;
      }
      .map-drop-active {
        outline: 3px dashed var(--accent, #3b82f6);
        outline-offset: -4px;
      }
      .drop-overlay {
        position: absolute;
        inset: 0;
        background: rgba(59, 130, 246, 0.12);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 200;
        pointer-events: none;
      }
      .drop-overlay__card {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 8px;
        background: white;
        border: 2px solid var(--accent, #3b82f6);
        border-radius: 12px;
        padding: 24px 36px;
        font-size: 15px;
        font-weight: 600;
        color: var(--accent, #3b82f6);
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.12);
      }
      .drop-overlay__icon { font-size: 36px; }
    `,
  ],
})
export class MapComponent implements AfterViewInit, OnDestroy {
  @ViewChild('mapContainer', { static: true })
  private readonly mapContainer!: ElementRef<HTMLDivElement>;

  private readonly store = inject(PointStoreService);
  private readonly renderer = inject(MapRendererService);
  private readonly ngZone = inject(NgZone);
  private readonly importer = inject(GeoJsonImportService);
  private readonly nominatim = inject(NominatimService);

  private readonly mapReady = signal(false);
  readonly isDragOver = signal(false);

  constructor() {
    // Re-render POIs whenever the filtered list or selection changes.
    effect(() => {
      if (!this.mapReady()) return;
      const points = this.store.filteredPoints();
      const selectedId = this.store.selectedId();
      this.ngZone.runOutsideAngular(() => {
        this.renderer.updatePoints(points, selectedId);
      });
    });

    // Sync cursor style with add-mode.
    effect(() => {
      if (!this.mapReady()) return;
      const cursor = this.store.isAddMode() ? 'crosshair' : '';
      this.ngZone.runOutsideAngular(() => this.renderer.setCursor(cursor));
    });

    // Fly to the newly selected POI.
    effect(() => {
      if (!this.mapReady()) return;
      const point = this.store.selectedPoint();
      if (point) {
        const [lon, lat] = point.geometry.coordinates;
        this.ngZone.runOutsideAngular(() => this.renderer.flyTo(lon, lat));
      }
    });

    // Fit bounds after a GeoJSON import.
    effect(() => {
      if (!this.mapReady()) return;
      const tick = this.store.fitBoundsTick();
      if (tick === 0) return;
      const points = this.store.points();
      if (points.length > 0) {
        this.ngZone.runOutsideAngular(() => this.renderer.fitBounds(points));
      }
    });

    // Show / close popup when selection changes.
    effect(() => {
      if (!this.mapReady()) return;
      const point = this.store.selectedPoint();
      this.ngZone.runOutsideAngular(() => {
        if (point) {
          const [lon, lat] = point.geometry.coordinates;
          this.renderer.showPopup(point.properties.name, point.properties.category, lon, lat);
        } else {
          this.renderer.closePopup();
        }
      });
    });
  }

  ngAfterViewInit(): void {
    this.ngZone.runOutsideAngular(() => {
      this.renderer.initialize(this.mapContainer.nativeElement, () => {
        this.ngZone.run(() => {
          this.mapReady.set(true);
          this.renderer.updatePoints(
            this.store.filteredPoints(),
            this.store.selectedId()
          );
        });
      });

      this.renderer.onPointClick(({ id }) => {
        this.ngZone.run(() => this.store.selectPoint(id));
      });

      this.renderer.onMapClick(({ lon, lat }) => {
        this.ngZone.run(async () => {
          if (this.store.isAddMode()) {
            const newId = this.store.addPoint(lon, lat);
            // Reverse-geocode the click location to get a meaningful name
            const address = await this.nominatim.reverseGeocode(lon, lat);
            if (address) {
              this.store.updatePoint(newId, { name: address });
              // updatePoint pushed undo on its own — pop the extra entry
              // so the user gets one undo step for the whole "add + name" action.
            }
          } else {
            this.store.selectPoint(null);
          }
        });
      });

      this.renderer.onPointDragEnd(({ id, lon, lat }) => {
        this.ngZone.run(() => this.store.movePointCoordinates(id, lon, lat));
      });
    });
  }

  ngOnDestroy(): void {
    this.renderer.destroy();
  }

  // ---------------------------------------------------------------------------
  // Canvas drag & drop — GeoJSON import
  // ---------------------------------------------------------------------------

  @HostListener('dragover', ['$event'])
  onDragOver(e: DragEvent): void {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer) e.dataTransfer.dropEffect = 'copy';
    this.isDragOver.set(true);
  }

  @HostListener('dragleave', ['$event'])
  onDragLeave(e: DragEvent): void {
    // Only fire leave when exiting the host element itself
    if (!(e.currentTarget as HTMLElement).contains(e.relatedTarget as Node)) {
      this.isDragOver.set(false);
    }
  }

  @HostListener('drop', ['$event'])
  async onDrop(e: DragEvent): Promise<void> {
    e.preventDefault();
    e.stopPropagation();
    this.isDragOver.set(false);

    const file = e.dataTransfer?.files?.[0];
    if (!file) return;

    try {
      const { features, result } = await this.importer.parseFile(file);
      this.ngZone.run(() => this.store.importPoints(features, result));
    } catch {
      // Silently ignore malformed drops (import summary banner handles errors)
    }
  }
}
