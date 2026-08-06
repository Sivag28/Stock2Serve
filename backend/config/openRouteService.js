const ORS_WALKING_URL = 'https://api.openrouteservice.org/v2/directions/foot-walking/geojson';

const getWalkingRoute = async ({ origin, destination }) => {
  if (!process.env.ORS_API_KEY) {
    const error = new Error('Walking routes are not configured.');
    error.status = 503;
    throw error;
  }

  const params = new URLSearchParams({
    start: `${origin.longitude},${origin.latitude}`,
    end: `${destination.longitude},${destination.latitude}`,
  });
  const response = await fetch(`${ORS_WALKING_URL}?${params}`, {
    headers: { Authorization: process.env.ORS_API_KEY },
    signal: AbortSignal.timeout(10_000),
  });

  if (!response.ok) {
    const error = new Error('Walking route is currently unavailable.');
    error.status = 502;
    throw error;
  }

  const feature = (await response.json()).features?.[0];
  if (!feature?.geometry?.coordinates || !feature?.properties?.summary) {
    const error = new Error('Walking route is currently unavailable.');
    error.status = 502;
    throw error;
  }

  return {
    distanceMeters: Math.round(feature.properties.summary.distance),
    durationSeconds: Math.round(feature.properties.summary.duration),
    coordinates: feature.geometry.coordinates,
  };
};

module.exports = { getWalkingRoute };
