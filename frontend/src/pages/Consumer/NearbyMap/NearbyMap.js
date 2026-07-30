import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Circle, MapContainer, Marker, TileLayer, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { io } from 'socket.io-client';
import { FaBars, FaFilter, FaLocationArrow, FaMapMarkedAlt, FaSearch, FaSignOutAlt, FaTimes } from 'react-icons/fa';
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
const merchantLogo = (merchant) => merchant.profilePhoto ? `${API_URL}${merchant.profilePhoto}` : null;
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

const NearbyMap = () => {
  const { user, logout } = useAuth(); const navigate = useNavigate(); const routeLocation = useLocation();
  const [position, setPosition] = useState(null); const [merchants, setMerchants] = useState([]); const [loading, setLoading] = useState(true); const [selected, setSelected] = useState(null); const [search, setSearch] = useState(''); const [filtersOpen, setFiltersOpen] = useState(false); const [listMode, setListMode] = useState(false); const [menuOpen, setMenuOpen] = useState(false); const [maxDistance, setMaxDistance] = useState(10); const [category, setCategory] = useState('all'); const [foodType, setFoodType] = useState('all'); const [openNow, setOpenNow] = useState(false); const [mapVersion, setMapVersion] = useState(0); const [locationRequest, setLocationRequest] = useState(0); const newMerchantIds = useRef(new Set()); const merchantIds = useRef(new Set());
  const nav = [{ path: '/consumer/feed', label: 'Find food' }, { path: '/consumer/map', label: 'Nearby map' }, { path: '/consumer/claims', label: 'My claims' }, { path: '/consumer/profile', label: 'Profile' }];
  const fetchMerchants = useCallback(async (coordinates) => { if (!coordinates) return; try { const response = await api.get('/listings/merchants', { params: coordinates }); const next = response.data.merchants || []; merchantIds.current = new Set(next.map((merchant) => String(merchant._id))); setMerchants(next); } finally { setLoading(false); } }, []);

  useEffect(() => { let cancelled = false; const fallback = Number.isFinite(Number(user?.latitude)) && Number.isFinite(Number(user?.longitude)) ? { latitude: Number(user.latitude), longitude: Number(user.longitude) } : null; const applyLocation = (next) => { if (cancelled) return; setPosition(next); fetchMerchants(next); }; if (!navigator.geolocation) applyLocation(fallback); else navigator.geolocation.getCurrentPosition(({ coords }) => applyLocation({ latitude: coords.latitude, longitude: coords.longitude }), () => applyLocation(fallback), { enableHighAccuracy: true, timeout: 10000, maximumAge: 300000 }); return () => { cancelled = true; }; }, [fetchMerchants, user]);
  useEffect(() => { if (!position) return undefined; const socket = io(API_URL, { auth: { token: localStorage.getItem('token') }, transports: ['websocket', 'polling'] }); const refresh = (listing) => { const merchantId = String(listing?.merchantId?._id || listing?.merchantId || ''); if (merchantId && !merchantIds.current.has(merchantId)) newMerchantIds.current.add(merchantId); fetchMerchants(position); }; socket.on('listing-created', refresh); socket.on('listing-updated', refresh); socket.on('listing-quantity-updated', () => fetchMerchants(position)); return () => { socket.disconnect(); }; }, [fetchMerchants, position]);
  useEffect(() => { const timer = setInterval(() => setMapVersion((version) => version + 1), 60000); return () => clearInterval(timer); }, []);

  const visible = useMemo(() => merchants.map((merchant) => ({ ...merchant, refreshedAt: mapVersion, distance: haversine(position, merchant), markerStatus: (() => { const minutes = (new Date(merchant.nextExpiry).getTime() - Date.now()) / 60000; return minutes <= 10 ? 'urgent' : merchant.totalMeals <= 8 ? 'limited' : 'plenty'; })() })).filter((merchant) => merchant.distance <= maxDistance && (category === 'all' || merchant.category === category) && (foodType === 'all' || merchant.foodTypes.includes(foodType)) && (!openNow || merchant.openingTime)).filter((merchant) => `${merchant.name} ${merchant.category}`.toLowerCase().includes(search.toLowerCase())).sort((a, b) => a.distance - b.distance), [merchants, position, maxDistance, category, foodType, openNow, search, mapVersion]);
  const locationNow = () => {
    // Centre immediately on the displayed location, then refine it with GPS.
    // This makes both location buttons useful even if the browser delays or
    // declines a new geolocation request.
    setLocationRequest((request) => request + 1);
    navigator.geolocation?.getCurrentPosition(({ coords }) => {
      const next = { latitude: coords.latitude, longitude: coords.longitude };
      setPosition(next);
      setLocationRequest((request) => request + 1);
      fetchMerchants(next);
    });
  };
  const leave = async () => { if (await logout()) navigate('/login'); };
  if (!position && !loading) return <div className="nearby-empty"><h2>Location is needed</h2><p>Allow location access to discover merchants within 10 km.</p><Link to="/consumer/profile">Update my location</Link></div>;

  return <div className="app-shell nearby-page">
    <nav className="nearby-nav"><div className="nearby-brand"><button className="nearby-mobile-menu" onClick={() => setMenuOpen(!menuOpen)}>{menuOpen ? <FaTimes /> : <FaBars />}</button><strong>STOCK2<span>SERVE</span></strong></div><div className="nearby-navlinks">{nav.map((item) => <Link key={item.path} to={item.path} className={routeLocation.pathname === item.path ? 'active' : ''}>{item.label}</Link>)}<button onClick={leave}><FaSignOutAlt /> Logout</button></div></nav>
    {menuOpen && <div className="nearby-drawer">{nav.map((item) => <Link key={item.path} to={item.path} onClick={() => setMenuOpen(false)}>{item.label}</Link>)}</div>}
    <main className="nearby-map-area">
      <MapContainer center={position ? [position.latitude, position.longitude] : [20.5937, 78.9629]} zoom={13} className="nearby-leaflet" zoomControl={false}><TileLayer attribution="&copy; OpenStreetMap contributors" url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />{position && <><CurrentLocationCamera position={position} requestId={locationRequest} /><Circle center={[position.latitude, position.longitude]} radius={RADIUS_METERS} pathOptions={{ color: '#16A34A', fillColor: '#16A34A', fillOpacity: .05, weight: 1.4, dashArray: '5 8' }} /><Marker position={[position.latitude, position.longitude]} icon={userIcon} interactive={false} /><MerchantMarkers merchants={visible} onSelect={setSelected} freshIds={newMerchantIds.current} /></>}</MapContainer>
      <div className="nearby-top-controls"><div className="nearby-search"><FaSearch /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search nearby merchants" /></div><button className="nearby-round" onClick={locationNow} aria-label="Center on my location" title="Center on my location"><FaLocationArrow /></button><button className={`nearby-round ${filtersOpen ? 'selected' : ''}`} onClick={() => setFiltersOpen(!filtersOpen)} aria-label="Filters"><FaFilter /></button><div className="nearby-toggle"><button className={!listMode ? 'active' : ''} onClick={() => setListMode(false)}>Map</button><button className={listMode ? 'active' : ''} onClick={() => setListMode(true)}>List</button></div></div>
      {filtersOpen && <section className="nearby-filters"><label>Distance <b>{maxDistance} km</b><input type="range" min="1" max="10" value={maxDistance} onChange={(event) => setMaxDistance(Number(event.target.value))} /></label><p>Category</p><div>{['all', 'bakery', 'restaurant', 'cafe', 'supermarket'].map((item) => <button key={item} className={category === item ? 'on' : ''} onClick={() => setCategory(item)}>{item === 'all' ? 'All' : categoryLabel(item)}</button>)}</div><p>Food preference</p><div><button className={foodType === 'all' ? 'on' : ''} onClick={() => setFoodType('all')}>All</button><button className={foodType === 'veg' ? 'on' : ''} onClick={() => setFoodType('veg')}>Vegetarian</button><button className={foodType === 'non-veg' ? 'on' : ''} onClick={() => setFoodType('non-veg')}>Non-vegetarian</button></div><label className="nearby-switch">Open now <input type="checkbox" checked={openNow} onChange={(event) => setOpenNow(event.target.checked)} /></label></section>}
      <div className="nearby-legend"><span><i className="plenty" /> Plenty</span><span><i className="limited" /> Limited</span><span><i className="urgent" /> Expiring soon</span><small>{visible.length} merchants within {maxDistance} km</small></div>
      <button className="nearby-locate" onClick={locationNow}><FaMapMarkedAlt /> Current location</button>
      {listMode && <section className="nearby-list">{visible.map((merchant) => <button key={merchant._id} onClick={() => { setSelected(merchant); setListMode(false); }}><span className={`nearby-list-icon ${markerState(merchant)}`}>🍽</span><span><b>{merchant.name}</b><small>{categoryLabel(merchant.category)} · {merchant.totalMeals} meals · {distanceText(merchant.distance)}</small></span><em>{Math.max(1, Math.round(merchant.distance * 12))} min walk</em></button>)}{!visible.length && <p>No merchants match these filters.</p>}</section>}
      {loading && <div className="nearby-loading">Finding nearby merchants…</div>}
      {selected && <><button className="nearby-scrim" onClick={() => setSelected(null)} aria-label="Close merchant details" /><section className="nearby-sheet"><div className="nearby-handle" /><div className="nearby-sheet-head"><div className={`nearby-logo ${markerState(selected)}`}>{merchantLogo(selected) ? <img src={merchantLogo(selected)} alt="" /> : '🍽'}</div><div><h2>{selected.name}</h2><p>{categoryLabel(selected.category)} · {selected.address || 'Nearby'}</p></div><b className={selected.openingTime ? 'open' : 'closing'}>{selected.openingTime ? 'Open' : 'Closing soon'}</b></div><div className="nearby-meals"><strong>{selected.totalMeals} meals</strong><span>{distanceText(selected.distance)} away</span></div><div className="nearby-sheet-grid"><span>Pickup <b>{selected.pickupStart || 'Today'} – {selected.pickupEnd || ''}</b></span><span>Walking time <b>{Math.max(1, Math.round(selected.distance * 12))} min</b></span></div><button className="nearby-view-button" onClick={() => navigate('/consumer/feed')}>View Merchant</button></section></>}
    </main>
  </div>;
};
export default NearbyMap;
