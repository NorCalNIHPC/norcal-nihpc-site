// Coalition map: medical schools + partner undergraduate campuses.
// Residency programs will be added as a third layer once that list is provided.

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

function initCoalitionMap() {
  const mapEl = document.getElementById('coalitionMap');
  if (!mapEl || typeof L === 'undefined') return;

  const map = L.map('coalitionMap', { scrollWheelZoom: false }).setView([38.6, -121.7], 6);

  L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
    attribution: '&copy; OpenStreetMap contributors &copy; CARTO',
    maxZoom: 19,
  }).addTo(map);

  const medIcon = makeDivIcon('#0F3D40');
  const campusIcon = makeDivIcon('#C98A3B');
  const residencyIcon = makeDivIcon('#4FA3AE');

  medicalSchools.forEach(s => {
    L.marker([s.lat, s.lng], { icon: medIcon })
      .addTo(map)
      .bindPopup(`<div class="map-pin-label">${s.name}</div><div style="font-size:0.8rem;color:#4a6668;">${s.city} · Member medical school</div>`);
  });

  undergradCampuses.forEach(c => {
    L.marker([c.lat, c.lng], { icon: campusIcon })
      .addTo(map)
      .bindPopup(`<div class="map-pin-label">${c.name}</div><div style="font-size:0.8rem;color:#4a6668;">Partner undergraduate campus</div>`);
  });

  residencyPrograms.forEach(r => {
    L.marker([r.lat, r.lng], { icon: residencyIcon })
      .addTo(map)
      .bindPopup(`<div class="map-pin-label">${r.name}</div><div style="font-size:0.8rem;color:#4a6668;">${r.city || ''} · Residency program</div>`);
  });

  // Re-enable scroll zoom once the user clicks into the map
  map.on('focus', () => map.scrollWheelZoom.enable());
  map.on('blur', () => map.scrollWheelZoom.disable());
}

document.addEventListener('DOMContentLoaded', initCoalitionMap);
