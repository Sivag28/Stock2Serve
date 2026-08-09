import React, { useMemo, useState } from 'react';
import { FaArrowLeft, FaChevronRight, FaCommentDots, FaTimes, FaUtensils } from 'react-icons/fa';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import './Stock2ServeAssistant.css';

const categories = [
  { id: 'food', icon: '🍱', label: 'Food & Listings', questions: [
    ['nearby-food', 'What food is available nearby?'], ['expiring-food', 'What food is expiring soon?'], ['highest-discount', 'Which food has the highest discount?'], ['availability', 'Is this food item still available?'],
  ] },
  { id: 'find', icon: '🔎', label: 'Find Food', questions: [
    ['vegetarian', 'Find vegetarian food'], ['under-100', 'Find food under ₹100'], ['near-me', 'Show food near me'], ['map', 'Show available food on the map'],
  ] },
  { id: 'claims', icon: '🛒', label: 'Claims', questions: [
    ['how-claim', 'How do I claim food?'], ['active-claims', 'Show my active claims'], ['previous-claims', 'Show my previous claims'], ['claim-status', 'What is my claim status?'],
  ] },
  { id: 'pickup', icon: '🎟️', label: 'Pickup', questions: [
    ['pickup-how', 'How do I collect my food?'], ['pickup-token', 'Show my pickup token'], ['pickup-when', 'When should I collect my food?'], ['token-expired', 'What happens if my token expires?'],
  ] },
  { id: 'expiry', icon: '⏰', label: 'Expiry', questions: [
    ['claim-expiry', 'When does my claim expire?'], ['time-left', 'How much time is left for pickup?'], ['food-expiry', 'What happens when food expires?'], ['reminder', 'Will I receive a reminder?'],
  ] },
  { id: 'pricing', icon: '💰', label: 'Pricing & Discounts', questions: [
    ['pricing', 'How does Stock2Serve pricing work?'], ['discounts', 'How are discounts calculated?'], ['save', 'How much money can I save?'], ['payment', 'How do I pay for food?'],
  ] },
  { id: 'location', icon: '📍', label: 'Location & Map', questions: [
    ['nearby-map', 'How does the nearby map work?'], ['radius', 'What is the search radius?'], ['enable-location', 'How do I enable location?'], ['route', 'How do I view a walking route?'],
  ] },
  { id: 'notifications', icon: '🔔', label: 'Notifications', questions: [
    ['enable-notifications', 'How do I enable notifications?'], ['pickup-reminder', 'Will I get a pickup reminder?'], ['notification-issue', 'Why am I not receiving notifications?'],
  ] },
  { id: 'account', icon: '👤', label: 'Account', questions: [
    ['profile', 'How do I update my profile?'], ['password', 'How do I change my password?'], ['forgot-password', 'I forgot my password'], ['logout', 'How do I log out?'],
  ] },
  { id: 'security', icon: '🔐', label: 'Security', questions: [
    ['security', 'Is my account secure?'], ['jwt', 'What is JWT authentication?'], ['token-security', 'Is my pickup token secure?'],
  ] },
  { id: 'about', icon: '♻️', label: 'About Stock2Serve', questions: [
    ['what-is', 'What is Stock2Serve?'], ['food-waste', 'How does Stock2Serve reduce food waste?'], ['surplus', 'What is surplus food?'],
  ] },
  { id: 'help', icon: '🆘', label: 'Troubleshooting', questions: [
    ['claim-missing', 'My food claim is not showing'], ['location-missing', 'My location is not detected'], ['cannot-claim', 'I cannot claim food'], ['map-loading', 'The map is not loading'],
  ] },
];

