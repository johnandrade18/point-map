import { Component, inject } from '@angular/core';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { FormsModule } from '@angular/forms';
import { LucideSearch, LucideX, LucideSlidersHorizontal } from '@lucide/angular';
import { PointStoreService } from '../../core/services/point-store.service';
import { ImportSummaryComponent } from './import-summary/import-summary.component';
import { PoiListComponent } from './point-list/point-list.component';
import { PoiFormComponent } from './point-form/point-form.component';

@Component({
  selector: 'app-point-panel',
  standalone: true,
  imports: [
    FormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    LucideSearch,
    LucideX,
    LucideSlidersHorizontal,
    ImportSummaryComponent,
    PoiListComponent,
    PoiFormComponent,
  ],
  template: `
    <div class="panel">

      <!-- Header -->
      <div class="panel-header">
        <div class="panel-title-row">
          <span class="panel-title">Points of Interest</span>
          <span class="poi-badge">
            {{ store.filteredPoints().length }}<span class="poi-badge-total">&nbsp;/ {{ store.points().length }}</span>
          </span>
        </div>

        <!-- Search -->
        <div class="search-row">
          <div class="search-box">
            <svg lucideSearch [size]="14" class="search-icon"></svg>
            <input
              class="search-input"
              type="text"
              placeholder="Search by name…"
              [ngModel]="store.searchQuery()"
              (ngModelChange)="store.setSearchQuery($event)"
              aria-label="Search Points of Interest by name"
            />
            @if (store.searchQuery()) {
              <button class="search-clear" (click)="store.setSearchQuery('')" aria-label="Clear search">
                <svg lucideX [size]="12"></svg>
              </button>
            }
          </div>
        </div>

        <!-- Category filter -->
        <div class="filter-row">
          <svg lucideSlidersHorizontal [size]="13" class="filter-icon"></svg>
          <select
            class="filter-select"
            [ngModel]="store.categoryFilter()"
            (ngModelChange)="store.setCategoryFilter($event)"
            aria-label="Filter by category"
          >
            <option value="">All categories</option>
            @for (cat of store.categories(); track cat) {
              <option [value]="cat">{{ cat }} ({{ store.categoryCountMap()[cat] || 0 }})</option>
            }
          </select>
        </div>
      </div>

      <!-- Import summary -->
      <app-import-summary />

      <!-- POI list -->
      <div class="list-area">
        <app-point-list />
      </div>

      <!-- Edit form -->
      <app-point-form />

    </div>
  `,
  styles: [`
    :host {
      display: block;
      height: 100%;
      overflow: hidden;
    }

    .panel {
      display: flex;
      flex-direction: column;
      height: 100%;
      background: var(--sidebar-bg);
      border-right: 1px solid var(--sidebar-border);
      box-shadow: 2px 0 8px rgba(0,0,0,0.06);
    }

    /* ── Header ─────────────────────────────────── */
    .panel-header {
      padding: 14px 14px 10px;
      border-bottom: 1px solid var(--sidebar-border);
      background: var(--sidebar-bg);
    }

    .panel-title-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 10px;
    }
    .panel-title {
      font-size: 13px;
      font-weight: 700;
      color: var(--sidebar-text);
      letter-spacing: -0.1px;
      text-transform: uppercase;
    }
    .poi-badge {
      font-size: 12px;
      font-weight: 600;
      color: var(--accent);
      background: #eff6ff;
      border: 1px solid #bfdbfe;
      border-radius: 20px;
      padding: 1px 10px;
    }
    .poi-badge-total {
      color: #93c5fd;
      font-weight: 400;
    }

    /* ── Search ─────────────────────────────────── */
    .search-row { margin-bottom: 8px; }

    .search-box {
      position: relative;
      display: flex;
      align-items: center;
    }
    .search-icon {
      position: absolute;
      left: 10px;
      color: var(--sidebar-muted);
      pointer-events: none;
    }
    .search-input {
      width: 100%;
      height: 34px;
      padding: 0 32px 0 32px;
      background: var(--sidebar-surface);
      border: 1px solid var(--sidebar-border);
      border-radius: var(--radius-sm);
      font-size: 13px;
      font-family: inherit;
      color: var(--sidebar-text);
      outline: none;
      transition: border-color 0.15s, box-shadow 0.15s;
    }
    .search-input::placeholder { color: #94a3b8; }
    .search-input:focus {
      border-color: var(--accent);
      box-shadow: 0 0 0 3px rgba(59,130,246,0.12);
    }
    .search-clear {
      position: absolute;
      right: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
      width: 18px;
      height: 18px;
      background: #cbd5e1;
      border: none;
      border-radius: 50%;
      color: #475569;
      cursor: pointer;
      padding: 0;
      transition: background 0.15s;
    }
    .search-clear:hover { background: #94a3b8; }

    /* ── Filter ─────────────────────────────────── */
    .filter-row {
      display: flex;
      align-items: center;
      gap: 7px;
    }
    .filter-icon { color: var(--sidebar-muted); flex-shrink: 0; }
    .filter-select {
      flex: 1;
      height: 32px;
      padding: 0 8px;
      background: var(--sidebar-surface);
      border: 1px solid var(--sidebar-border);
      border-radius: var(--radius-sm);
      font-size: 13px;
      font-family: inherit;
      color: var(--sidebar-text);
      outline: none;
      cursor: pointer;
      transition: border-color 0.15s;
    }
    .filter-select:focus { border-color: var(--accent); }

    /* ── List area ───────────────────────────────── */
    .list-area {
      flex: 1;
      overflow-y: auto;
      overflow-x: hidden;
    }
    .list-area::-webkit-scrollbar { width: 4px; }
    .list-area::-webkit-scrollbar-thumb {
      background: #cbd5e1;
      border-radius: 2px;
    }
  `],
})
export class PointPanelComponent {
  readonly store = inject(PointStoreService);
}
