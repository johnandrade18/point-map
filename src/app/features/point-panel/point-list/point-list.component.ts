import { Component, inject } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import {
  LucideDynamicIcon,
  LucideMapPin,
  LucideMapPinOff,
  LucideLandmark,
  LucideTrees,
  LucideShoppingBag,
  LucideTrophy,
  LucideTrainFront,
  LucideBus,
  LucidePlane,
  LucideEye,
  LucideUtensilsCrossed,
  LucideHotel,
  LucidePlus,
  LucideSchool,
} from '@lucide/angular';
import { PointStoreService } from '../../../core/services/point-store.service';
import { PointFeature } from '../../../core/models/point.model';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const CATEGORY_ICONS: Record<string, any> = {
  landmark:     LucideLandmark,
  park:         LucideTrees,
  mall:         LucideShoppingBag,
  stadium:      LucideTrophy,
  station:      LucideTrainFront,
  bus_terminal: LucideBus,
  airport:      LucidePlane,
  viewpoint:    LucideEye,
  square:       LucideLandmark,
  restaurant:   LucideUtensilsCrossed,
  hotel:        LucideHotel,
  museum:       LucideLandmark,
  hospital:     LucidePlus,
  school:       LucideSchool,
  other:        LucideMapPin,
};

const CATEGORY_COLORS: Record<string, string> = {
  landmark: '#6366f1', park: '#22c55e', mall: '#a855f7',
  stadium: '#f97316', station: '#3b82f6', bus_terminal: '#14b8a6',
  airport: '#0ea5e9', viewpoint: '#eab308', square: '#f97316',
  restaurant: '#ef4444', hotel: '#8b5cf6', museum: '#6366f1',
  hospital: '#ef4444', school: '#f59e0b', other: '#94a3b8',
};

@Component({
  selector: 'app-point-list',
  standalone: true,
  imports: [DecimalPipe, LucideDynamicIcon, LucideMapPinOff],
  template: `
    @if (store.filteredPoints().length === 0) {
      <div class="empty-state">
        <svg lucideMapPinOff [size]="36" class="empty-icon"></svg>
        <p class="empty-title">No points of interest</p>
        <p class="empty-hint">Import a GeoJSON file or use "Add Point" to begin.</p>
      </div>
    } @else {
      <ul class="poi-list" role="listbox" aria-label="Points of interest">
        @for (poi of store.filteredPoints(); track poi.id) {
          <li
            class="poi-item"
            role="option"
            [class.poi-item--selected]="poi.id === store.selectedId()"
            [attr.aria-selected]="poi.id === store.selectedId()"
            tabindex="0"
            (click)="select(poi)"
            (keydown.enter)="select(poi)"
            (keydown.space)="select(poi)"
          >
            <!-- Category icon pill -->
            <span class="cat-pill" [style.background]="catBg(poi)" [style.color]="catColor(poi)">
              <svg [lucideIcon]="catIcon(poi)" [size]="13"></svg>
            </span>

            <!-- Text -->
            <span class="poi-text">
              <span class="poi-name">{{ poi.properties.name }}</span>
              <span class="poi-meta">
                <span class="poi-cat">{{ poi.properties.category }}</span>
                <span class="poi-coords">
                  {{ poi.geometry.coordinates[1] | number:'1.3-3' }},
                  {{ poi.geometry.coordinates[0] | number:'1.3-3' }}
                </span>
              </span>
            </span>

            <!-- Selected indicator -->
            @if (poi.id === store.selectedId()) {
              <span class="selected-dot"></span>
            }
          </li>
        }
      </ul>
    }
  `,
  styles: [`
    .empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 48px 20px 32px;
      color: #94a3b8;
      text-align: center;
      gap: 4px;
    }
    .empty-icon { margin-bottom: 8px; opacity: 0.5; }
    .empty-title {
      margin: 0;
      font-size: 14px;
      font-weight: 600;
      color: #64748b;
    }
    .empty-hint {
      margin: 0;
      font-size: 12px;
      color: #94a3b8;
      line-height: 1.5;
    }

    /* ── List ────────────────────────────────────── */
    .poi-list {
      list-style: none;
      margin: 0;
      padding: 6px 8px;
    }

    .poi-item {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 9px 10px 9px 10px;
      border-radius: var(--radius-md);
      cursor: pointer;
      transition: background 0.12s;
      position: relative;
      border: 1px solid transparent;
    }
    .poi-item:hover { background: var(--sidebar-hover); }
    .poi-item--selected {
      background: var(--sidebar-selected);
      border-color: #bfdbfe;
    }
    .poi-item--selected::before {
      content: '';
      position: absolute;
      left: 0;
      top: 6px;
      bottom: 6px;
      width: 3px;
      background: var(--accent);
      border-radius: 0 2px 2px 0;
    }

    /* Category pill */
    .cat-pill {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 30px;
      height: 30px;
      border-radius: var(--radius-sm);
      flex-shrink: 0;
    }

    /* Text column */
    .poi-text {
      flex: 1;
      min-width: 0;
      display: flex;
      flex-direction: column;
      gap: 2px;
    }
    .poi-name {
      font-size: 13px;
      font-weight: 600;
      color: var(--sidebar-text);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .poi-meta {
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .poi-cat {
      font-size: 11px;
      font-weight: 500;
      color: var(--sidebar-muted);
      text-transform: capitalize;
    }
    .poi-coords {
      font-size: 10.5px;
      color: #94a3b8;
      font-variant-numeric: tabular-nums;
    }

    /* Selection dot */
    .selected-dot {
      width: 7px;
      height: 7px;
      border-radius: 50%;
      background: var(--accent);
      flex-shrink: 0;
    }
  `],
})
export class PoiListComponent {
  readonly store = inject(PointStoreService);

  select(poi: PointFeature): void {
    this.store.selectPoint(poi.id);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  catIcon(poi: PointFeature): any {
    return CATEGORY_ICONS[poi.properties.category] ?? LucideMapPin;
  }

  catColor(poi: PointFeature): string {
    return CATEGORY_COLORS[poi.properties.category] ?? '#94a3b8';
  }

  catBg(poi: PointFeature): string {
    const hex = this.catColor(poi);
    return hex + '1a'; // ~10% opacity
  }
}
