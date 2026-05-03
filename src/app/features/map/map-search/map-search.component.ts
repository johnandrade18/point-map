import {
  Component,
  ElementRef,
  HostListener,
  inject,
  NgZone,
  signal,
  ViewChild,
} from '@angular/core';
import { LucideSearch, LucideX, LucideNavigation } from '@lucide/angular';
import { NominatimService, NominatimSearchResult } from '../../../core/services/nominatim.service';
import { MapRendererService } from '../map-renderer.service';

/**
 * Floating search bar overlaid on the map canvas.
 * Sends queries to Nominatim and flies the map to the selected result.
 */
@Component({
  selector: 'app-map-search',
  standalone: true,
  imports: [LucideSearch, LucideX, LucideNavigation],
  template: `
    <div class="search-wrap" role="search">
      <!-- Input row -->
      <div class="input-row">
        <svg lucideSearch [size]="15" class="input-icon"></svg>
        <input
          #searchInput
          class="search-input"
          type="text"
          placeholder="Search address or place…"
          [value]="query()"
          (input)="onInput($event)"
          (keydown.enter)="runSearch()"
          (keydown.escape)="clear()"
          aria-label="Search address or place"
          autocomplete="off"
        />
        @if (query()) {
          <button class="clear-btn" (click)="clear()" aria-label="Clear search">
            <svg lucideX [size]="12"></svg>
          </button>
        }
        <button
          class="go-btn"
          (click)="runSearch()"
          [disabled]="!query() || loading()"
          aria-label="Search"
        >
          <svg lucideNavigation [size]="14"></svg>
        </button>
      </div>

      <!-- Results dropdown -->
      @if (results().length > 0) {
        <ul class="results" role="listbox" aria-label="Search results">
          @for (r of results(); track r.display_name) {
            <li
              class="result-item"
              role="option"
              [attr.aria-selected]="false"
              (click)="selectResult(r)"
              (keydown.enter)="selectResult(r)"
              tabindex="0"
            >
              <svg lucideNavigation [size]="12" class="result-icon"></svg>
              <span class="result-name">{{ r.display_name }}</span>
            </li>
          }
        </ul>
      }

      @if (noResults()) {
        <div class="no-results">No results found.</div>
      }
    </div>
  `,
  styles: [`
    :host {
      position: absolute;
      top: 12px;
      left: 50%;
      transform: translateX(-50%);
      z-index: 100;
      width: 360px;
      max-width: calc(100vw - 380px);
    }

    .search-wrap {
      background: var(--sidebar-bg, #fff);
      border: 1px solid var(--sidebar-border, #e2e8f0);
      border-radius: var(--radius-md, 8px);
      box-shadow: 0 4px 16px rgba(0,0,0,0.14);
      overflow: hidden;
    }

    /* Input row */
    .input-row {
      display: flex;
      align-items: center;
      gap: 0;
      height: 40px;
      padding: 0 10px 0 10px;
    }
    .input-icon { color: var(--sidebar-muted, #64748b); flex-shrink: 0; margin-right: 8px; }

    .search-input {
      flex: 1;
      height: 100%;
      background: transparent;
      border: none;
      font-size: 13px;
      font-family: inherit;
      color: var(--sidebar-text, #0f172a);
      outline: none;
    }
    .search-input::placeholder { color: #94a3b8; }

    .clear-btn {
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
      flex-shrink: 0;
      margin-right: 6px;
      transition: background 0.15s;
    }
    .clear-btn:hover { background: #94a3b8; }

    .go-btn {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 28px;
      height: 28px;
      background: var(--accent, #3b82f6);
      border: none;
      border-radius: var(--radius-sm, 6px);
      color: #fff;
      cursor: pointer;
      padding: 0;
      flex-shrink: 0;
      transition: background 0.15s, opacity 0.15s;
    }
    .go-btn:hover:not([disabled]) { background: var(--accent-hover, #2563eb); }
    .go-btn:disabled { opacity: 0.4; cursor: not-allowed; }

    /* Results */
    .results {
      list-style: none;
      margin: 0;
      padding: 4px 0;
      border-top: 1px solid var(--sidebar-border, #e2e8f0);
      max-height: 220px;
      overflow-y: auto;
    }
    .result-item {
      display: flex;
      align-items: flex-start;
      gap: 8px;
      padding: 8px 12px;
      cursor: pointer;
      transition: background 0.12s;
    }
    .result-item:hover, .result-item:focus { background: var(--sidebar-hover, #f1f5f9); outline: none; }
    .result-icon { color: var(--accent, #3b82f6); flex-shrink: 0; margin-top: 2px; }
    .result-name {
      font-size: 12px;
      color: var(--sidebar-text, #0f172a);
      line-height: 1.4;
    }

    .no-results {
      padding: 10px 14px;
      font-size: 12px;
      color: var(--sidebar-muted, #64748b);
      border-top: 1px solid var(--sidebar-border, #e2e8f0);
    }
  `],
})
export class MapSearchComponent {
  @ViewChild('searchInput') private inputRef!: ElementRef<HTMLInputElement>;

  private readonly nominatim = inject(NominatimService);
  private readonly renderer = inject(MapRendererService);
  private readonly ngZone = inject(NgZone);

  readonly query = signal('');
  readonly results = signal<NominatimSearchResult[]>([]);
  readonly loading = signal(false);
  readonly noResults = signal(false);

  onInput(e: Event): void {
    this.query.set((e.target as HTMLInputElement).value);
    this.results.set([]);
    this.noResults.set(false);
  }

  async runSearch(): Promise<void> {
    const q = this.query().trim();
    if (!q) return;
    this.loading.set(true);
    this.results.set([]);
    this.noResults.set(false);

    const found = await this.nominatim.search(q);

    this.ngZone.run(() => {
      this.loading.set(false);
      this.results.set(found);
      this.noResults.set(found.length === 0);
    });
  }

  selectResult(r: NominatimSearchResult): void {
    const lon = parseFloat(r.lon);
    const lat = parseFloat(r.lat);
    if (isNaN(lon) || isNaN(lat)) return;
    this.ngZone.runOutsideAngular(() => this.renderer.flyTo(lon, lat, 14));
    this.clear();
  }

  clear(): void {
    this.query.set('');
    this.results.set([]);
    this.noResults.set(false);
    this.inputRef?.nativeElement.blur();
  }

  /** Close dropdown when clicking outside this component. */
  @HostListener('document:click', ['$event'])
  onDocumentClick(e: MouseEvent): void {
    if (!(e.target as HTMLElement).closest('app-map-search')) {
      this.results.set([]);
      this.noResults.set(false);
    }
  }
}