const staticAnswers = {
  'how-claim': 'Choose an available food listing, select the quantity, and tap Claim. Once confirmed, your pickup token will appear in My Claims.',
  'pickup-how': 'Open My Claims, show the pickup token to the merchant during the listed pickup window, and the merchant will verify it.',
  'token-expired': 'Expired pickup tokens cannot be verified. Please collect your food within the pickup window shown in My Claims.',
  'food-expiry': 'Expired or unavailable food is removed from the available listings so it cannot be claimed.',
  reminder: 'When notifications are enabled, Stock2Serve can send a pickup reminder before the token expires.',
  pricing: 'Merchants set a discounted price for surplus food. The price shown on the listing is the price for that item before any quantity is multiplied.',
  discounts: 'Discounts are set against the item’s original price to help surplus food find a home before it expires.',
  save: 'Open a listing to compare its original and discounted price. Your savings are the difference between those two prices.',
  payment: 'Check the food listing for its displayed price and complete the claim flow. Your merchant’s pickup instructions will be shown with the claim.',
  'nearby-map': 'The map uses your device location to show nearby merchants with active food listings. It can also provide a walking route when one is available.',
  radius: 'Nearby food and merchants are currently shown within 10 km of your location.',
  'enable-location': 'Allow location permission in your browser or phone settings, then refresh the Find Food or Nearby Map screen.',
  route: 'Open Nearby Map, select a merchant, then use the walking-route option. A route may be unavailable if the mapping service cannot calculate one.',
  'enable-notifications': 'Allow notifications when your browser asks. You can also update that permission later in your browser or phone settings.',
  'pickup-reminder': 'Yes. With notifications enabled, Stock2Serve can remind you when your pickup window is approaching.',
  'notification-issue': 'Check that notifications are allowed for Stock2Serve, your device is online, and battery-saving settings are not blocking your browser.',
  profile: 'Open Profile from the navigation, update your details, and save your changes.',
  password: 'Use Profile to change your password while signed in. If you cannot sign in, use Forgot Password on the login screen.',
  'forgot-password': 'Choose Forgot Password on the login screen and follow the email instructions to reset your password.',
  logout: 'Use the Log out button in the navigation and confirm the prompt.',
  security: 'Your account requires authentication and protected requests use your signed-in session. Never share your password or pickup token.',
  jwt: 'A JWT is a signed session token that lets the app identify you for protected requests without exposing your password.',
  'token-security': 'Each pickup token is unique to a claim. Keep it private and show it only to the merchant at pickup.',
  'what-is': 'Stock2Serve connects consumers with nearby merchants offering surplus food at a discount.',
  'food-waste': 'It helps merchants offer good surplus food before it expires, giving consumers an affordable option and reducing waste.',
  surplus: 'Surplus food is safe, unsold food that a merchant has available in limited quantities before its expiry or pickup deadline.',
  'claim-missing': 'Refresh My Claims and confirm you are signed in to the same consumer account used to claim the item. If it still is not shown, try signing in again.',
  'location-missing': 'Allow location permission in your browser or phone settings. If GPS is unavailable, update the location in your profile and try again.',
  'cannot-claim': 'A listing can only be claimed while it is active, has enough quantity, and has not expired. Refresh the listing and try again.',
  'map-loading': 'Check your connection and location permission, then refresh the Nearby Map. Walking routes may be temporarily unavailable even when the map works.',
};

const currency = (value) => `₹${Number(value || 0).toFixed(0)}`;
const dateTime = (value) => value ? new Date(value).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }) : 'the listed pickup time';

