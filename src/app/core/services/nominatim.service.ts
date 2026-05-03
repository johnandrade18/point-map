import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

export interface NominatimSearchResult {
  display_name: string;
  lat: string;
  lon: string;
}

/**
 * Thin wrapper around the Nominatim OpenStreetMap API.
 * No API key required; subject to Nominatim usage policy
 * (≤1 req/s, valid User-Agent).
 */
@Injectable({ providedIn: 'root' })
export class NominatimService {
  private readonly http = inject(HttpClient);
  private readonly BASE = 'https://nominatim.openstreetmap.org';
  private readonly HEADERS = {
    'Accept-Language': 'en',
    'User-Agent': 'POI-Map-Editor/1.0 (https://github.com/johnandrade18/point-map)',
  };

  /**
   * Returns a short human-readable address for the given coordinates,
   * or `null` if the request fails.
   */
  async reverseGeocode(lon: number, lat: number): Promise<string | null> {
    try {
      const result = await firstValueFrom(
        this.http.get<{ display_name: string }>(`${this.BASE}/reverse`, {
          params: { lat: String(lat), lon: String(lon), format: 'json' },
          headers: this.HEADERS,
        }),
      );
      const parts = result.display_name.split(',');
      return parts.slice(0, 2).map(s => s.trim()).join(', ');
    } catch {
      return null;
    }
  }

  /**
   * Returns up to 5 location suggestions for the given free-form query.
   */
  async search(query: string): Promise<NominatimSearchResult[]> {
    if (!query.trim()) return [];
    try {
      return await firstValueFrom(
        this.http.get<NominatimSearchResult[]>(`${this.BASE}/search`, {
          params: { q: query, format: 'json', limit: '5' },
          headers: this.HEADERS,
        }),
      );
    } catch {
      return [];
    }
  }
}
