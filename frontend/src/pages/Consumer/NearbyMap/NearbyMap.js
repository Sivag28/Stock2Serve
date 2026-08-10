import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Circle, MapContainer, Marker, Polyline, TileLayer, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { io } from 'socket.io-client';
import { FaBars, FaFilter, FaLeaf, FaLocationArrow, FaMapMarkedAlt, FaSearch, FaSignOutAlt, FaTimes } from 'react-icons/fa';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext';
import api, { API_URL } from '../../../services/api';
import './NearbyMap.css';
import './Clusters.css';
import './MerchantLogo.css';
import './NearbyMapPolish.css';

const RADIUS_METERS = 10000;
const categoryLabel = (category = '') => ({ cafe: 'Cafe', bakery: 'Bakery', restaurant: 'Restaurant', supermarket: 'Grocery' }[category] || category.replace(/(^|\s)\S/g, (letter) => letter.toUpperCase()) || 'Merchant');
const haversine = (from, to) => { const rad = (value) => value * Math.PI / 180; const dLat = rad(to.latitude - from.latitude); const dLon = rad(to.longitude - from.longitude); const a = Math.sin(dLat / 2) ** 2 + Math.cos(rad(from.latitude)) * Math.cos(rad(to.latitude)) * Math.sin(dLon / 2) ** 2; return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)); };
const distanceText = (distance) => distance < 1 ? `${Math.round(distance * 1000)} m` : `${distance.toFixed(1)} km`;
const travelTimes = (distanceKm) => ({ walking: Math.max(1, Math.round(distanceKm * 12)), biking: Math.max(1, Math.round(distanceKm * 4)), driving: Math.max(1, Math.round(distanceKm * 2)) });
const merchantLogo = (merchant) => {
  if (!merchant.profilePhoto) return null;
  return /^https?:\/\//i.test(merchant.profilePhoto)
    ? merchant.profilePhoto
    : `${API_URL}${merchant.profilePhoto}`;
};
const markerState = (merchant) => merchant.markerStatus || (() => { const minutes = (new Date(merchant.nextExpiry).getTime() - Date.now()) / 60000; if (minutes <= 10) return 'urgent'; return merchant.totalMeals <= 8 ? 'limited' : 'plenty'; })();
const markerIcon = (merchant, fresh = false) => new L.DivIcon({ className: 'nearby-marker-shell', iconSize: [52, 52], iconAnchor: [26, 26], html: `<div class="nearby-marker ${markerState(merchant)} ${fresh ? 'fresh' : ''}"><span class="nearby-marker-dot">${merchant.totalMeals}</span><span>🍽</span></div>` });
const userIcon = new L.DivIcon({ className: 'nearby-user-shell', iconSize: [22, 22], iconAnchor: [11, 11], html: '<div class="nearby-user-dot"></div>' });
const clusterIcon = (count) => new L.DivIcon({ className: 'nearby-cluster-shell', iconSize: [50, 50], iconAnchor: [25, 25], html: `<div class="nearby-cluster">${count >= 50 ? '50+' : count >= 20 ? '20+' : count >= 10 ? '10+' : '5+'}</div>` });

