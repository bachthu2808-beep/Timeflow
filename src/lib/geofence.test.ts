import { distanceInMeters, isWithinGeofence } from './geofence';

describe('distanceInMeters', () => {
  it('returns 0 for identical coordinates', () => {
    const point = { latitude: 10.762622, longitude: 106.660172 };
    expect(distanceInMeters(point, point)).toBe(0);
  });

  it('approximates ~111.2m per 0.001 degree of latitude', () => {
    const a = { latitude: 10.7626, longitude: 106.6602 };
    const b = { latitude: 10.7636, longitude: 106.6602 };
    const distance = distanceInMeters(a, b);
    expect(distance).toBeGreaterThan(105);
    expect(distance).toBeLessThan(118);
  });
});

describe('isWithinGeofence', () => {
  const shop = { latitude: 10.7626, longitude: 106.6602 };

  it('is true when the employee is at the shop', () => {
    expect(isWithinGeofence(shop, shop, 100)).toBe(true);
  });

  it('is false when the employee is well outside the radius', () => {
    const farAway = { latitude: 10.8, longitude: 106.7 };
    expect(isWithinGeofence(farAway, shop, 100)).toBe(false);
  });

  it('respects the configured radius at the boundary', () => {
    // ~90m north of the shop
    const nearby = { latitude: shop.latitude + 0.0008, longitude: shop.longitude };
    expect(isWithinGeofence(nearby, shop, 100)).toBe(true);
    expect(isWithinGeofence(nearby, shop, 50)).toBe(false);
  });
});
