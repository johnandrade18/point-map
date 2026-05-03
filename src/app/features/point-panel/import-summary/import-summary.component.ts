import { Component, inject } from '@angular/core';
import { LucideCheck, LucideTriangleAlert, LucideX } from '@lucide/angular';
import { PointStoreService } from '../../../core/services/point-store.service';
import { DISCARD_REASON_LABELS } from '../../../core/models/import-result.model';

interface ReasonCount { label: string; count: number; }

@Component({
  selector: 'app-import-summary',
  standalone: true,
  imports: [LucideCheck, LucideTriangleAlert, LucideX],
  template: `
    @if (store.importSummary(); as summary) {
      <div class="banner" [class.banner--warn]="summary.discarded.length > 0">

        <div class="banner-body">
          <!-- Icon -->
          <span class="banner-icon">
            @if (summary.discarded.length === 0) {
              <svg lucideCheck [size]="14"></svg>
            } @else {
              <svg lucideTriangleAlert [size]="14"></svg>
            }
          </span>

          <!-- Message -->
          <div class="banner-content">
            <span class="banner-main">
              {{ summary.imported }} feature{{ summary.imported !== 1 ? 's' : '' }} imported
              @if (summary.discarded.length > 0) {
                — <strong>{{ summary.discarded.length }} discarded</strong>
              }
            </span>
            @if (reasonCounts(summary.discarded).length > 0) {
              <ul class="reason-list">
                @for (r of reasonCounts(summary.discarded); track r.label) {
                  <li>{{ r.count }}× {{ r.label }}</li>
                }
              </ul>
            }
          </div>
        </div>

        <!-- Dismiss -->
        <button class="dismiss-btn" (click)="dismiss()" aria-label="Dismiss import summary">
          <svg lucideX [size]="12"></svg>
        </button>

      </div>
    }
  `,
  styles: [`
    .banner {
      display: flex;
      align-items: flex-start;
      gap: 8px;
      margin: 0 8px 4px;
      padding: 10px 10px 10px 12px;
      background: #f0fdf4;
      border: 1px solid #bbf7d0;
      border-left: 3px solid var(--success);
      border-radius: var(--radius-md);
      font-size: 12.5px;
    }
    .banner--warn {
      background: #fffbeb;
      border-color: #fde68a;
      border-left-color: var(--warning);
    }

    .banner-body {
      display: flex;
      align-items: flex-start;
      gap: 8px;
      flex: 1;
      min-width: 0;
    }

    .banner-icon {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 22px;
      height: 22px;
      border-radius: 50%;
      background: #dcfce7;
      color: var(--success);
      flex-shrink: 0;
      margin-top: 1px;
    }
    .banner--warn .banner-icon {
      background: #fef3c7;
      color: var(--warning);
    }

    .banner-content { flex: 1; min-width: 0; }
    .banner-main { color: #166534; line-height: 1.4; }
    .banner--warn .banner-main { color: #92400e; }

    .reason-list {
      margin: 4px 0 0 0;
      padding: 0 0 0 14px;
      list-style: disc;
      color: #b45309;
      font-size: 11.5px;
    }
    .reason-list li { line-height: 1.6; }

    .dismiss-btn {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 20px;
      height: 20px;
      background: rgba(0,0,0,0.06);
      border: none;
      border-radius: 4px;
      color: #475569;
      cursor: pointer;
      padding: 0;
      flex-shrink: 0;
      transition: background 0.15s;
    }
    .dismiss-btn:hover { background: rgba(0,0,0,0.12); }
  `],
})
export class ImportSummaryComponent {
  readonly store = inject(PointStoreService);

  dismiss(): void {
    this.store.clearImportSummary();
  }

  reasonCounts(discarded: { reason: string }[]): ReasonCount[] {
    const map = new Map<string, number>();
    discarded.forEach(d => map.set(d.reason, (map.get(d.reason) ?? 0) + 1));
    return [...map.entries()].map(([reason, count]) => ({
      label: DISCARD_REASON_LABELS[reason] ?? reason,
      count,
    }));
  }
}
