import countryData from './countries.json';
import countryPolyData from './countries.geo.json';
// @ts-expect-error - rbush is not typed for v1
import rbush from 'rbush';

export interface Country {
  country: string;
  alpha2: string;
  alpha3: string;
  numeric: number;
  latitude: number;
  longitude: number;
}

interface CountryPoly {
  country: string;
  coordinates: any;
}

export function getCountryList(): Country[] {
  return countryData;
}

export function getCountryGeo(countryCode: string): [number, number] {
  const country = countryData.find((country) => country.alpha3 === countryCode);
  if (!country) {
    return [-1,-1];
  }
  return [country.latitude, country.longitude];
}

/**
 * 
 * @param point [longitude, latitude]
 * @returns 
 */
export function countryFromPoint(point: [number, number]): Country | null {
  const r = new rbush(7, ['.minLng', '.minLat', '.maxLng', '.maxLat']);
  const tree = r.fromJSON(countryPolyData);
  const intersections = tree.search(point.concat(point));
  const poly = intersections
    .find((polygon: { coordinates: any }): CountryPoly =>
      polygon.coordinates.find((vs: any): boolean => {
        // ray-casting algorithm based on
        // http://www.ecse.rpi.edu/Homepages/wrf/Research/Short_Notes/pnpoly.html
        const x = point[0], y = point[1];

        let inside = false;
        for (let i = 0, j = vs.length - 1; i < vs.length; j = i++) {
            const xi = vs[i][0], yi = vs[i][1];
            const xj = vs[j][0], yj = vs[j][1];

            const intersect = ((yi > y) != (yj > y))
                && (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
            if (intersect) inside = !inside;
        }
        return inside;
      }),
  );
  if (!poly) return null;
  return countryData.find((country) => country.alpha3 === poly.country) || null;
}