function MerchantMarkers({ merchants, onSelect, freshIds }) {
  const map = useMap(); const [, setRevision] = useState(0);
  useMapEvents({ zoomend: () => setRevision((value) => value + 1), moveend: () => setRevision((value) => value + 1) });
  const groups = (() => {
    const pending = [...merchants]; const result = [];
    while (pending.length) {
      const seed = pending.shift(); const seedPoint = map.latLngToContainerPoint([seed.latitude, seed.longitude]); const close = [seed];
      for (let index = pending.length - 1; index >= 0; index -= 1) { const point = map.latLngToContainerPoint([pending[index].latitude, pending[index].longitude]); if (seedPoint.distanceTo(point) < 62) close.push(...pending.splice(index, 1)); }
      result.push(close);
    }
    return result;
  })();
  return groups.map((group) => group.length >= 5 ? <Marker key={`cluster-${group.map((merchant) => merchant._id).join('-')}`} position={[group[0].latitude, group[0].longitude]} icon={clusterIcon(group.length)} eventHandlers={{ click: () => map.fitBounds(group.map((merchant) => [merchant.latitude, merchant.longitude]), { padding: [45, 45], maxZoom: Math.min(map.getZoom() + 2, 18) }) }} /> : group.map((merchant) => <Marker key={merchant._id} position={[merchant.latitude, merchant.longitude]} icon={markerIcon(merchant, freshIds.has(String(merchant._id)))} eventHandlers={{ click: () => onSelect(merchant) }} />));
}
function CurrentLocationCamera({ position, requestId }) {
  const map = useMap();
  useEffect(() => {
    if (!position || !requestId) return;
    const center = L.latLng(position.latitude, position.longitude);
    map.flyToBounds(center.toBounds(RADIUS_METERS * 2), { padding: [42, 42], maxZoom: 13, duration: .65 });
  }, [map, position, requestId]);
  return null;
}

function WalkingRouteCamera({ coordinates }) {
  const map = useMap();
  useEffect(() => {
    if (!coordinates?.length) return;
    map.fitBounds(coordinates.map(([longitude, latitude]) => [latitude, longitude]), {
      padding: [40, 40],
      maxZoom: 16,
    });

    const distanceMeters = coordinates.slice(1).reduce((total, point, index) => {
      const [previousLongitude, previousLatitude] = coordinates[index];
      const [longitude, latitude] = point;
      return total + L.latLng(previousLatitude, previousLongitude).distanceTo(L.latLng(latitude, longitude));
    }, 0);
    const durationMinutes = Math.max(1, Math.ceil(distanceMeters / 83.33));
    const distanceLabel = distanceMeters >= 1000 ? `${(distanceMeters / 1000).toFixed(1)} km` : `${Math.round(distanceMeters)} m`;
    const routeControl = L.control({ position: 'topleft' });
    routeControl.onAdd = () => {
      const container = L.DomUtil.create('div', 'nearby-route-summary');
      container.innerHTML = `<strong><span>🚶</span> Walking route</strong><p><span>📍</span> ${distanceLabel}</p><p><span>◷</span> About ${durationMinutes} min</p><small>Follow the highlighted route to the merchant</small>`;
      L.DomEvent.disableClickPropagation(container);
      L.DomEvent.disableScrollPropagation(container);
      return container;
    };
    routeControl.addTo(map);

    return () => map.removeControl(routeControl);
  }, [coordinates, map]);
  return null;
}

