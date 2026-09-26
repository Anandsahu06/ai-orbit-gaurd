import React, { useState, useEffect } from 'react';
import { SatelliteObject } from '../types';
import { api } from '../services/api';
import { Search, Satellite, Radio, ExternalLink, Orbit } from 'lucide-react';
import { NavTab } from '../components/Sidebar';

interface SatellitesPageProps {
  setActiveTab: (tab: NavTab) => void;
  onTrackSatellite?: (noradId: string) => void;
}

export const SatellitesPage: React.FC<SatellitesPageProps> = ({ setActiveTab, onTrackSatellite }) => {
  const [objects, setObjects] = useState<SatelliteObject[]>([]);
  const [search, setSearch] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const data = await api.getObjects('', 'PAYLOAD');
      setObjects(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const filtered = objects.filter(
    (o) => o.name.toLowerCase().includes(search.toLowerCase()) || o.norad_id.includes(search)
  );

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Satellite Catalog</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Public orbital data (TLE/SGP4) across all tracked objects
          </p>
        </div>

        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search satellite or NORAD ID..."
            className="bg-white border border-slate-200 rounded-lg pl-9 pr-4 py-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 w-64 shadow-sm"
          />
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-50 text-[11px] uppercase tracking-wider text-slate-500 border-b border-slate-200">
              <tr>
                <th className="py-3 px-4 font-semibold">Object Name</th>
                <th className="py-3 px-4 font-semibold">NORAD ID</th>
                <th className="py-3 px-3 font-semibold">Regime</th>
                <th className="py-3 px-3 font-semibold">Altitude</th>
                <th className="py-3 px-3 font-semibold">Velocity</th>
                <th className="py-3 px-3 font-semibold">Inclination</th>
                <th className="py-3 px-3 font-semibold">Period</th>
                <th className="py-3 px-3 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((sat) => (
                <tr key={sat.norad_id} className="hover:bg-slate-50 transition-colors">
                  <td className="py-3 px-4 font-bold text-slate-900 flex items-center gap-2">
                    <Satellite className="w-3.5 h-3.5 text-blue-600" />
                    <span>{sat.name}</span>
                  </td>
                  <td className="py-3 px-4 font-mono text-slate-600">{sat.norad_id}</td>
                  <td className="py-3 px-3">
                    <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-700 font-semibold text-[11px]">
                      {sat.orbit_type}
                    </span>
                  </td>
                  <td className="py-3 px-3 font-mono font-semibold text-slate-800">{sat.altitude_km.toFixed(1)} km</td>
                  <td className="py-3 px-3 font-mono text-slate-600">{sat.velocity_kms.toFixed(2)} km/s</td>
                  <td className="py-3 px-3 font-mono text-slate-600">{sat.inclination_deg.toFixed(1)}°</td>
                  <td className="py-3 px-3 font-mono text-slate-600">{sat.period_min.toFixed(1)} min</td>
                  <td className="py-3 px-3 text-right">
                    <button
                      onClick={() => {
                        if (onTrackSatellite) {
                          onTrackSatellite(sat.norad_id);
                        } else {
                          setActiveTab('live-orbit');
                        }
                      }}
                      className="px-2.5 py-1 rounded bg-slate-100 hover:bg-orange-50 hover:text-orange-600 text-slate-700 font-semibold text-xs transition-colors"
                    >
                      Track 3D
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
