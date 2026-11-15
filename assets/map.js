// Coalition map: medical schools + partner undergraduate campuses.
// Extra pins (residency programs, new campuses...) come from a Google Sheet tab published as CSV.
// Paste the tab's published CSV link in MAP_CSV_URL and the pin-submission form link in MAP_FORM_URL.
// Tab headers: Name, Type, City, Latitude, Longitude, Website
const MAP_CSV_URL = "";
const MAP_FORM_URL = "https://docs.google.com/forms/d/e/1FAIpQLSeViwsa0ISZTvuwyJgZq69n_4NYvrBFNYjsoAlnoxjCMLGmEg/viewform?usp=header";

const medicalSchools = [
  { name: "UC Davis School of Medicine", city: "Sacramento, CA", lat: 38.5449, lng: -121.4636 },
  { name: "Stanford School of Medicine", city: "Stanford, CA", lat: 37.4331, lng: -122.1719 },
  { name: "UCSF School of Medicine", city: "San Francisco, CA", lat: 37.7629, lng: -122.4577 },
];

const undergradCampuses = [
  { name: "Stanford University", lat: 37.4275, lng: -122.1697 },
  { name: "San Jose State University", lat: 37.3352, lng: -121.8811 },
  { name: "Santa Clara University", lat: 37.3496, lng: -121.9390 },
  { name: "UC Santa Cruz", lat: 36.9914, lng: -122.0609 },
  { name: "CSU Monterey Bay", lat: 36.6524, lng: -121.7959 },
  { name: "UC Berkeley", lat: 37.8719, lng: -122.2585 },
  { name: "San Francisco State University", lat: 37.7241, lng: -122.4790 },
  { name: "University of San Francisco", lat: 37.7766, lng: -122.4508 },
  { name: "CSU East Bay", lat: 37.6577, lng: -122.0578 },
  { name: "Sonoma State University", lat: 38.3399, lng: -122.6693 },
  { name: "UC Merced", lat: 37.3661, lng: -120.4256 },
  { name: "CSU Fresno", lat: 36.8125, lng: -119.7462 },
  { name: "Cal Poly Humboldt", lat: 40.8756, lng: -124.0784 },
  { name: "UC Davis", lat: 38.5382, lng: -121.7617 },
  { name: "Sacramento State", lat: 38.5610, lng: -121.4234 },
  { name: "Chico State", lat: 39.7285, lng: -121.8375 },
  { name: "CSU Stanislaus", lat: 37.5228, lng: -120.8562 },
];

// Residency programs — empty for now. Add entries like:
// { name: "Example Family Medicine Residency", city: "City, CA", lat: 0, lng: 0 }
const residencyPrograms = [];

function makeDivIcon(color) {
  return L.divIcon({
    className: '',
    html: `<div style="width:16px;height:16px;border-radius:50%;background:${color};border:2px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,0.35);"></div>`,
    iconSize: [16, 16],
    iconAnchor: [8, 8],
    popupAnchor: [0, -8],
  });
}

