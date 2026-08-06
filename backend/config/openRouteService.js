const ORS_WALKING_URL = 'https://api.openrouteservice.org/v2/directions/foot-walking/geojson';

const getWalkingRoute = async ({ origin, destination }) => {
  const apiKey = process.env.ORS_API_KEY?.trim();
  if (!apiKey) {
    const error = new Error('Walking routes are not configured.');
    error.status = 503;
    throw error;
  }

  const response = await fetch(ORS_WALKING_URL, {
    method: 'POST',
    headers: {
      Authorization: apiKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      coordinates: [
        [origin.longitude, origin.latitude],
        [destination.longitude, destination.latitude],
      ],
    }),
    signal: AbortSignal.timeout(10_000),
  });

  if (!response.ok) {
    const responseBody = await response.text();
    console.error('OpenRouteService walking-route request failed:', {
      status: response.status,
      statusText: response.statusText,
      response: responseBody.slice(0, 1_000),
    });
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