const NearbyMap = () => {
  const { logout, user, consumerLocation, refreshConsumerLocation } = useAuth(); const navigate = useNavigate(); const routeLocation = useLocation();
  const [position, setPosition] = useState(null); const [merchants, setMerchants] = useState([]); const [loading, setLoading] = useState(true); const [selected, setSelected] = useState(null); const [walkingRoute, setWalkingRoute] = useState(null); const [routeLoading, setRouteLoading] = useState(false); const [routeError, setRouteError] = useState(''); const [search, setSearch] = useState(''); const [filtersOpen, setFiltersOpen] = useState(false); const [listMode, setListMode] = useState(false); const [menuOpen, setMenuOpen] = useState(false); const [maxDistance, setMaxDistance] = useState(10); const [category, setCategory] = useState('all'); const [foodType, setFoodType] = useState('all'); const [openNow, setOpenNow] = useState(false); const [mapVersion, setMapVersion] = useState(0); const [locationRequest, setLocationRequest] = useState(0); const newMerchantIds = useRef(new Set()); const merchantIds = useRef(new Set());
  const nav = [{ path: '/consumer/feed', label: 'Find food' }, { path: '/consumer/map', label: 'Nearby map' }, { path: '/consumer/claims', label: 'My claims' }, { path: '/consumer/profile', label: 'Profile' }];
  const fetchMerchants = useCallback(async (coordinates) => { if (!coordinates) return; try { const response = await api.get('/listings/merchants', { params: coordinates }); const next = response.data.merchants || []; merchantIds.current = new Set(next.map((merchant) => String(merchant._id))); setMerchants(next); } finally { setLoading(false); } }, []);

  useEffect(() => { refreshConsumerLocation(); }, [refreshConsumerLocation]);
  useEffect(() => { if (!consumerLocation) return; setPosition(consumerLocation); fetchMerchants(consumerLocation); }, [consumerLocation, fetchMerchants]);
  useEffect(() => { if (!position) return undefined; const socket = io(API_URL, { auth: { token: localStorage.getItem('token') }, transports: ['websocket', 'polling'] }); const refresh = (listing) => { const merchantId = String(listing?.merchantId?._id || listing?.merchantId || ''); if (merchantId && !merchantIds.current.has(merchantId)) newMerchantIds.current.add(merchantId); fetchMerchants(position); }; socket.on('listing-created', refresh); socket.on('listing-updated', refresh); socket.on('listing-quantity-updated', () => fetchMerchants(position)); return () => { socket.disconnect(); }; }, [fetchMerchants, position]);
  useEffect(() => { const timer = setInterval(() => setMapVersion((version) => version + 1), 60000); return () => clearInterval(timer); }, []);

  const visible = useMemo(() => merchants.map((merchant) => ({ ...merchant, refreshedAt: mapVersion, distance: haversine(position, merchant), markerStatus: (() => { const minutes = (new Date(merchant.nextExpiry).getTime() - Date.now()) / 60000; return minutes <= 10 ? 'urgent' : merchant.totalMeals <= 8 ? 'limited' : 'plenty'; })() })).filter((merchant) => merchant.distance <= maxDistance && (category === 'all' || merchant.category === category) && (foodType === 'all' || merchant.foodTypes.includes(foodType)) && (!openNow || merchant.openingTime)).filter((merchant) => `${merchant.name} ${merchant.category}`.toLowerCase().includes(search.toLowerCase())).sort((a, b) => a.distance - b.distance), [merchants, position, maxDistance, category, foodType, openNow, search, mapVersion]);
  const locationNow = () => {
    setLocationRequest((request) => request + 1);
    refreshConsumerLocation().then((next) => {
      if (!next) return;
      setPosition(next);
      setLocationRequest((request) => request + 1);
      fetchMerchants(next);
    });
  };
  const selectMerchant = (merchant) => { setSelected(merchant); setWalkingRoute(null); setRouteError(''); };
  const findWalkingRoute = async () => {
    if (!selected || !position) return;
    setRouteLoading(true);
    setRouteError('');
    try {
      const response = await api.get(`/listings/merchants/${selected._id}/walking-route`, { params: position });
      setWalkingRoute(response.data.route);
      setListMode(false);
      setSelected(null);
    } catch (error) {
      setRouteError(error.response?.data?.message || 'Unable to find a walking route right now.');
    } finally {
      setRouteLoading(false);
    }
  };
  const leave = async () => { if (await logout()) navigate('/login'); };
  if (!position && !loading) return <div className="nearby-empty"><h2>Location is needed</h2><p>Allow location access to discover merchants within 10 km.</p><Link to="/consumer/profile">Update my location</Link></div>;

  return <div className="app-shell nearby-page">
    <nav className="border-b bg-white shadow-sm"><div className="mx-auto flex max-w-[1600px] items-center justify-between px-4 py-3 md:px-6"><div className="flex items-center gap-3"><button aria-label="Open navigation" className="text-xl text-slate-600 md:hidden" onClick={() => setMenuOpen((value) => !value)}>{menuOpen ? <FaTimes /> : <FaBars />}</button><div className="flex items-center gap-2.5"><div className="hidden h-9 w-9 items-center justify-center rounded-xl bg-amber-500 text-white shadow-lg shadow-amber-200 sm:flex"><FaLeaf /></div><div><h1 className="text-xl font-extrabold tracking-tight text-slate-900">STOCK2<span className="text-amber-600">SERVE</span></h1><p className="hidden text-xs text-slate-500 md:block">Good to see you, {user?.fullName?.split(' ')[0] || 'there'}</p></div></div></div><div className="hidden items-center gap-2 md:flex">{nav.map((item) => <Link key={item.path} to={item.path} className={`rounded-xl px-4 py-2 text-sm font-semibold ${routeLocation.pathname === item.path ? 'bg-amber-100 text-amber-800' : 'text-slate-600 hover:bg-slate-100'}`}>{item.label}</Link>)}<button onClick={leave} className="ml-2 rounded-xl bg-red-500 px-4 py-2 text-sm font-semibold text-white hover:bg-red-600"><FaSignOutAlt className="mr-2 inline" />Logout</button></div><button aria-label="Log out" onClick={leave} className="rounded-xl bg-red-500 px-3 py-2 text-white md:hidden"><FaSignOutAlt /></button></div>{menuOpen && <div className="border-t px-4 py-2 md:hidden">{nav.map((item) => <Link key={item.path} to={item.path} className="block rounded-xl px-4 py-3 text-sm font-semibold text-slate-600 hover:bg-slate-50" onClick={() => setMenuOpen(false)}>{item.label}</Link>)}</div>}</nav>
    {menuOpen && <div className="nearby-drawer">{nav.map((item) => <Link key={item.path} to={item.path} onClick={() => setMenuOpen(false)}>{item.label}</Link>)}</div>}
    <main className="nearby-map-area">
      <MapContainer center={position ? [position.latitude, position.longitude] : [20.5937, 78.9629]} zoom={13} className="nearby-leaflet" zoomControl={false}><TileLayer attribution="&copy; OpenStreetMap contributors" url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />{position && <><CurrentLocationCamera position={position} requestId={locationRequest} /><Circle center={[position.latitude, position.longitude]} radius={RADIUS_METERS} pathOptions={{ color: '#16A34A', fillColor: '#16A34A', fillOpacity: .05, weight: 1.4, dashArray: '5 8' }} /><Marker position={[position.latitude, position.longitude]} icon={userIcon} interactive={false} /><MerchantMarkers merchants={visible} onSelect={selectMerchant} freshIds={newMerchantIds.current} />{walkingRoute && <><WalkingRouteCamera coordinates={walkingRoute.coordinates} /><Polyline positions={walkingRoute.coordinates.map(([longitude, latitude]) => [latitude, longitude])} pathOptions={{ color: '#2563EB', weight: 5, opacity: .85 }} /></>}</>}</MapContainer>
      <div className="nearby-top-controls"><div className="nearby-search"><FaSearch /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search nearby merchants" /></div><button className="nearby-round" onClick={locationNow} aria-label="Center on my location" title="Center on my location"><FaLocationArrow /></button><button className={`nearby-round ${filtersOpen ? 'selected' : ''}`} onClick={() => setFiltersOpen(!filtersOpen)} aria-label="Filters"><FaFilter /></button><div className="nearby-toggle"><button className={!listMode ? 'active' : ''} onClick={() => setListMode(false)}>Map</button><button className={listMode ? 'active' : ''} onClick={() => setListMode(true)}>List</button></div></div>
      {filtersOpen && <section className="nearby-filters"><label>Distance <b>{maxDistance} km</b><input type="range" min="1" max="10" value={maxDistance} onChange={(event) => setMaxDistance(Number(event.target.value))} /></label><p>Category</p><div>{['all', 'bakery', 'restaurant', 'cafe', 'supermarket'].map((item) => <button key={item} className={category === item ? 'on' : ''} onClick={() => setCategory(item)}>{item === 'all' ? 'All' : categoryLabel(item)}</button>)}</div><p>Food preference</p><div><button className={foodType === 'all' ? 'on' : ''} onClick={() => setFoodType('all')}>All</button><button className={foodType === 'veg' ? 'on' : ''} onClick={() => setFoodType('veg')}>Vegetarian</button><button className={foodType === 'non-veg' ? 'on' : ''} onClick={() => setFoodType('non-veg')}>Non-vegetarian</button></div><label className="nearby-switch">Open now <input type="checkbox" checked={openNow} onChange={(event) => setOpenNow(event.target.checked)} /></label></section>}
      <div className="nearby-legend"><span><i className="plenty" /> Plenty</span><span><i className="limited" /> Limited</span><span><i className="urgent" /> Expiring soon</span><small>{visible.length} merchants within {maxDistance} km</small></div>
      <button className="nearby-locate" onClick={locationNow}><FaMapMarkedAlt /> Current location</button>
      {listMode && <section className="nearby-list"><div className="nearby-list-header"><div><p>Nearby offers</p><h2>Food around you</h2></div><span>{visible.length} found</span></div>{visible.map((merchant) => { const times = travelTimes(merchant.distance); return <button key={merchant._id} onClick={() => { selectMerchant(merchant); setListMode(false); }}><span className={`nearby-list-icon ${markerState(merchant)}`}>🍽</span><span><b>{merchant.name}</b><small>{categoryLabel(merchant.category)} · {merchant.totalMeals} meals · {distanceText(merchant.distance)}</small><small className="nearby-travel-times"><span>🚶 {times.walking} min</span><span>🚲 {times.biking} min</span><span>🚗 {times.driving} min</span></small></span></button>; })}{!visible.length && <p>No merchants match these filters.</p>}</section>}
      {loading && <div className="nearby-loading">Finding nearby merchants…</div>}
      {selected && <><button className="nearby-scrim" onClick={() => { setSelected(null); setWalkingRoute(null); }} aria-label="Close merchant details" /><section className="nearby-sheet"><div className="nearby-handle" /><div className="nearby-sheet-head"><div className={`nearby-logo ${markerState(selected)}`}>{merchantLogo(selected) ? <img src={merchantLogo(selected)} alt="" /> : '🍽'}</div><div><h2>{selected.name}</h2><p>{categoryLabel(selected.category)} · {selected.address || 'Nearby'}</p></div><b className={selected.openingTime ? 'open' : 'closing'}>{selected.openingTime ? 'Open' : 'Closing soon'}</b></div><div className="nearby-meals"><strong>{selected.totalMeals} meals</strong><span>{walkingRoute ? `${Math.round(walkingRoute.distanceMeters)} m walking route` : `${distanceText(selected.distance)} away`}</span></div>{selected.foodItems?.length > 0 && <div className="nearby-food-list" aria-label="Available food items">{selected.foodItems.map((item) => <div className="nearby-food-item" key={`${item.name}-${item.quantity}`}><span>{item.name}</span><strong>{item.quantity}</strong></div>)}</div>}{(() => { const times = travelTimes(walkingRoute ? walkingRoute.distanceMeters / 1000 : selected.distance); if (walkingRoute) times.walking = Math.max(1, Math.ceil(walkingRoute.durationSeconds / 60)); return <div className="nearby-sheet-grid"><span>Pickup <b>{selected.pickupStart || 'Today'} – {selected.pickupEnd || ''}</b></span><span>🚶 Walking time <b>{times.walking} min</b></span><span>🚲 Bike time <b>{times.biking} min</b></span><span>🚗 Car time <b>{times.driving} min</b></span></div>; })()}{routeError && <p className="text-sm text-red-600">{routeError}</p>}<button className="nearby-view-button" onClick={findWalkingRoute} disabled={routeLoading}>{routeLoading ? 'Finding walking route…' : walkingRoute ? 'Refresh walking route' : 'View walking route'}</button><button className="nearby-view-button" onClick={() => navigate('/consumer/feed')}>View Merchant</button></section></>}
    </main>
  </div>;
};
export default NearbyMap;
