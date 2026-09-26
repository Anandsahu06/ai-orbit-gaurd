import React, { useState, useEffect } from 'react';
import { SatelliteObject } from '../types';
import { api } from '../services/api';
import { Search, Radar, AlertTriangle, ArrowRight } from 'lucide-react';
import { NavTab } from '../components/Sidebar';

interface DebrisTrackerPageProps {
  setActiveTab: (tab: NavTab) => void;
}

export const DebrisTrackerPage: React.FC<DebrisTrackerPageProps> = ({ setActiveTab }) => {
  const [debris, setDebris] = useState<SatelliteObject[]>([]);
  const [search, setSearch] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const data = await api.getObjects('', 'DEBRIS');
      setDebris(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const filtered = debris.filter(
    (o) => o.name.toLowerCase().includes(search.toLowerCase()) || o.norad_id.includes(search)
  );

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-orange-500 animate-pulse" />
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">Debris Tracker</h1>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Surveillance of fragmentation debris, spent upper stages, and derelict hardware
          </p>
        </div>

        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search debris or NORAD ID..."
            className="bg-white border border-slate-200 rounded-lg pl-9 pr-4 py-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 w-64 shadow-sm"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider block">
            Catalogued Fragments
          </span>
          <span className="text-2xl font-black text-slate-900">{debris.length} Objects</span>
          <div className="text-[11px] text-slate-400 mt-1">High-density LEO regimes screened</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider block">
            Primary Collision Threat
          </span>
          <span className="text-2xl font-black text-orange-600">DEB-27 (LEO)</span>
          <div className="text-[11px] text-slate-400 mt-1">Active encounter with SAT-104</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider block">
            Average Orbital Speed
          </span>
          <span className="text-2xl font-black text-slate-900">7.62 km/s</span>
          <div className="text-[11px] text-slate-400 mt-1">Hypervelocity closing speeds</div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-50 text-[11px] uppercase tracking-wider text-slate-500 border-b border-slate-200">
              <tr>
                <th className="py-3 px-4 font-semibold">Debris Designator</th>
                <th className="py-3 px-4 font-semibold">NORAD ID</th>
                <th className="py-3 px-3 font-semibold">Classification</th>
                <th className="py-3 px-3 font-semibold">Altitude</th>
                <th className="py-3 px-3 font-semibold">Velocity</th>
                <th className="py-3 px-3 font-semibold">Inclination</th>
                <th className="py-3 px-3 font-semibold text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((sat) => (
                <tr key={sat.norad_id} className="hover:bg-slate-50 transition-colors">
                  <td className="py-3 px-4 font-bold text-slate-900 flex items-center gap-2">
                    <Radar className="w-3.5 h-3.5 text-orange-500" />
                    <span>{sat.name}</span>
                  </td>
                  <td className="py-3 px-4 font-mono text-slate-600">{sat.norad_id}</td>
                  <td className="py-3 px-3">
                    <span className="px-2 py-0.5 rounded bg-orange-50 text-orange-700 font-semibold text-[11px]">
                      {sat.status}
                    </span>
                  </td>
                  <td className="py-3 px-3 font-mono font-semibold text-slate-800">{sat.altitude_km.toFixed(1)} km</td>
                  <td className="py-3 px-3 font-mono text-slate-600">{sat.velocity_kms.toFixed(2)} km/s</td>
                  <td className="py-3 px-3 font-mono text-slate-600">{sat.inclination_deg.toFixed(1)}°</td>
                  <td className="py-3 px-3 text-right">
                    <button
                      onClick={() => setActiveTab('conjunctions')}
                      className="px-2.5 py-1 rounded bg-orange-600 hover:bg-orange-500 text-white font-semibold text-xs transition-colors"
                    >
                      Screen Risk
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
