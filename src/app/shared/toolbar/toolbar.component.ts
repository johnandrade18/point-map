import {
  Component,
  ElementRef,
  HostListener,
  inject,
  ViewChild,
} from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSnackBar } from '@angular/material/snack-bar';
import {
  LucideMap,
  LucideMapPinPlus,
  LucideX,
  LucideUpload,
  LucideDownload,
  LucideSave,
  LucideTrash,
  LucideUndo2,
  LucideRedo2,
  LucideMoon,
  LucideSun,
  LucideFileSpreadsheet,
} from '@lucide/angular';
import { PointStoreService } from '../../core/services/point-store.service';
import { GeoJsonImportService } from '../../core/services/geojson-import.service';
import { GeoJsonExportService } from '../../core/services/geojson-export.service';
import { ThemeService } from '../../core/services/theme.service';

@Component({
  selector: 'app-toolbar',
  standalone: true,
  imports: [
    MatButtonModule,
    MatTooltipModule,
    LucideMap,
    LucideMapPinPlus,
    LucideX,
    LucideUpload,
    LucideDownload,
    LucideSave,
    LucideTrash,
    LucideUndo2,
    LucideRedo2,
    LucideMoon,
    LucideSun,
    LucideFileSpreadsheet,
  ],
  template: `
    <input
      #fileInput
      type="file"
      accept=".geojson,application/geo+json,application/json"
      style="display:none"
      (change)="onFileSelected($event, 'append')"
      aria-hidden="true"
    />

    <header class="toolbar">

      <!-- Brand -->
      <div class="brand">
        <svg lucideMap [size]="20" class="brand-icon"></svg>
        <span class="brand-name">Point Editor</span>
        <span class="brand-version">GeoJSON</span>
      </div>

      <div class="spacer"></div>

      <!-- Add Point -->
      <button
        class="tb-btn"
        [class.tb-btn--active]="store.isAddMode()"
        (click)="store.toggleAddMode()"
        [matTooltip]="store.isAddMode() ? 'Press again to cancel' : 'Click on the map to place a point'"
        aria-label="Toggle add-point mode"
      >
        @if (store.isAddMode()) {
          <svg lucideX [size]="15"></svg>
          <span>Cancel</span>
        } @else {
          <svg lucideMapPinPlus [size]="15"></svg>
          <span>Add Point</span>
        }
      </button>

      <div class="tb-divider"></div>

      <!-- Undo -->
      <button
        class="tb-btn tb-btn--icon"
        (click)="store.undo()"
        [disabled]="!store.canUndo()"
        matTooltip="Undo (Ctrl+Z)"
        aria-label="Undo"
      >
        <svg lucideUndo2 [size]="15"></svg>
      </button>

      <!-- Redo -->
      <button
        class="tb-btn tb-btn--icon"
        (click)="store.redo()"
        [disabled]="!store.canRedo()"
        matTooltip="Redo (Ctrl+Y)"
        aria-label="Redo"
      >
        <svg lucideRedo2 [size]="15"></svg>
      </button>

      <div class="tb-divider"></div>

      <!-- Import (append, skip duplicates) -->
      <button
        class="tb-btn"
        (click)="fileInput.click()"
        matTooltip="Import a GeoJSON FeatureCollection — merges with existing data, skips duplicates"
        aria-label="Import GeoJSON"
      >
        <svg lucideUpload [size]="15"></svg>
        <span>Import</span>
      </button>

      <!-- Export GeoJSON -->
      <button
        class="tb-btn"
        (click)="onExport()"
        matTooltip="Download current Points of Interest as GeoJSON"
        aria-label="Export GeoJSON"
        [disabled]="store.points().length === 0"
      >
        <svg lucideDownload [size]="15"></svg>
        <span>Export</span>
      </button>

      <!-- Export CSV -->
      <button
        class="tb-btn"
        (click)="onExportCsv()"
        matTooltip="Download Points of Interest as CSV (name, category, lat, lng)"
        aria-label="Export CSV"
        [disabled]="store.points().length === 0"
      >
        <svg lucideFileSpreadsheet [size]="15"></svg>
        <span>CSV</span>
      </button>

      <div class="tb-divider"></div>

      <!-- Save -->
      <button
        class="tb-btn"
        (click)="onSave()"
        matTooltip="Save to browser localStorage"
        aria-label="Save"
      >
        <svg lucideSave [size]="15"></svg>
        <span>Save</span>
      </button>

      <!-- Clear -->
      <button
        class="tb-btn tb-btn--danger"
        (click)="onClear()"
        matTooltip="Remove all Points of Interest and clear storage"
        aria-label="Clear all data"
        [disabled]="store.points().length === 0"
      >
        <svg lucideTrash [size]="15"></svg>
        <span>Clear</span>
      </button>

      <div class="tb-divider"></div>

      <!-- Dark mode toggle -->
      <button
        class="tb-btn tb-btn--icon"
        (click)="theme.toggle()"
        [matTooltip]="theme.isDark() ? 'Switch to light mode' : 'Switch to dark mode'"
        aria-label="Toggle dark mode"
      >
        @if (theme.isDark()) {
          <svg lucideSun [size]="15"></svg>
        } @else {
          <svg lucideMoon [size]="15"></svg>
        }
      </button>

    </header>
  `,
  styles: [`
    :host { display: block; }

    .toolbar {
      display: flex;
      align-items: center;
      gap: 2px;
      height: 52px;
      padding: 0 16px;
      background: var(--toolbar-bg);
      border-bottom: 1px solid #1e293b;
      box-shadow: 0 1px 0 rgba(255,255,255,0.04), 0 4px 12px rgba(0,0,0,0.3);
      position: relative;
      z-index: 10;
    }

    .brand {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-right: 8px;
    }
    .brand-icon { color: #3b82f6; }
    .brand-name {
      font-size: 15px;
      font-weight: 700;
      color: var(--toolbar-text);
      letter-spacing: -0.3px;
    }
    .brand-version {
      font-size: 10px;
      font-weight: 500;
      color: var(--toolbar-muted);
      background: rgba(255,255,255,0.08);
      border: 1px solid rgba(255,255,255,0.1);
      border-radius: 4px;
      padding: 1px 6px;
      letter-spacing: 0.5px;
      text-transform: uppercase;
    }

    .spacer { flex: 1; }

    .tb-btn {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 0 12px;
      height: 32px;
      background: transparent;
      border: 1px solid rgba(255,255,255,0.12);
      border-radius: var(--radius-sm);
      color: var(--toolbar-text);
      font-size: 13px;
      font-weight: 500;
      font-family: inherit;
      cursor: pointer;
      transition: background 0.15s, border-color 0.15s, color 0.15s;
      white-space: nowrap;
      letter-spacing: 0.1px;
    }
    .tb-btn--icon {
      padding: 0;
      width: 32px;
      justify-content: center;
    }
    .tb-btn:hover:not([disabled]) {
      background: var(--toolbar-hover);
      border-color: rgba(255,255,255,0.22);
    }
    .tb-btn:disabled {
      opacity: 0.38;
      cursor: not-allowed;
    }
    .tb-btn--active {
      background: var(--toolbar-active-bg);
      border-color: var(--toolbar-active-border);
      color: #93c5fd;
    }
    .tb-btn--active:hover:not([disabled]) {
      background: rgba(59,130,246,0.35);
    }
    .tb-btn--danger:hover:not([disabled]) {
      border-color: rgba(239,68,68,0.6);
      color: #fca5a5;
    }

    .tb-divider {
      width: 1px;
      height: 20px;
      background: rgba(255,255,255,0.12);
      margin: 0 6px;
    }
  `],
})
export class ToolbarComponent {
  readonly store = inject(PointStoreService);
  readonly theme = inject(ThemeService);
  private readonly importer = inject(GeoJsonImportService);
  private readonly exporter = inject(GeoJsonExportService);
  private readonly snackBar = inject(MatSnackBar);

