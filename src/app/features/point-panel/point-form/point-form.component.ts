import { Component, inject, effect } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import {
  LucidePencil,
  LucideLocateFixed,
  LucideSave,
  LucideTrash,
  LucideX,
} from '@lucide/angular';
import { PointStoreService } from '../../../core/services/point-store.service';

const PREDEFINED_CATEGORIES = [
  'airport', 'bus_terminal', 'hospital', 'hotel', 'landmark',
  'mall', 'museum', 'other', 'park', 'restaurant',
  'school', 'square', 'stadium', 'station', 'viewpoint',
];

@Component({
  selector: 'app-point-form',
  standalone: true,
  imports: [
    DecimalPipe,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    LucidePencil,
    LucideLocateFixed,
    LucideSave,
    LucideTrash,
    LucideX,
  ],
  template: `
    @if (store.selectedPoint(); as poi) {
      <div class="form-panel">

        <!-- Form header -->
        <div class="form-header">
          <div class="form-title">
            <svg lucidePencil [size]="13" class="form-title-icon"></svg>
            Edit Point
          </div>
          <button class="close-btn" (click)="store.selectPoint('')" aria-label="Close editor">
            <svg lucideX [size]="13"></svg>
          </button>
        </div>

        <form [formGroup]="form" (ngSubmit)="onSave(poi.id)" novalidate class="form-body">

          <!-- Name -->
          <div class="field-group">
            <label class="field-label">Name</label>
            <input
              class="field-input"
              [class.field-input--error]="form.controls['name'].invalid && form.controls['name'].touched"
              formControlName="name"
              placeholder="POI name"
            />
            @if (form.controls['name'].invalid && form.controls['name'].touched) {
              <span class="field-error">Name is required</span>
            }
          </div>

          <!-- Category -->
          <div class="field-group">
            <label class="field-label">Category</label>
            <select
              class="field-select"
              [class.field-input--error]="form.controls['category'].invalid && form.controls['category'].touched"
              formControlName="category"
            >
              @for (cat of categories; track cat) {
                <option [value]="cat">{{ cat }}</option>
              }
            </select>
          </div>

          <!-- Duplicate warning -->
          @if (store.duplicateWarning()) {
            <div class="dup-warning">
              ⚠ {{ store.duplicateWarning() }}
            </div>
          }

          <!-- Coordinates (read-only) -->
          <div class="coords-row">
            <svg lucideLocateFixed [size]="12" class="coords-icon"></svg>
            <span class="coords-text">
              {{ poi.geometry.coordinates[1] | number:'1.5-5' }},
              {{ poi.geometry.coordinates[0] | number:'1.5-5' }}
            </span>
          </div>

          <!-- Actions -->
          <div class="form-actions">
            <button
              type="submit"
              class="btn btn--primary"
              [disabled]="form.invalid"
            >
              <svg lucideSave [size]="13"></svg>
              Save
            </button>
            <button
              type="button"
              class="btn btn--danger"
              (click)="onDelete(poi.id)"
            >
              <svg lucideTrash [size]="13"></svg>
              Delete
            </button>
          </div>

        </form>
      </div>
    }
  `,
  styles: [`
    .form-panel {
      border-top: 1px solid var(--sidebar-border);
      background: var(--sidebar-surface);
    }

    /* Header */
    .form-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 10px 14px 8px;
      border-bottom: 1px solid var(--sidebar-border);
    }
    .form-title {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 12px;
      font-weight: 700;
      color: var(--sidebar-text);
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .form-title-icon { color: var(--accent); }

    .close-btn {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 24px;
      height: 24px;
      background: none;
      border: 1px solid var(--sidebar-border);
      border-radius: var(--radius-sm);
      color: var(--sidebar-muted);
      cursor: pointer;
      padding: 0;
      transition: background 0.15s, color 0.15s;
    }
    .close-btn:hover {
      background: #fee2e2;
      color: var(--danger);
      border-color: #fecaca;
    }

    /* Body */
    .form-body { padding: 12px 14px; }

    .field-group { margin-bottom: 10px; }
    .field-label {
      display: block;
      font-size: 11px;
      font-weight: 600;
      color: var(--sidebar-muted);
      text-transform: uppercase;
      letter-spacing: 0.4px;
      margin-bottom: 4px;
    }
    .field-input,
    .field-select {
      width: 100%;
      height: 34px;
      padding: 0 10px;
      background: var(--sidebar-bg);
      border: 1px solid var(--sidebar-border);
      border-radius: var(--radius-sm);
      font-size: 13px;
      font-family: inherit;
      color: var(--sidebar-text);
      outline: none;
      transition: border-color 0.15s, box-shadow 0.15s;
    }
    .field-input:focus,
    .field-select:focus {
      border-color: var(--accent);
      box-shadow: 0 0 0 3px rgba(59,130,246,0.12);
    }
    .field-input--error { border-color: var(--danger) !important; }
    .field-error {
      font-size: 11px;
      color: var(--danger);
      margin-top: 3px;
      display: block;
    }

    /* Duplicate warning */
    .dup-warning {
      font-size: 11.5px;
      color: #92400e;
      background: #fef3c7;
      border: 1px solid #fde68a;
      border-radius: var(--radius-sm);
      padding: 6px 10px;
      margin-bottom: 10px;
      line-height: 1.4;
    }

    /* Coordinates */
    .coords-row {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 6px 10px;
      background: #f1f5f9;
      border: 1px solid var(--sidebar-border);
      border-radius: var(--radius-sm);
      margin-bottom: 12px;
    }
    .coords-icon { color: #64748b; flex-shrink: 0; }
    .coords-text {
      font-size: 11.5px;
      color: #475569;
      font-variant-numeric: tabular-nums;
      letter-spacing: 0.2px;
    }

    /* Buttons */
    .form-actions { display: flex; gap: 8px; }

    .btn {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      height: 32px;
      padding: 0 14px;
      border: 1px solid transparent;
      border-radius: var(--radius-sm);
      font-size: 13px;
      font-weight: 500;
      font-family: inherit;
      cursor: pointer;
      transition: background 0.15s, border-color 0.15s, opacity 0.15s;
    }
    .btn:disabled { opacity: 0.45; cursor: not-allowed; }
    .btn--primary {
      background: var(--accent);
      color: #fff;
      border-color: var(--accent);
    }
    .btn--primary:hover:not([disabled]) { background: var(--accent-hover); border-color: var(--accent-hover); }
    .btn--danger {
      background: transparent;
      color: var(--danger);
      border-color: #fecaca;
    }
    .btn--danger:hover:not([disabled]) { background: #fee2e2; border-color: #fca5a5; }
  `],
})
export class PoiFormComponent {
  readonly store = inject(PointStoreService);
  readonly categories = PREDEFINED_CATEGORIES;

  readonly form = inject(FormBuilder).group({
    name: ['', [Validators.required, Validators.minLength(1)]],
    category: ['', Validators.required],
  });

  constructor() {
    effect(() => {
      const poi = this.store.selectedPoint();
      if (poi) {
        this.form.patchValue({
          name: poi.properties.name,
          category: poi.properties.category,
        });
        this.form.markAsPristine();
        this.form.markAsUntouched();
      }
    });
  }

  onSave(id: string): void {
    if (this.form.invalid) return;
    const { name, category } = this.form.getRawValue();
    this.store.updatePoint(id, { name: name ?? '', category: category ?? '' });
  }

  onDelete(id: string): void {
    this.store.deletePoint(id);
  }
}
