import { TestBed } from '@angular/core/testing';
import { App } from './app';
import { MapRendererService } from './features/map/map-renderer.service';

/** No-op stub — prevents MapLibre from touching WebGL in JSDOM. */
const mapRendererStub: Partial<MapRendererService> = {
  initialize: vi.fn(),
  destroy: vi.fn(),
  updatePoints: vi.fn(),
  flyTo: vi.fn(),
  fitBounds: vi.fn(),
  showPopup: vi.fn(),
  closePopup: vi.fn(),
  setCursor: vi.fn(),
  onPointClick: vi.fn(),
  onMapClick: vi.fn(),
  onPointDragEnd: vi.fn(),
};

describe('App', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [
        { provide: MapRendererService, useValue: mapRendererStub },
      ],
    }).compileComponents();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(App);
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should render the toolbar', () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('app-toolbar')).not.toBeNull();
  });

  it('should render the poi panel sidebar', () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('app-point-panel')).not.toBeNull();
  });

  it('should render the map area', () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('app-map')).not.toBeNull();
  });
});