export default function Stock2ServeAssistant() {
  const { user, isAuthenticated, consumerLocation, refreshConsumerLocation } = useAuth();
  const [open, setOpen] = useState(false);
  const [category, setCategory] = useState(null);
  const [answer, setAnswer] = useState(null);
  const [loading, setLoading] = useState(false);
  const selected = useMemo(() => categories.find((item) => item.id === category), [category]);

  const getClaims = async () => (await api.get('/claims/my')).data.claims || [];
  const getNearby = async () => {
    const coordinates = consumerLocation || await refreshConsumerLocation();
    if (!coordinates) throw new Error('Location access is needed to find food nearby. You can enable it in your browser or phone settings.');
    return (await api.get('/listings', { params: coordinates })).data.listings || [];
  };

  const respond = async (id, question) => {
    setAnswer({ question, text: '' });
    setLoading(true);
    try {
      if (['active-claims', 'previous-claims', 'claim-status', 'pickup-token', 'pickup-when', 'claim-expiry', 'time-left'].includes(id)) {
        if (!isAuthenticated || user?.role !== 'consumer') throw new Error('Please sign in as a consumer to view your personal claims.');
        const claims = await getClaims();
        const active = claims.filter((claim) => claim.status === 'claimed');
        const shown = id === 'previous-claims' ? claims.filter((claim) => claim.status !== 'claimed') : active;
        const lines = shown.slice(0, 4).map((claim) => {
          const name = claim.listingId?.foodName || 'Food item';
          if (id === 'pickup-token') return `${name} — pickup token: ${claim.pickupToken}`;
          if (id === 'pickup-when' || id === 'claim-expiry' || id === 'time-left') return `${name} — collect by ${dateTime(claim.tokenExpiresAt || claim.pickupWindowEnd || claim.listingId?.pickupEnd)}`;
          return `${name} — ${claim.status}`;
        });
        setAnswer({ question, text: lines.length ? `${id === 'previous-claims' ? 'Your previous claims:' : `You currently have ${active.length} active claim${active.length === 1 ? '' : 's'}:`}\n${lines.join('\n')}` : id === 'previous-claims' ? 'You do not have any previous claims yet.' : 'You have no active food claims right now.' });
      } else if (['nearby-food', 'expiring-food', 'highest-discount', 'availability', 'vegetarian', 'under-100', 'near-me'].includes(id)) {
        if (!isAuthenticated || user?.role !== 'consumer') throw new Error('Please sign in as a consumer to find nearby food.');
        let listings = await getNearby();
        if (id === 'vegetarian') listings = listings.filter((listing) => /veg/i.test(listing.foodType || '') || /vegetarian/i.test(listing.foodName || ''));
        if (id === 'under-100') listings = listings.filter((listing) => Number(listing.discountedPrice) < 100);
        if (id === 'expiring-food') listings = [...listings].sort((a, b) => new Date(a.expiryTime) - new Date(b.expiryTime));
        if (id === 'highest-discount') listings = [...listings].sort((a, b) => (Number(b.originalPrice) - Number(b.discountedPrice)) - (Number(a.originalPrice) - Number(a.discountedPrice)));
        const lines = listings.slice(0, 4).map((listing) => `${listing.foodName} — ${currency(listing.discountedPrice)} • ${listing.quantity} available${listing.merchantId?.shopName ? ` • ${listing.merchantId.shopName}` : ''}`);
        setAnswer({ question, text: lines.length ? `Here are the available matches near you:\n${lines.join('\n')}` : 'No matching food is available nearby right now. Please check again soon.' });
      } else if (id === 'map') {
        setAnswer({ question, text: 'Open Nearby Map from the navigation to see available merchants and food near you.' });
      } else {
        setAnswer({ question, text: staticAnswers[id] || 'I can help with food availability, claims, pickup, account, and support.' });
      }
    } catch (error) {
      setAnswer({ question, text: error.response?.data?.message || error.message || 'I could not get that information right now. Please try again.' });
    } finally { setLoading(false); }
  };

  const goHome = () => { setCategory(null); setAnswer(null); };
  return <div className="s2s-assistant">
    {open && <section className="s2s-assistant-panel" role="dialog" aria-label="Stock2Serve Assistant">
      <header><div><span className="s2s-assistant-mark"><FaUtensils /></span><div><strong>Stock2Serve Assistant</strong><small>Quick answers, right here</small></div></div><button onClick={() => setOpen(false)} aria-label="Close assistant"><FaTimes /></button></header>
      <div className="s2s-assistant-content">
        {answer ? <><button className="s2s-assistant-back" onClick={() => setAnswer(null)}><FaArrowLeft /> Back to questions</button><div className="s2s-assistant-answer"><p className="s2s-assistant-question">{answer.question}</p>{loading ? <p>Finding the latest information…</p> : <p>{answer.text}</p>}</div></>
          : selected ? <><button className="s2s-assistant-back" onClick={goHome}><FaArrowLeft /> All topics</button><h2>{selected.icon} {selected.label}</h2><p className="s2s-assistant-intro">Choose a question to get a clear answer.</p><div className="s2s-assistant-questions">{selected.questions.map(([id, question]) => <button key={id} onClick={() => respond(id, question)}>{question}<FaChevronRight /></button>)}</div></>
          : <><h2>What would you like help with?</h2><p className="s2s-assistant-intro">Choose a topic—no typing needed.</p><div className="s2s-assistant-categories">{categories.map((item) => <button key={item.id} onClick={() => setCategory(item.id)}><span>{item.icon}</span>{item.label}<FaChevronRight /></button>)}</div></>}
      </div>
    </section>}
    <button className="s2s-assistant-launcher" onClick={() => setOpen((value) => !value)} aria-label={open ? 'Close Stock2Serve Assistant' : 'Open Stock2Serve Assistant'} aria-expanded={open}><FaCommentDots /><span>Help</span></button>
  </div>;
}
