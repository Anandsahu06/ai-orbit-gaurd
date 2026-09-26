import React, { useState, useEffect } from 'react';
import { CesiumGlobe } from '../components/CesiumGlobe';
import { SatelliteObject, SatelliteTrajectory } from '../types';
import { api } from '../services/api';
import {
  Search,
  Crosshair,
  ShieldAlert,
  ChevronRight,
  Satellite
} from 'lucide-react';
import { NavTab } from '../components/Sidebar';

interface LiveOrbitPageProps {
  setActiveTab: (tab: NavTab) => void;
  onSelectConjunctionForSatellite?: (noradId: string) => void;
  initialNoradId?: string | null;
  initialSearch?: string;
}

export const LiveOrbitPage: React.FC<LiveOrbitPageProps> = ({
  setActiveTab,
  onSelectConjunctionForSatellite,
  initialNoradId,
  initialSearch
}) => {
  const [satellites, setSatellites] = useState<SatelliteObject[]>([]);
  const [selectedSat, setSelectedSat] = useState<SatelliteObject | null>(null);
  const [selectedTrajectory, setSelectedTrajectory] = useState<SatelliteTrajectory | null>(null);
  const [filterType, setFilterType] = useState<string>('ALL');
  const [searchFilter, setSearchFilter] = useState<string>(initialSearch || '');
  const [loading, setLoading] = useState<boolean>(true);
  const [focusTrigger, setFocusTrigger] = useState<number>(0);

  // Load satellite fleet on mount
  useEffect(() => {
    loadSatellites();
  }, [filterType]);

  const loadSatellites = async () => {
    try {
      setLoading(true);
      const data = await api.getObjects(searchFilter, filterType);
      setSatellites(data);

      if (!selectedSat && data.length > 0) {
        // Priority: initialNoradId (Track 3D) > initialSearch (global search) > SAT-104 default
        let target: SatelliteObject | undefined;
        if (initialNoradId) {
          target = data.find((s) => s.norad_id === initialNoradId);
        }
        if (!target && initialSearch && initialSearch.trim().length >= 2) {
          const q = initialSearch.trim().toLowerCase();
          target = data.find((s) => s.name.toLowerCase().includes(q) || s.norad_id.includes(q));
        }
        if (!target) {
          target = data.find((s) => s.name.includes('SAT-104') || s.norad_id === '100104') || data[0];
        }
        handleSelectSatellite(target!);
      }
    } catch (err) {
      console.error('Failed to load satellites:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectSatellite = async (sat: SatelliteObject) => {
    setSelectedSat(sat);
    try {
      const traj = await api.getObjectTrajectory(sat.norad_id);
      setSelectedTrajectory(traj);
    } catch (err) {
      console.warn('Trajectory fetch error:', err);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadSatellites();
  };

  const handleFocusClick = () => {
    setFocusTrigger((prev) => prev + 1);
  };

  return (
    <div className="flex flex-col lg:flex-row gap-5 h-[calc(100vh-6.5rem)] min-h-[500px]">
      {/* Main Content Area */}
      <div className="flex-1 h-full min-h-[380px] flex flex-col">
        {/* Title & Live Metadata */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2.5">
            <h2 className="text-xl font-bold text-slate-900 tracking-tight">LIVE ORBIT</h2>
            <span className="text-xs px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 font-medium">
              SGP4 Propagated
            </span>
          </div>
          <div className="text-xs text-slate-500 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span className="hidden sm:inline">TLE Epoch: SGP4 Propagated</span>
          </div>
        </div>

        {/* Search & Selector Bar above Globe */}
        <div className="mb-3 flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
          <form onSubmit={handleSearchSubmit} className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchFilter}
              onChange={(e) => {
                const val = e.target.value;
                setSearchFilter(val);
                const q = val.trim().toLowerCase();
                if (q.length >= 2) {
                  const match = satellites.find(
                    (s) => s.name.toLowerCase().includes(q) || s.norad_id.includes(q)
                  );
                  if (match) {
                    handleSelectSatellite(match);
                  }
                }
              }}
              placeholder="Search Satellite by Name or NORAD ID (e.g. SAT-104, ISS)..."
              className="w-full bg-white border border-slate-200 rounded-lg pl-9 pr-4 py-1.5 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 font-medium shadow-sm"
            />
          </form>

          {/* Quick Satellite Switcher Dropdown */}
          <div className="w-full sm:w-64">
            <select
              value={selectedSat?.norad_id || ''}
              onChange={(e) => {
                const sat = satellites.find((s) => s.norad_id === e.target.value);
                if (sat) handleSelectSatellite(sat);
              }}
              className="w-full bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-1 focus:ring-orange-500 shadow-sm"
            >
              <option value="" disabled>Choose Satellite...</option>
              {satellites.map((s) => (
                <option key={s.norad_id} value={s.norad_id}>
                  {s.name} ({s.norad_id}) — {s.orbit_type}
                </option>
              ))}
            </select>
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-1 bg-white p-1 rounded-lg border border-slate-200 shadow-sm text-[11px]">
            <button
              onClick={() => setFilterType('ALL')}
              className={`px-2.5 py-1 rounded transition-colors font-medium ${
                filterType === 'ALL' ? 'bg-slate-900 text-white font-semibold' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              All ({satellites.length})
            </button>
            <button
              onClick={() => setFilterType('PAYLOAD')}
              className={`px-2.5 py-1 rounded transition-colors font-medium ${
                filterType === 'PAYLOAD' ? 'bg-slate-900 text-white font-semibold' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Active
            </button>
            <button
              onClick={() => setFilterType('DEBRIS')}
              className={`px-2.5 py-1 rounded transition-colors font-medium ${
                filterType === 'DEBRIS' ? 'bg-slate-900 text-white font-semibold' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Debris
            </button>
          </div>
        </div>

        {/* 3D Cesium Globe Container */}
        <div className="flex-1 w-full rounded-xl overflow-hidden shadow-sm border border-slate-200 relative">
          <CesiumGlobe
            satellites={satellites}
            selectedSatellite={selectedSat}
            onSelectSatellite={handleSelectSatellite}
            selectedTrajectory={selectedTrajectory}
            focusTrigger={focusTrigger}
          />
        </div>
      </div>

      {/* Right Panel: Selected Satellite & Telemetry */}
      <div className="w-full lg:w-80 xl:w-88 flex flex-col gap-4 overflow-y-auto pr-1">
        {/* Selected Satellite Card */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="text-[11px] font-bold text-slate-400 tracking-wider uppercase mb-3">
            Selected Satellite
          </div>

          {selectedSat ? (
            <div className="space-y-4">
              {/* Header: Name & NORAD */}
              <div className="pb-3 border-b border-slate-100 flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-orange-500" />
                    <h3 className="font-bold text-slate-900 text-base">{selectedSat.name}</h3>
                  </div>
                  <span className="text-xs text-slate-500 font-mono">NORAD ID: {selectedSat.norad_id}</span>
                </div>
                <span className="text-xs px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-semibold">
                  {selectedSat.orbit_type}
                </span>
              </div>

              {/* Core Telemetry Metrics: Altitude, Velocity, Latitude, Longitude */}
              <div className="grid grid-cols-2 gap-2.5 text-xs">
                <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                  <span className="text-[10px] text-slate-500 font-medium block">Altitude</span>
                  <span className="text-sm font-bold text-slate-900 font-mono">
                    {selectedSat.altitude_km.toFixed(1)} km
                  </span>
                </div>

                <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                  <span className="text-[10px] text-slate-500 font-medium block">Velocity</span>
                  <span className="text-sm font-bold text-slate-900 font-mono">
                    {selectedSat.velocity_kms.toFixed(2)} km/s
                  </span>
                </div>

                <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                  <span className="text-[10px] text-slate-500 font-medium block">Latitude</span>
                  <span className="text-sm font-bold text-slate-900 font-mono">
                    {selectedSat.latitude >= 0
                      ? `${selectedSat.latitude.toFixed(2)}° N`
                      : `${Math.abs(selectedSat.latitude).toFixed(2)}° S`}
                  </span>
                </div>

                <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                  <span className="text-[10px] text-slate-500 font-medium block">Longitude</span>
                  <span className="text-sm font-bold text-slate-900 font-mono">
                    {selectedSat.longitude >= 0
                      ? `${selectedSat.longitude.toFixed(2)}° E`
                      : `${Math.abs(selectedSat.longitude).toFixed(2)}° W`}
                  </span>
                </div>
              </div>

              {/* Action Buttons: Focus Camera & Inspect Conjunctions */}
              <div className="pt-2 space-y-2">
                <button
                  onClick={handleFocusClick}
                  className="w-full py-2 px-3 rounded-lg bg-orange-600 hover:bg-orange-700 text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors shadow-sm"
                >
                  <Crosshair className="w-4 h-4" />
                  <span>Focus Camera</span>
                </button>

                <button
                  onClick={() => {
                    if (onSelectConjunctionForSatellite) {
                      onSelectConjunctionForSatellite(selectedSat.norad_id);
                    }
                    setActiveTab('conjunctions');
                  }}
                  className="w-full py-2 px-3 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors shadow-sm"
                >
                  <ShieldAlert className="w-3.5 h-3.5 text-orange-400" />
                  <span>Inspect Conjunctions</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="py-8 text-center text-xs text-slate-400">
              Select a satellite to view orbital data.
            </div>
          )}
        </div>

        {/* Fleet Summary Card */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-3">
          <div className="text-[11px] font-bold text-slate-400 tracking-wider uppercase">
            Fleet Status
          </div>

          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <span className="text-xs text-slate-500 block">Active Ephemeris</span>
              <span className="text-lg font-bold text-slate-900">{satellites.length} Objects</span>
            </div>
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <Satellite className="w-4 h-4" />
            </div>
          </div>

          {/* Active Conjunctions shortcut */}
          <div
            onClick={() => setActiveTab('conjunctions')}
            className="bg-orange-50 border border-orange-200/80 rounded-lg p-3 flex items-center justify-between cursor-pointer hover:bg-orange-100/70 transition-colors"
          >
            <div>
              <span className="text-[11px] font-semibold text-orange-900 block">Active Conjunctions</span>
              <span className="text-lg font-black text-orange-600">8 Screened</span>
            </div>
            <div className="w-7 h-7 rounded-full bg-orange-200/70 flex items-center justify-center text-orange-700">
              <ChevronRight className="w-4 h-4" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
