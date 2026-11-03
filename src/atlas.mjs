// Natural Earth 1 projection, shared by the coastline exporter and album pins.
// Polynomial coefficients: https://github.com/d3/d3-geo/blob/main/src/projection/naturalEarth1.js
export const atlasSize = { width: 1200, height: 600 };

export function projectLocation(longitude, latitude) {
  const radians = Math.PI / 180;
  const angle = latitude * radians;
  const square = angle ** 2;
  const horizontal = 0.8707 - 0.131979 * square - 0.013791 * square ** 2
    + 0.003971 * square ** 5 - 0.001529 * square ** 6;
  const vertical = 1.007226 + 0.015085 * square - 0.044475 * square ** 3
    + 0.028874 * square ** 4 - 0.005916 * square ** 5;
  return [600 + longitude * radians * horizontal * 200, 290 - angle * vertical * 200];
}

// Bounds frame the country or, for Canada, the eastern region of its albums.
export const atlasCountries = {
  Canada: { id: 'canada', label: 'Canada', code: 'CAN', longitude: -104, latitude: 57, labelPosition: [292, 78], bounds: [-91, 39, -47, 58] },
  Japan: { id: 'japan', label: 'Japan', code: 'JPN', longitude: 138, latitude: 37, labelPosition: [1050, 208], bounds: [128, 29, 147, 46] },
  Turkey: { id: 'turkey', label: 'Turkey', code: 'TUR', longitude: 35, latitude: 39, labelPosition: [704, 225], bounds: [25, 35, 46, 43] },
  India: { id: 'india', label: 'India', code: 'IND', longitude: 79, latitude: 23, labelPosition: [832, 263], bounds: [67, 5, 99, 37] },
  Australia: { id: 'australia', label: 'Australia', code: 'AUS', longitude: 134, latitude: -25, labelPosition: [1010, 477], bounds: [110, -45, 155, -9] },
  'United Kingdom': { id: 'united-kingdom', label: 'Britain (UK)', code: 'GBR', longitude: -2.5, latitude: 54.5, labelPosition: [570, 65], bounds: [-11, 49, 3, 61] },
  Malaysia: { id: 'malaysia', label: 'Malaysia', code: 'MYS', longitude: 102, latitude: 4, labelPosition: [990, 315], bounds: [98, 0, 105, 8] },
};

export function fitAtlasBounds([west, south, east, north]) {
  const points = [];
  for (let step = 0; step <= 20; step += 1) {
    const fraction = step / 20;
    points.push(projectLocation(west + (east - west) * fraction, south), projectLocation(west + (east - west) * fraction, north));
    points.push(projectLocation(west, south + (north - south) * fraction), projectLocation(east, south + (north - south) * fraction));
  }
  const xs = points.map(([x]) => x), ys = points.map(([, y]) => y);
  const left = Math.min(...xs), right = Math.max(...xs), top = Math.min(...ys), bottom = Math.max(...ys);
  const scale = Math.min(1040 / (right - left), 450 / (bottom - top));
  return { scale, x: 600 - (left + right) / 2 * scale, y: 300 - (top + bottom) / 2 * scale };
}

export function groupAtlasCountries(trips) {
  const groups = new Map();
  for (const trip of trips) {
    if (!groups.has(trip.country)) {
      const config = atlasCountries[trip.country] || {
        id: trip.country.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''),
        label: trip.country, longitude: trip.mapLocation.longitude, latitude: trip.mapLocation.latitude,
      };
      groups.set(trip.country, { ...config, name: trip.country, trips: [] });
    }
    groups.get(trip.country).trips.push(trip);
  }
  return [...groups.values()].map((country) => {
    const longitudes = country.trips.map((trip) => trip.mapLocation.longitude);
    const latitudes = country.trips.map((trip) => trip.mapLocation.latitude);
    const bounds = country.bounds || [Math.max(-180, Math.min(...longitudes) - 8), Math.max(-85, Math.min(...latitudes) - 5), Math.min(180, Math.max(...longitudes) + 8), Math.min(85, Math.max(...latitudes) + 5)];
    return { ...country, view: fitAtlasBounds(bounds) };
  });
}