const escMap = s => String(s || '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
function parseMapCSV(t) {
  const rows = []; let r = [], c = '', q = false;
  for (let i = 0; i < t.length; i++) {
    const ch = t[i];
    if (q) { if (ch === '"') { if (t[i + 1] === '"') { c += '"'; i++; } else q = false; } else c += ch; }
    else if (ch === '"') q = true;
    else if (ch === ',') { r.push(c); c = ''; }
    else if (ch === '\n' || ch === '\r') { if (ch === '\r' && t[i + 1] === '\n') i++; r.push(c); rows.push(r); r = []; c = ''; }
    else c += ch;
  }
  if (c || r.length) { r.push(c); rows.push(r); }
  return rows;
}
// Residency first so "Residency program" is never mistaken for "medical"
const pinKind = s => { s = (s || '').toLowerCase(); return /high/.test(s) ? 'highschool' : /resid/.test(s) ? 'residency' : /med/.test(s) ? 'med' : 'campus'; };
const pinLabel = { med: 'Medical school', campus: 'Undergraduate campus', residency: 'Residency program', highschool: 'High school' };

async function loadSubmittedPins(map, icons, existing) {
  if (!MAP_CSV_URL) return;
  try {
    const rows = parseMapCSV(await (await fetch(MAP_CSV_URL, { cache: 'no-store' })).text());
    const head = rows.shift().map(h => h.toLowerCase().replace(/[^a-z]/g, ''));
    rows.forEach(r => {
      const o = {}; head.forEach((h, i) => o[h] = (r[i] || '').trim());
      const lat = parseFloat(o.latitude), lng = parseFloat(o.longitude);
      if (!o.name || isNaN(lat) || isNaN(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) return;
      if (existing.has(o.name.toLowerCase())) return;           // already on the map
      const kind = pinKind(o.type);
      const site = /^https?:\/\//i.test(o.website) ? `<div style="margin-top:4px;"><a href="${escMap(o.website)}" target="_blank" rel="noopener">Website</a></div>` : '';
      const legend = document.getElementById('legend-' + kind); if (legend) legend.hidden = false;   // show a legend entry only once a pin of that type exists
      L.marker([lat, lng], { icon: icons[kind] }).addTo(map)
        .bindPopup(`<div class="map-pin-label">${escMap(o.name)}</div><div style="font-size:0.8rem;color:#4d6657;">${o.city ? escMap(o.city) + ' · ' : ''}${pinLabel[kind]}</div>${site}`);
    });
  } catch (e) { console.error('Could not load map pins sheet', e); }
}

function initCoalitionMap() {
  const share = document.getElementById('mapShare');
  if (share && MAP_FORM_URL) { share.href = MAP_FORM_URL; share.hidden = false; }
  const mapEl = document.getElementById('coalitionMap');
  if (!mapEl || typeof L === 'undefined') return;

  const map = L.map('coalitionMap', { scrollWheelZoom: false }).setView([38.6, -121.7], 6);

  // CARTO now requires a free API key (request one at https://www.carto.com/basemaps/apikey/ and paste it here).
  // Until a key is set, the map falls back to OpenStreetMap's standard tiles, which need no key.
  const CARTO_KEY = "";
  const tiles = CARTO_KEY
    ? { url: 'https://basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png?key=' + CARTO_KEY,
        attribution: '&copy; OpenStreetMap contributors &copy; CARTO' }
    : { url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
        attribution: '&copy; OpenStreetMap contributors' };
  L.tileLayer(tiles.url, { attribution: tiles.attribution, maxZoom: 19 }).addTo(map);

  const medIcon = makeDivIcon('#173F2E');
  const campusIcon = makeDivIcon('#C9962F');
  const residencyIcon = makeDivIcon('#7FB08E');

  medicalSchools.forEach(s => {
    L.marker([s.lat, s.lng], { icon: medIcon })
      .addTo(map)
      .bindPopup(`<div class="map-pin-label">${s.name}</div><div style="font-size:0.8rem;color:#4d6657;">${s.city} · Member medical school</div>`);
  });

  undergradCampuses.forEach(c => {
    L.marker([c.lat, c.lng], { icon: campusIcon })
      .addTo(map)
      .bindPopup(`<div class="map-pin-label">${c.name}</div><div style="font-size:0.8rem;color:#4d6657;">Partner undergraduate campus</div>`);
  });

  residencyPrograms.forEach(r => {
    L.marker([r.lat, r.lng], { icon: residencyIcon })
      .addTo(map)
      .bindPopup(`<div class="map-pin-label">${r.name}</div><div style="font-size:0.8rem;color:#4d6657;">${r.city || ''} · Residency program</div>`);
  });

  const existing = new Set([...medicalSchools, ...undergradCampuses, ...residencyPrograms].map(p => p.name.toLowerCase()));
  loadSubmittedPins(map, { med: medIcon, campus: campusIcon, residency: residencyIcon, highschool: makeDivIcon('#4A7FA7') }, existing);

  // Re-enable scroll zoom once the user clicks into the map
  map.on('focus', () => map.scrollWheelZoom.enable());
  map.on('blur', () => map.scrollWheelZoom.disable());
}

document.addEventListener('DOMContentLoaded', initCoalitionMap);
