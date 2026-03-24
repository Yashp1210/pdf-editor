import { encryptedJsonFetch } from '../../utils/encryptedJsonFetch';

export async function fetchStations() {
  const data = await encryptedJsonFetch('/api/stations', { method: 'POST', body: {} });
  return data.stations || [];
}

export async function fetchDistanceKm(from, to) {
  const data = await encryptedJsonFetch('/api/distance', { method: 'POST', body: { from, to } });
  return data.distanceKm ?? null;
}

export async function fetchTrains(from, to) {
  const data = await encryptedJsonFetch('/api/trains', { method: 'POST', body: { from, to } });
  return data.trains || [];
}
