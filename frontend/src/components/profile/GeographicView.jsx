import React, { useState, useEffect, useMemo } from 'react';
import { MapPin, Globe, Map as MapIcon, ChevronDown, Search, Crosshair, Bookmark, AlertCircle, Info } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';

// Complete list of all 29+ Indian states/UTs for the selector
const ALL_STATES = [
  "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh", 
  "Goa", "Gujarat", "Haryana", "Himachal Pradesh", "Jharkhand", 
  "Karnataka", "Kerala", "Madhya Pradesh", "Maharashtra", "Manipur", 
  "Meghalaya", "Mizoram", "Nagaland", "Odisha", "Punjab", 
  "Rajasthan", "Sikkim", "Tamil Nadu", "Telangana", "Tripura", 
  "Uttar Pradesh", "Uttarakhand", "West Bengal", "Delhi", "Delhi NCR",
  "Chandigarh", "Jammu and Kashmir", "Ladakh", "Puducherry"
].sort();

// Fallback coordinates for map navigation
const STATE_COORDS = {
  "Andhra Pradesh": [15.9129, 79.7400],
  "Arunachal Pradesh": [28.2180, 94.7278],
  "Assam": [26.2006, 92.9376],
  "Bihar": [25.0961, 85.3131],
  "Chhattisgarh": [21.2787, 81.8661],
  "Goa": [15.2993, 74.1240],
  "Gujarat": [22.2587, 71.1924],
  "Haryana": [29.0588, 76.0856],
  "Himachal Pradesh": [31.1048, 77.1734],
  "Jharkhand": [23.6102, 85.2799],
  "Karnataka": [15.3173, 75.7139],
  "Kerala": [10.8505, 76.2711],
  "Madhya Pradesh": [22.9734, 78.6569],
  "Maharashtra": [19.7515, 75.7139],
  "Manipur": [24.6637, 93.9063],
  "Meghalaya": [25.4670, 91.3662],
  "Mizoram": [23.1645, 92.9376],
  "Nagaland": [26.1584, 94.5624],
  "Odisha": [20.9517, 85.0985],
  "Punjab": [31.1471, 75.3412],
  "Rajasthan": [27.0238, 74.2179],
  "Sikkim": [27.5330, 88.5122],
  "Tamil Nadu": [11.1271, 78.6569],
  "Telangana": [18.1124, 79.0193],
  "Tripura": [23.9408, 91.9882],
  "Uttar Pradesh": [26.8467, 80.9462],
  "Uttarakhand": [30.0668, 79.0193],
  "West Bengal": [22.9868, 87.8550],
  "Delhi": [28.6139, 77.2090],
  "Delhi NCR": [28.6139, 77.2090],
  "Chandigarh": [30.7333, 76.7794],
  "Jammu and Kashmir": [33.7782, 76.5762],
  "Ladakh": [34.1526, 77.5771],
  "Puducherry": [11.9416, 79.8083]
};

// Custom icons
const defaultIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

const savedIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-orange.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

function MapController({ center, zoom }) {
  const map = useMap();
  useEffect(() => {
    map.flyTo(center, zoom, {
      duration: 1.5,
      easeLinearity: 0.25
    });
  }, [center, zoom, map]);
  return null;
}

