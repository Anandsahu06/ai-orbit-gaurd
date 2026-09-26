import React, { useState, useEffect } from 'react';
import {
  Orbit,
  AlertTriangle,
  Sliders,
  ChevronRight,
  Clock,
  Radio,
  ExternalLink,
  ShieldCheck
} from 'lucide-react';
import { NavTab } from '../components/Sidebar';
import { api } from '../services/api';
import { DashboardSummary, ConjunctionEvent } from '../types';
import { RiskBadge } from '../components/RiskBadge';

interface HomePageProps {
  setActiveTab: (tab: NavTab) => void;
  onSelectConjunction?: (conjId: string) => void;
}

export const HomePage: React.FC<HomePageProps> = ({ setActiveTab, onSelectConjunction }) => {
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [recentEvents, setRecentEvents] = useState<ConjunctionEvent[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const [dashData, conjData] = await Promise.all([
          api.getDashboardSummary(),
          api.getConjunctions()
        ]);
        setSummary(dashData);
        setRecentEvents(conjData.slice(0, 4));
      } catch (err) {
        console.error('Failed to load dashboard summary:', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  return (
    <div className="space-y-5 max-w-6xl mx-auto pb-8">
      {/* Compact Operational Header */}
      <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-slate-900 tracking-tight">ORBITALGUARD AI</h1>
              <span className="text-[11px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                Prototype v1.0
              </span>
            </div>
            <div className="text-xs font-semibold text-slate-600 mt-0.5">
              AI-Assisted Space Traffic Management Platform
            </div>
            <p className="text-xs text-slate-500 mt-1 max-w-2xl leading-relaxed">
              Analyze satellite trajectories, identify potential close approaches, assess risk, and simulate hypothetical avoidance scenarios.
            </p>
          </div>

          {/* Quick Primary Actions */}
          <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
            <button
              onClick={() => setActiveTab('live-orbit')}
              className="px-3.5 py-1.5 bg-orange-600 hover:bg-orange-700 text-white rounded text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-xs"
            >
              <Orbit className="w-3.5 h-3.5" />
              <span>Live Orbit</span>
            </button>
            <button
              onClick={() => setActiveTab('conjunctions')}
              className="px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-xs"
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>Conjunctions</span>
            </button>
            <button
              onClick={() => setActiveTab('simulation')}
              className="px-3.5 py-1.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-800 rounded text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-xs"
            >
              <Sliders className="w-3.5 h-3.5 text-slate-600" />
              <span>Simulation</span>
            </button>
          </div>
        </div>
      </div>

      {/* 4 Simple KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-xs">
          <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
            Tracked Objects
          </div>
          <div className="text-2xl font-bold text-slate-900 mt-1">
            {summary ? summary.tracked_objects_count : '33'}
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">
            Public TLE Dataset (CelesTrak)
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-xs">
          <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
            Potential Conjunctions
          </div>
          <div className="text-2xl font-bold text-slate-900 mt-1">
            {summary ? summary.active_conjunctions_count : '8'}
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">
            48h Screening Horizon
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-xs">
          <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
            High-Risk Events
          </div>
          <div className="text-2xl font-bold text-orange-600 mt-1">
            {summary ? summary.high_risk_count : '5'}
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">
            Score ≥ 60 / 100
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-xs">
          <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
            Last Data Update
          </div>
          <div className="text-sm font-bold text-slate-800 mt-2 font-mono">
            {loading ? 'Loading...' : summary ? (summary.last_updated.split(' ')[1] ? summary.last_updated.split(' ')[1] + ' UTC' : summary.last_updated) : '—'}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            SGP4 Propagation
          </div>
        </div>
      </div>

      {/* Recent Conjunctions Table */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-3.5 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              Screened Conjunction Events
            </h2>
            <span className="text-[11px] text-slate-400">| SGP4 Ephemeris Screening</span>
          </div>
          <button
            onClick={() => setActiveTab('conjunctions')}
            className="text-xs font-semibold text-orange-600 hover:text-orange-700 flex items-center gap-1"
          >
            <span>View All ({recentEvents.length})</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-50 text-[10px] uppercase tracking-wider text-slate-500 border-b border-slate-200 font-semibold">
              <tr>
                <th className="py-2.5 px-4">Primary Object</th>
                <th className="py-2.5 px-4">Secondary Object</th>
                <th className="py-2.5 px-3">TCA (UTC)</th>
                <th className="py-2.5 px-3">Miss Distance</th>
                <th className="py-2.5 px-3">Relative Velocity</th>
                <th className="py-2.5 px-3">Risk Assessment</th>
                <th className="py-2.5 px-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {recentEvents.map((ev) => (
                <tr key={ev.id} className="hover:bg-slate-50 transition-colors">
                  <td className="py-2.5 px-4 font-bold text-slate-900">
                    <div>{ev.primary_name}</div>
                    <div className="text-[10px] font-normal text-slate-400">ID: {ev.primary_id}</div>
                  </td>
                  <td className="py-2.5 px-4 font-medium text-slate-800">
                    <div>{ev.secondary_name}</div>
                    <div className="text-[10px] text-slate-400">ID: {ev.secondary_id}</div>
                  </td>
                  <td className="py-2.5 px-3 font-mono text-[11px] text-slate-600 whitespace-nowrap">
                    {ev.tca}
                  </td>
                  <td className="py-2.5 px-3 font-mono font-bold text-slate-900">
                    {ev.miss_distance_km.toFixed(2)} km
                  </td>
                  <td className="py-2.5 px-3 font-mono text-slate-600">
                    {ev.relative_velocity_kms.toFixed(2)} km/s
                  </td>
                  <td className="py-2.5 px-3">
                    <div className="flex items-center gap-1.5">
                      <RiskBadge level={ev.risk_level} size="sm" />
                      <span className="text-[10px] font-mono text-slate-500">
                        ({Math.round(ev.risk_score)}/100)
                      </span>
                    </div>
                  </td>
                  <td className="py-2.5 px-3 text-right">
                    <button
                      onClick={() => {
                        if (onSelectConjunction) onSelectConjunction(ev.id);
                        setActiveTab('conjunctions');
                      }}
                      className="px-2 py-1 rounded bg-slate-100 hover:bg-orange-50 hover:text-orange-600 text-slate-700 font-semibold text-xs transition-colors"
                    >
                      Inspect
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Clean Bottom Disclaimer */}
      <div className="text-[11px] text-slate-400 text-center pt-2">
        OrbitalGuard AI is a decision-support prototype. Calculations are for simulation and research demonstration purposes.
      </div>
    </div>
  );
};
