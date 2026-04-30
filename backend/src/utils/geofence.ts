export function calculateDistance(
  lat1: number, lon1: number,
  lat2: number, lon2: number
): number {
  const R = 6371e3;
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) *
    Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

export function getDistance(
  userLat: number, userLon: number,
  centerLat: number, centerLon: number
): number {
  return calculateDistance(userLat, userLon, centerLat, centerLon);
}

export function isWithinGeofence(
  userLat: number, userLon: number,
  centerLat: any, centerLon: any,
  radiusMeters: number
): boolean {
  const lat = Number(centerLat);
  const lon = Number(centerLon);
  if (isNaN(lat) || isNaN(lon)) {
    return false;
  }
  const distance = calculateDistance(userLat, userLon, lat, lon);
  return distance <= radiusMeters;
}