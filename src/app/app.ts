import { Component } from '@angular/core';
import { ToolbarComponent } from './shared/toolbar/toolbar.component';
import { PointPanelComponent } from './features/poi-panel/poi-panel.component';
import { MapComponent } from './features/map/map.component';
import { MapSearchComponent } from './features/map/map-search/map-search.component';

/**
 * Root shell component — provides the full-screen layout:
 * top toolbar + left sidebar (POI panel) + right map area.
 */
@Component({
  selector: 'app-root',
  standalone: true,
  imports: [ToolbarComponent, PointPanelComponent, MapComponent, MapSearchComponent],
  template: `
    <div class="app-shell">
      <app-toolbar />
      <div class="app-body">
        <aside class="sidebar">
          <app-point-panel />
        </aside>
        <main class="map-area">
          <app-map />
          <app-map-search />
        </main>
      </div>
    </div>
  `,
  styles: [`
    :host {
      display: block;
      height: 100vh;
      overflow: hidden;
    }
    .app-shell {
      display: flex;
      flex-direction: column;
      height: 100%;
    }
    .app-body {
      display: flex;
      flex: 1;
      overflow: hidden;
    }
    .sidebar {
      width: 340px;
      min-width: 260px;
      flex-shrink: 0;
      height: 100%;
      overflow: hidden;
    }
    .map-area {
      flex: 1;
      height: 100%;
      overflow: hidden;
      position: relative;
    }
  `],
})
export class App {}
