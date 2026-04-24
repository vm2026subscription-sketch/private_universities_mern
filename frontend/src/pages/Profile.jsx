import { useState, useEffect } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { MapPin, LogOut } from 'lucide-react';
import api from '../utils/api';

export default function Profile() {
  const { user, logout } = useAuth();
  const [savedUniversities, setSavedUniversities] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      api.get('/users/saved-universities')
        .then(({ data }) => setSavedUniversities(data.data))
        .catch(() => {})
        .finally(() => setLoading(false));
    }
  }, [user]);

  if (!user) return <Navigate to="/login" replace />;

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 pb-20 md:pb-12">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
           <h1 className="text-3xl font-bold mb-2">Hello, {user.name}!</h1>
           <p className="text-light-muted dark:text-dark-muted">{user.email}</p>
        </div>
        <button onClick={logout} className="btn-outline flex items-center gap-2"><LogOut className="w-4 h-4" /> Logout</button>
      </div>

      <div className="mb-8 card p-6">
        <h2 className="text-xl font-bold mb-4">Saved Universities</h2>
        {loading ? <p>Loading your saved universities...</p> : (
          savedUniversities.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {savedUniversities.map(u => (
                <div key={u._id} className="card p-5">
                  <div className="flex-1 mb-3">
                    <Link to={`/universities/${u.slug}`} className="font-semibold hover:text-primary line-clamp-1">{u.name}</Link>
                    <p className="text-sm text-light-muted flex items-center gap-1 mt-1"><MapPin className="w-3 h-3" />{u.city}, {u.state}</p>
                  </div>
                  <div className="flex gap-2 flex-wrap mb-4">
                    <span className="badge badge-orange">{u.type}</span>
                    {u.nirfRank && <span className="badge badge-blue">#{u.nirfRank}</span>}
                  </div>
                  <Link to={`/universities/${u.slug}`} className="btn-primary w-full text-center block text-sm !py-2">View Details</Link>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-light-muted">You haven't saved any universities yet. Browse and hit the bookmark icon!</p>
          )
        )}
      </div>
    </div>
  );
}