  @ViewChild('fileInput') private fileInput!: ElementRef<HTMLInputElement>;

  // ── Keyboard shortcuts ──────────────────────────────────────────────────────
  @HostListener('document:keydown', ['$event'])
  onKeydown(e: KeyboardEvent): void {
    const mod = e.ctrlKey || e.metaKey;
    if (!mod) return;

    // Don't intercept shortcuts while the user is typing in a form field
    const target = e.target as HTMLElement;
    if (target.matches('input, textarea, select, [contenteditable]')) return;

    if (e.key === 'z' && !e.shiftKey) {
      e.preventDefault();
      this.store.undo();
    } else if (e.key === 'y' || (e.key === 'z' && e.shiftKey)) {
      e.preventDefault();
      this.store.redo();
    }
  }

  async onFileSelected(event: Event, mode: 'replace' | 'append' = 'replace'): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    input.value = '';

    try {
      const { features, result } = await this.importer.parseFile(file);
      this.store.importPoints(features, result, mode);
      this.snackBar.open(
        `Imported ${result.imported} Point(s) of Interest` +
          (result.discarded.length > 0 ? ` — ${result.discarded.length} skipped` : ''),
        'OK',
        { duration: 4000 }
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to parse file — is it valid JSON?';
      this.snackBar.open(message, 'OK', { duration: 5000 });
    }
  }

  onExport(): void {
    this.exporter.download(this.store.points());
    this.snackBar.open('GeoJSON file downloaded.', 'OK', { duration: 3000 });
  }

  onExportCsv(): void {
    this.exporter.downloadCsv(this.store.points());
    this.snackBar.open('CSV file downloaded.', 'OK', { duration: 3000 });
  }

  onSave(): void {
    this.store.save();
    this.snackBar.open('Changes saved to localStorage.', 'OK', { duration: 3000 });
  }

  onClear(): void {
    this.store.reset();
    this.snackBar.open('All data cleared.', 'OK', { duration: 3000 });
  }
}
