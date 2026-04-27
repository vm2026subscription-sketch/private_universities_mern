import React from 'react';
import { MapPin, Globe, Award, Users, ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';

// Fix Leaflet's default icon path issues in React
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

export default function GeographicView({ universities = [] }) {
  // Group by state
  const stateCounts = universities.reduce((acc, uni) => {
    acc[uni.state] = (acc[uni.state] || 0) + 1;
    return acc;
  }, {});

  const sortedStates = Object.entries(stateCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);

  const maxCount = Math.max(...Object.values(stateCounts), 1);

  // Map center logic
  const validUnis = universities.filter(u => u.latitude && u.longitude);
  const mapCenter = validUnis.length > 0 
    ? [validUnis[0].latitude, validUnis[0].longitude] 
    : [20.5937, 78.9629]; // Default to center of India

  return (
    <div className="space-y-10">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
           <h2 className="text-3xl font-black mb-2 tracking-tight">Geographic Visualization</h2>
           <p className="text-sm text-light-muted font-medium">Explore the geographical distribution of your saved universities.</p>
        </div>
        <div className="flex gap-4">
           <div className="card !p-4 flex items-center gap-3 bg-primary/5 border-primary/10">
              <div className="w-10 h-10 rounded-xl bg-primary text-white flex items-center justify-center shadow-lg shadow-primary/20">
                 <Globe className="w-5 h-5" />
              </div>
              <div>
                 <p className="text-lg font-black leading-none">{Object.keys(stateCounts).length}</p>
                 <p className="text-[10px] font-black uppercase text-light-muted tracking-widest mt-1">States Covered</p>
              </div>
           </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Heatmap List */}
        <div className="lg:col-span-1 space-y-6">
           <h3 className="font-bold text-lg flex items-center gap-2"><MapPin className="w-5 h-5 text-primary" /> State Distribution</h3>
           <div className="space-y-4">
              {sortedStates.length > 0 ? sortedStates.map(([state, count], i) => (
                <motion.div 
                  key={state}
                  initial={{ x: -20, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: i * 0.1 }}
                >
                  <div className="flex justify-between text-xs font-black uppercase mb-2 text-slate-700 dark:text-slate-300">
                    <span>{state}</span>
                    <span className="text-primary">{count} Universities</span>
                  </div>
                  <div className="h-2 w-full bg-light-bg dark:bg-dark-border rounded-full overflow-hidden">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${(count / maxCount) * 100}%` }}
                      transition={{ duration: 1, delay: i * 0.1 }}
                      className="h-full bg-primary rounded-full shadow-[0_0_10px_rgba(255,107,0,0.3)]" 
                    />
                  </div>
                </motion.div>
              )) : (
                 <p className="text-sm text-light-muted italic">Save colleges to see their state distribution here.</p>
              )}
           </div>
        </div>

        {/* Real Interactive Map */}
        <div className="lg:col-span-2 card overflow-hidden border-2 border-primary/10 relative z-0 h-[400px]">
           <MapContainer 
             center={mapCenter} 
             zoom={validUnis.length > 0 ? 5 : 4} 
             scrollWheelZoom={true} 
             className="w-full h-full"
           >
             <TileLayer
               attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
               url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
             />
             {validUnis.map((uni) => (
               <Marker key={uni._id} position={[uni.latitude, uni.longitude]}>
                 <Popup className="rounded-xl">
                   <div className="p-1">
                     <h4 className="font-bold text-sm mb-1">{uni.name}</h4>
                     <p className="text-[10px] text-gray-500 flex items-center gap-1 mb-2"><MapPin className="w-3 h-3" />{uni.city}, {uni.state}</p>
                     <Link to={`/universities/${uni.slug}`} className="text-xs font-bold text-primary hover:underline">View Details &rarr;</Link>
                   </div>
                 </Popup>
               </Marker>
             ))}
           </MapContainer>
           {validUnis.length === 0 && (
              <div className="absolute inset-0 bg-white/80 dark:bg-dark-bg/80 backdrop-blur-sm z-[1000] flex flex-col items-center justify-center p-8 text-center">
                 <MapPin className="w-12 h-12 text-light-muted mb-4 opacity-50" />
                 <h3 className="text-xl font-bold mb-2">No Map Data Available</h3>
                 <p className="text-sm text-light-muted">We don't have exact coordinates for your saved colleges yet, or you haven't saved any.</p>
              </div>
           )}
        </div>
      </div>

      {/* Location Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
         {universities.slice(0, 4).map((u, i) => (
           <motion.div 
             key={i}
             whileHover={{ y: -5 }}
             className="card p-5 group"
           >
              <div className="w-10 h-10 rounded-xl bg-primary-50 dark:bg-dark-border flex items-center justify-center text-primary font-bold mb-4 group-hover:bg-primary group-hover:text-white transition-all">
                 {u.name?.charAt(0)}
              </div>
              <h4 className="font-bold text-sm mb-1 line-clamp-1">{u.name}</h4>
              <p className="text-[10px] text-light-muted font-black uppercase flex items-center gap-1">
                 <MapPin className="w-3 h-3 text-primary" /> {u.city}, {u.state}
              </p>
              <Link to={`/universities/${u.slug}`} className="mt-4 flex items-center gap-1 text-[10px] font-black text-primary uppercase tracking-widest hover:translate-x-1 transition-transform">
                 View Details <ArrowRight className="w-3 h-3" />
              </Link>
           </motion.div>
         ))}
      </div>
    </div>
  );
}