export default function GeographicView({ universities = [], savedUniversities = [] }) {
  const [selectedState, setSelectedState] = useState('');
  const [selectedCity, setSelectedCity] = useState('');
  const [mapView, setMapView] = useState({
    center: [20.5937, 78.9629],
    zoom: 4
  });

  // Build State/City map from university data
  const locationData = useMemo(() => {
    const data = {};
    universities.forEach(uni => {
      if (!uni.state) return;
      
      const stateName = uni.state;
      if (!data[stateName]) {
        data[stateName] = {
          center: STATE_COORDS[stateName] || [20.5937, 78.9629],
          points: [],
          cities: {}
        };
      }
      
      if (uni.latitude && uni.longitude) {
        data[stateName].points.push([uni.latitude, uni.longitude]);
      }
      
      if (uni.city) {
        const cityName = uni.city;
        if (!data[stateName].cities[cityName]) {
          data[stateName].cities[cityName] = {
            center: (uni.latitude && uni.longitude) ? [uni.latitude, uni.longitude] : (STATE_COORDS[stateName] || [20.5937, 78.9629]),
            points: []
          };
        }
        if (uni.latitude && uni.longitude) {
          data[stateName].cities[cityName].points.push([uni.latitude, uni.longitude]);
        }
      }
    });

    // Calculate centroid if points exist
    Object.keys(data).forEach(state => {
      const s = data[state];
      if (s.points.length > 0) {
        const avgLat = s.points.reduce((sum, p) => sum + p[0], 0) / s.points.length;
        const avgLng = s.points.reduce((sum, p) => sum + p[1], 0) / s.points.length;
        s.center = [avgLat, avgLng];
      }
      
      Object.keys(s.cities).forEach(city => {
        const c = s.cities[city];
        if (c.points.length > 0) {
          const cLat = c.points.reduce((sum, p) => sum + p[0], 0) / c.points.length;
          const cLng = c.points.reduce((sum, p) => sum + p[1], 0) / c.points.length;
          c.center = [cLat, cLng];
        }
      });
    });

    return data;
  }, [universities]);

  // Group by state for stats
  const stateCounts = universities.reduce((acc, uni) => {
    if (uni.state) acc[uni.state] = (acc[uni.state] || 0) + 1;
    return acc;
  }, {});

  const sortedStates = Object.entries(stateCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);

  const maxCount = Math.max(...Object.values(stateCounts), 1);

  // Handle location selection
  const handleStateChange = (state) => {
    setSelectedState(state);
    setSelectedCity('');
    
    // Check if we have dynamic data for this state
    if (locationData[state]) {
      setMapView({
        center: locationData[state].center,
        zoom: 7
      });
    } else if (STATE_COORDS[state]) {
      // Fallback to static coordinates if no universities exist in this state yet
      setMapView({
        center: STATE_COORDS[state],
        zoom: 7
      });
    }
  };

  const handleCityChange = (city) => {
    setSelectedCity(city);
    if (selectedState && locationData[selectedState]?.cities[city]) {
      setMapView({
        center: locationData[selectedState].cities[city].center,
        zoom: 12
      });
    }
  };

  const resetView = () => {
    setSelectedState('');
    setSelectedCity('');
    setMapView({
      center: [20.5937, 78.9629],
      zoom: 4
    });
  };

  const isSaved = (id) => savedUniversities.some(su => su._id === id);
  const universitiesWithCoords = universities.filter(u => u.latitude && u.longitude);
  const universitiesInSelected = universities.filter(u => 
    (!selectedState || u.state === selectedState) && 
    (!selectedCity || u.city === selectedCity)
  );

  return (
    <div className="space-y-8 pb-10">
      {/* Header section */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <div className="flex items-center gap-2 text-[10px] font-black text-primary uppercase tracking-[0.2em] mb-2">
            <MapIcon className="w-3 h-3" /> Regional Explorer
          </div>
          <h2 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white">Geographic Insights</h2>
          <p className="text-sm text-light-muted font-medium mt-1">
            Exploring <b>{universities.length}</b> institutions across <b>{Object.keys(stateCounts).length}</b> active states.
          </p>
        </div>
        
        {/* State/City Selectors */}
        <div className="flex flex-wrap gap-3">
          <div className="relative">
             <select 
               value={selectedState}
               onChange={(e) => handleStateChange(e.target.value)}
               className="appearance-none bg-white dark:bg-dark-card border border-light-border dark:border-dark-border rounded-xl px-4 py-2.5 pr-10 text-xs font-bold focus:ring-2 focus:ring-primary/20 outline-none transition-all cursor-pointer min-w-[180px]"
             >
               <option value="">All 29+ States</option>
               {ALL_STATES.map(state => (
                 <option key={state} value={state}>
                   {state} {stateCounts[state] ? `(${stateCounts[state]})` : ''}
                 </option>
               ))}
             </select>
             <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-light-muted pointer-events-none" />
          </div>

          <AnimatePresence>
            {selectedState && locationData[selectedState]?.cities && Object.keys(locationData[selectedState].cities).length > 0 && (
              <motion.div 
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                className="relative"
              >
                <select 
                   value={selectedCity}
                   onChange={(e) => handleCityChange(e.target.value)}
                   className="appearance-none bg-white dark:bg-dark-card border border-light-border dark:border-dark-border rounded-xl px-4 py-2.5 pr-10 text-xs font-bold focus:ring-2 focus:ring-primary/20 outline-none transition-all cursor-pointer min-w-[160px]"
                 >
                   <option value="">All Cities</option>
                   {Object.keys(locationData[selectedState].cities).sort().map(city => (
                     <option key={city} value={city}>{city}</option>
                   ))}
                 </select>
                 <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-light-muted pointer-events-none" />
              </motion.div>
            )}
          </AnimatePresence>

          <button 
            onClick={resetView}
            className="p-2.5 bg-primary/10 text-primary rounded-xl hover:bg-primary hover:text-white transition-all shadow-lg shadow-primary/10"
            title="Reset to India View"
          >
            <Crosshair className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Stats Column */}
        <div className="lg:col-span-1 space-y-6">
           <div className="card p-6 bg-gradient-to-br from-primary/5 to-transparent border-primary/10 relative overflow-hidden group">
              <div className="absolute -right-4 -top-4 w-20 h-20 bg-primary/5 rounded-full blur-2xl group-hover:bg-primary/10 transition-colors"></div>
              <p className="text-[10px] font-black uppercase text-primary tracking-widest mb-4 flex items-center gap-2">
                 <Globe className="w-3 h-3" /> Live Data
              </p>
              <div className="space-y-4 relative z-10">
                 <div className="flex justify-between items-end">
                    <span className="text-3xl font-black">{Object.keys(stateCounts).length}</span>
                    <span className="text-[10px] font-bold text-light-muted pb-1 uppercase">Active States</span>
                 </div>
                 <div className="flex justify-between items-end">
                    <span className="text-3xl font-black">{universities.length}</span>
                    <span className="text-[10px] font-bold text-light-muted pb-1 uppercase">Total Nodes</span>
                 </div>
              </div>
           </div>

           <div className="space-y-4 pt-2">
              <h3 className="font-bold text-sm text-light-muted uppercase tracking-wider flex items-center gap-2 px-1">
                 <MapPin className="w-4 h-4 text-primary" /> Top Distributions
              </h3>
              <div className="space-y-3 px-1">
                 {sortedStates.map(([state, count], i) => (
                   <div key={state} className="space-y-1.5">
                      <div className="flex justify-between text-[10px] font-black uppercase">
                        <span>{state}</span>
                        <span className="text-primary font-bold">{count}</span>
                      </div>
                      <div className="h-1.5 w-full bg-light-bg dark:bg-dark-border rounded-full overflow-hidden">
                        <motion.div 
                          initial={{ width: 0 }}
                          animate={{ width: `${(count / maxCount) * 100}%` }}
                          transition={{ duration: 1, delay: i * 0.05 }}
                          className="h-full bg-primary rounded-full shadow-[0_0_8px_rgba(255,107,0,0.3)]" 
                        />
                      </div>
                   </div>
                 ))}
                 {Object.keys(stateCounts).length === 0 && (
                    <p className="text-[10px] text-light-muted italic">No university records found yet.</p>
                 )}
              </div>
           </div>
        </div>

        {/* Map View */}
        <div className="lg:col-span-3 relative h-[550px] rounded-[2.5rem] overflow-hidden border border-light-border dark:border-dark-border shadow-2xl shadow-primary/5 z-0">
           <MapContainer 
             center={mapView.center} 
             zoom={mapView.zoom} 
             scrollWheelZoom={true} 
             className="w-full h-full"
             zoomControl={false}
           >
             <TileLayer
               attribution='&copy; <a href="https://carto.com/attributions">CARTO</a>'
               url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
             />
             
             <MapController center={mapView.center} zoom={mapView.zoom} />

             {universitiesWithCoords.map((uni) => (
               <Marker 
                 key={uni._id} 
                 position={[uni.latitude, uni.longitude]}
                 icon={isSaved(uni._id) ? savedIcon : defaultIcon}
               >
                 <Popup className="custom-popup">
                   <div className="p-2 min-w-[180px]">
                     <div className="flex justify-between items-start mb-1">
                        <h4 className="font-bold text-sm leading-tight flex-1">{uni.name}</h4>
                        {isSaved(uni._id) && <Bookmark className="w-3 h-3 text-primary fill-primary ml-2 shrink-0" />}
                     </div>
                     <p className="text-[10px] text-light-muted flex items-center gap-1 mb-4">
                        <MapPin className="w-3 h-3 text-primary" /> {uni.city}, {uni.state}
                     </p>
                     <Link 
                       to={`/universities/${uni.slug}`} 
                       className="block w-full py-2.5 bg-primary text-white text-[10px] font-black uppercase text-center rounded-xl hover:bg-primary-600 transition-colors shadow-lg shadow-primary/20"
                     >
                       Explore University &rarr;
                     </Link>
                   </div>
                 </Popup>
               </Marker>
             ))}
           </MapContainer>

           {/* Floating Info Overlay */}
           <div className="absolute top-8 left-8 z-[1000] pointer-events-none">
              <motion.div 
                key={selectedCity || selectedState}
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white/80 dark:bg-dark-card/80 backdrop-blur-xl p-5 rounded-3xl border border-white/20 shadow-2xl"
              >
                 <p className="text-[10px] font-black text-primary uppercase tracking-widest mb-1.5 opacity-80">Geographic View</p>
                 <h4 className="text-lg font-black truncate max-w-[200px] tracking-tight">
                    {selectedCity || selectedState || "National Map"}
                 </h4>
                 <div className="flex items-center gap-3 mt-3">
                    <div className="flex items-center gap-1">
                       <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                       <span className="text-[9px] font-bold text-light-muted uppercase">Institutes</span>
                    </div>
                    <div className="flex items-center gap-1">
                       <span className="w-2 h-2 rounded-full bg-orange-500"></span>
                       <span className="text-[9px] font-bold text-light-muted uppercase">Saved</span>
                    </div>
                 </div>
              </motion.div>
           </div>

           {selectedState && !locationData[selectedState] && (
              <div className="absolute inset-0 bg-white/10 dark:bg-black/10 backdrop-blur-[1px] z-[500] flex items-center justify-center pointer-events-none">
                 <div className="bg-white/90 dark:bg-dark-card/90 p-5 rounded-2xl shadow-2xl border border-primary/20 flex items-center gap-3">
                    <Info className="w-5 h-5 text-primary" />
                    <p className="text-xs font-bold">No universities currently listed in {selectedState}.</p>
                 </div>
              </div>
           )}
        </div>
      </div>

      {/* Dynamic Results List */}
      <AnimatePresence mode="wait">
        <motion.div 
          key={selectedState || 'all'}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          className="pt-6"
        >
          <div className="flex items-center gap-4 mb-8">
             <h3 className="text-sm font-black uppercase text-slate-800 dark:text-slate-200 tracking-[0.2em] shrink-0">
                {selectedState ? `Institutions in ${selectedState}` : "Available Institutions"}
             </h3>
             <div className="h-px flex-1 bg-gradient-to-r from-light-border via-light-border to-transparent dark:from-dark-border dark:via-dark-border"></div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-4 gap-5">
            {universitiesInSelected
              .slice(0, 12)
              .map((u, i) => (
              <motion.div 
                key={u._id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.05 }}
                whileHover={{ y: -8 }}
                className={`card p-6 border-l-4 group transition-all duration-300 ${isSaved(u._id) ? 'border-l-primary' : 'border-l-blue-400'}`}
              >
                <div className="flex justify-between items-start mb-3">
                   <div className="w-10 h-10 rounded-2xl bg-light-bg dark:bg-dark-border flex items-center justify-center font-bold text-primary group-hover:bg-primary group-hover:text-white transition-colors">
                      {u.name?.charAt(0)}
                   </div>
                   {isSaved(u._id) && <Bookmark className="w-4 h-4 text-primary fill-primary" />}
                </div>
                <h4 className="font-bold text-sm mb-1 group-hover:text-primary transition-colors line-clamp-1">{u.name}</h4>
                <p className="text-[10px] text-light-muted font-bold flex items-center gap-1 mb-5 uppercase tracking-tighter">
                  <MapPin className="w-3 h-3 text-primary" /> {u.city || "N/A"}, {u.state || "N/A"}
                </p>
                <Link to={`/universities/${u.slug}`} className="text-[10px] font-black text-primary uppercase tracking-[0.1em] hover:tracking-[0.2em] transition-all flex items-center gap-2">
                  View Profile <span className="text-lg leading-none">&rarr;</span>
                </Link>
              </motion.div>
            ))}
            {universitiesInSelected.length === 0 && (
               <div className="col-span-full py-20 text-center bg-light-bg/50 dark:bg-dark-border/20 rounded-[2rem] border-2 border-dashed border-light-border dark:border-dark-border">
                  <Info className="w-8 h-8 text-light-muted mx-auto mb-3" />
                  <p className="text-light-muted italic text-sm">No universities found in {selectedState || "this area"} yet.</p>
               </div>
            )}
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}


