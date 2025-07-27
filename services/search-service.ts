// Сервіс для геопошуку
export interface GeoSearchResult {
  display_name: string;
  lat: string;
  lon: string;
  type: string;
  importance: number;
  address?: {
    city?: string;
    town?: string;
    village?: string;
    country?: string;
  };
}

export interface GeoSearchOptions {
  query: string;
  limit?: number;
  language?: string;
  country?: string;
  viewbox?: string;
  bounded?: boolean;
}

export class GeoSearchService {
  private static instance: GeoSearchService;
  private baseUrl = 'https://nominatim.openstreetmap.org/search';
  private defaultOptions = {
    format: 'json',
    addressdetails: 1,
    limit: 7,
    'accept-language': 'uk',
    countrycodes: 'ua'
  };

  private constructor() {}

  static getInstance(): GeoSearchService {
    if (!GeoSearchService.instance) {
      GeoSearchService.instance = new GeoSearchService();
    }
    return GeoSearchService.instance;
  }

  async search(options: GeoSearchOptions): Promise<GeoSearchResult[]> {
    try {
      const searchParams: Record<string, string> = {
        format: this.defaultOptions.format,
        addressdetails: this.defaultOptions.addressdetails.toString(),
        limit: options.limit?.toString() || this.defaultOptions.limit.toString(),
        'accept-language': options.language || this.defaultOptions['accept-language'],
        countrycodes: this.defaultOptions.countrycodes,
        q: options.query
      };

      const params = new URLSearchParams(searchParams);

      if (options.country) {
        params.set('countrycodes', options.country);
      }

      if (options.viewbox) {
        params.set('viewbox', options.viewbox);
        params.set('bounded', options.bounded ? '1' : '0');
      }

      const response = await fetch(`${this.baseUrl}?${params.toString()}`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return this.processResults(data);
    } catch (error) {
      console.error('Помилка геопошуку:', error);
      return [];
    }
  }

  private processResults(results: any[]): GeoSearchResult[] {
    return results
      .filter(result => result.lat && result.lon)
      .map(result => ({
        display_name: result.display_name,
        lat: result.lat,
        lon: result.lon,
        type: result.type,
        importance: result.importance,
        address: result.address
      }))
      .sort((a, b) => b.importance - a.importance);
  }

  // Метод для пошуку в межах Львова
  async searchInLviv(query: string, limit: number = 7): Promise<GeoSearchResult[]> {
    // Координати Львова: 49.8397, 24.0297
    const lvivBounds = '24.0,49.8,24.1,49.9'; // приблизні межі Львова
    
    return this.search({
      query,
      limit,
      viewbox: lvivBounds,
      bounded: true,
      country: 'ua'
    });
  }

  // Метод для пошуку з автодоповненням
  async searchWithAutocomplete(query: string): Promise<GeoSearchResult[]> {
    if (query.length < 2) return [];
    
    return this.search({
      query,
      limit: 5
    });
  }
} 