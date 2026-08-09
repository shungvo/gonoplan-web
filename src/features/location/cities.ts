import type { Coordinates } from '@/lib/geo/grid';

export interface City extends Coordinates {
  slug: string;
  name: string;
  nameVi: string;
  region: 'north' | 'central' | 'south';
  /** Sensible opening zoom — a compact town wants more than a sprawling city. */
  zoom: number;
}

/**
 * Manual city list rather than a geocoding call.
 *
 * This is the screen someone sees *because* location failed, often on a poor
 * connection. Making it depend on a metered network round trip would mean the
 * fallback can fail too — and a fallback that can fail is not a fallback (§34).
 *
 * Ordered by how likely a visitor is to be there, not alphabetically.
 */
export const CITIES: City[] = [
  { slug: 'ho-chi-minh', name: 'Ho Chi Minh City', nameVi: 'Hồ Chí Minh', latitude: 10.7769, longitude: 106.7009, region: 'south', zoom: 13 },
  { slug: 'ha-noi', name: 'Hanoi', nameVi: 'Hà Nội', latitude: 21.0278, longitude: 105.8342, region: 'north', zoom: 13 },
  { slug: 'da-nang', name: 'Da Nang', nameVi: 'Đà Nẵng', latitude: 16.0544, longitude: 108.2022, region: 'central', zoom: 13 },
  { slug: 'hoi-an', name: 'Hoi An', nameVi: 'Hội An', latitude: 15.8801, longitude: 108.338, region: 'central', zoom: 15 },
  { slug: 'nha-trang', name: 'Nha Trang', nameVi: 'Nha Trang', latitude: 12.2388, longitude: 109.1967, region: 'central', zoom: 13 },
  { slug: 'da-lat', name: 'Da Lat', nameVi: 'Đà Lạt', latitude: 11.9404, longitude: 108.4583, region: 'central', zoom: 14 },
  { slug: 'hue', name: 'Hue', nameVi: 'Huế', latitude: 16.4637, longitude: 107.5909, region: 'central', zoom: 14 },
  { slug: 'ha-long', name: 'Ha Long', nameVi: 'Hạ Long', latitude: 20.9101, longitude: 107.1839, region: 'north', zoom: 13 },
  { slug: 'sa-pa', name: 'Sa Pa', nameVi: 'Sa Pa', latitude: 22.3364, longitude: 103.8438, region: 'north', zoom: 14 },
  { slug: 'phu-quoc', name: 'Phu Quoc', nameVi: 'Phú Quốc', latitude: 10.2899, longitude: 103.984, region: 'south', zoom: 12 },
  { slug: 'vung-tau', name: 'Vung Tau', nameVi: 'Vũng Tàu', latitude: 10.346, longitude: 107.0843, region: 'south', zoom: 14 },
  { slug: 'can-tho', name: 'Can Tho', nameVi: 'Cần Thơ', latitude: 10.0452, longitude: 105.7469, region: 'south', zoom: 13 },
  { slug: 'quy-nhon', name: 'Quy Nhon', nameVi: 'Quy Nhơn', latitude: 13.7563, longitude: 109.2297, region: 'central', zoom: 14 },
  { slug: 'hai-phong', name: 'Hai Phong', nameVi: 'Hải Phòng', latitude: 20.8449, longitude: 106.6881, region: 'north', zoom: 13 },
];

/** Matches either script, with or without tone marks — people type both. */
export function searchCities(query: string): City[] {
  const normalised = query
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[đĐ]/g, 'd')
    .toLowerCase()
    .trim();

  if (!normalised) return CITIES;

  return CITIES.filter((city) => {
    const haystack = `${city.name} ${city.nameVi} ${city.slug}`
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/[đĐ]/g, 'd')
      .toLowerCase();
    return haystack.includes(normalised);
  });
}

/** The city whose centre is closest — used to label a GPS fix without geocoding. */
export function nearestCity(coordinates: Coordinates): City | null {
  let best: { city: City; distance: number } | null = null;

  for (const city of CITIES) {
    const dLat = city.latitude - coordinates.latitude;
    const dLng = city.longitude - coordinates.longitude;
    const distance = dLat * dLat + dLng * dLng;
    if (!best || distance < best.distance) best = { city, distance };
  }

  // ~1.2° ≈ 130 km. Beyond that the nearest city is not where you are, and a
  // confidently wrong label is worse than no label — reverse geocoding via the
  // backend proxy handles that case (Phase 6).
  return best && best.distance < 1.5 ? best.city : null;
}
