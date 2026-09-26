import React, { useState, useEffect } from 'react';
import { AnalyticsSummary } from '../types';
import { api } from '../services/api';
import { RiskBadge } from '../components/RiskBadge';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend
} from 'recharts';
import {
  BarChart3,
  AlertCircle,
  HelpCircle,
  Clock,
  Radio,
  Layers,
  Activity
} from 'lucide-react';
import { NavTab } from '../components/Sidebar';

interface AnalyticsPageProps {
  setActiveTab: (tab: NavTab) => void;
}

export const AnalyticsPage: React.FC<AnalyticsPageProps> = ({ setActiveTab }) => {
  const [data, setData] = useState<AnalyticsSummary | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    loadAnalytics();
  }, []);

  const loadAnalytics = async () => {
    try {
      setLoading(true);
      const res = await api.getAnalyticsSummary();
      setData(res);
    } catch (err) {
      console.error('Failed to load analytics:', err);
    } finally {
      setLoading(false);
    }
  };

  if (!data) {
    return (
      <div className="flex items-center justify-center h-64 text-slate-400 text-xs">
        Loading analytics dataset...
      </div>
    );
  }

  // Fleet breakdown for donut chart
  const fleetPieData = [
    { name: 'Active Payloads', value: data.fleet_status.active, color: '#2563eb' },
    { name: 'Inactive Satellites', value: data.fleet_status.inactive, color: '#93c5fd' },
    { name: 'Debris & Derelicts', value: data.fleet_status.debris, color: '#f97316' },
  ];

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Title */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">
              Satellite Data &amp; Analytics
            </h1>
            <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-amber-50 border border-amber-200 text-amber-700">
              Prototype Sample Data
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Fleet distribution, risk breakdown, and conjunction screening statistics
          </p>
        </div>
        <span className="text-xs text-slate-500 px-3 py-1 bg-white border border-slate-200 rounded-lg shadow-sm">
          Sample History: 2026 Epoch
        </span>
      </div>

      {/* Top Row: Fleet Status (Donut) & Risk Assessment (Gauge/Card) matching Screen D */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Fleet Status Donut Chart Card (6 Cols) */}
        <div className="lg:col-span-6 bg-white rounded-xl border border-slate-200 p-5 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <h3 className="font-bold text-slate-900 text-sm">Fleet Status</h3>
            <span className="text-xs font-semibold text-slate-500">
              Total: {data.fleet_status.total} Objects
            </span>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-6 py-4">
            <div className="w-48 h-48 relative">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={fleetPieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={75}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {fleetPieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '12px' }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-xl font-black text-slate-900">{data.fleet_status.total}</span>
                <span className="text-[10px] text-slate-400 font-semibold uppercase">Objects</span>
              </div>
            </div>

            {/* Donut Legend */}
            <div className="space-y-2 text-xs">
              {fleetPieData.map((item, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-sm flex-shrink-0" style={{ backgroundColor: item.color }} />
                  <span className="text-slate-600 font-medium">{item.name}:</span>
                  <span className="font-bold text-slate-900 font-mono">{item.value}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 text-[11px] text-slate-400 flex items-center justify-between">
            <span>SGP4 Live Tracked Fleet</span>
            <span>LEO / SSO Constellations</span>
          </div>
        </div>

        {/* Risk Assessment & Score Card matching PDF Screen D (6 Cols) */}
        <div className="lg:col-span-6 bg-white rounded-xl border border-slate-200 p-5 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-orange-600" />
              <h3 className="font-bold text-slate-900 text-sm">Risk Assessment</h3>
            </div>
            <RiskBadge level="HIGH" size="sm" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 py-2 items-center">
            {/* Risk Gauge (82 / 100) from PDF Screen D */}
            <div className="sm:col-span-5 flex flex-col items-center justify-center text-center">
              <div className="relative w-28 h-28 flex items-center justify-center rounded-full border-8 border-orange-500/20 bg-orange-50/40">
                <div>
                  <span className="text-3xl font-black text-slate-900 leading-none">82</span>
                  <span className="text-xs text-slate-500 font-semibold block">/ 100</span>
                </div>
              </div>
              <span className="mt-2 text-xs font-bold px-2.5 py-0.5 rounded bg-orange-100 text-orange-800">
                Orange High
              </span>
            </div>

            {/* "Why is this risky?" Text box matching Screen D */}
            <div className="sm:col-span-7 bg-slate-50 rounded-lg p-3.5 border border-slate-200/80 space-y-2">
              <div className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <HelpCircle className="w-3.5 h-3.5 text-orange-600" />
                <span>Why is this risky?</span>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                Minimum separation of 0.42 km for SAT-104 vs DEB-27 is well below the 1.0 km hard avoidance threshold with closing velocity of 11.84 km/s.
              </p>
              <div className="text-[10px] text-slate-400 italic">
                Explainable ML feature contributions based on physical distance, velocity, and time to TCA.
              </div>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
            <span className="text-slate-500">Screening window: 48 hours</span>
            <button
              onClick={() => setActiveTab('conjunctions')}
              className="font-semibold text-orange-600 hover:text-orange-700 text-xs"
            >
              Inspect Conjunctions →
            </button>
          </div>
        </div>
      </div>

      {/* Bottom Row: Anomaly Detection, Orbits Per Period, Critical Events matching Screen D */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Anomaly Detection Bar Chart */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-100">
            <h3 className="font-bold text-slate-900 text-xs uppercase tracking-wider">Anomaly Detection</h3>
            <span className="text-[11px] text-slate-400">Timeline delta</span>
          </div>
          <div className="h-44 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.anomaly_timeline} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f8fafc" vertical={false} />
                <XAxis dataKey="time" tick={{ fontSize: 10, fill: '#64748b' }} axisLine={{ stroke: '#e2e8f0' }} />
                <YAxis tick={{ fontSize: 10, fill: '#64748b' }} axisLine={{ stroke: '#e2e8f0' }} />
                <Tooltip
                  formatter={(val: any) => [`${val} km`, 'Separation']}
                  contentStyle={{ backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '11px' }}
                />
                <Bar dataKey="delta_km" fill="#60a5fa" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Orbits Per Period Line Chart */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-100">
            <h3 className="font-bold text-slate-900 text-xs uppercase tracking-wider">Orbits Per Period</h3>
            <span className="text-[11px] text-slate-400">Monthly</span>
          </div>
          <div className="h-44 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data.orbits_per_period} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f8fafc" vertical={false} />
                <XAxis dataKey="period" tick={{ fontSize: 10, fill: '#64748b' }} axisLine={{ stroke: '#e2e8f0' }} />
                <YAxis tick={{ fontSize: 10, fill: '#64748b' }} axisLine={{ stroke: '#e2e8f0' }} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '11px' }}
                />
                <Line type="monotone" dataKey="count" stroke="#2563eb" strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Critical Events List matching PDF Screen D */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-100">
              <h3 className="font-bold text-slate-900 text-xs uppercase tracking-wider">Critical Events</h3>
              <span className="text-[11px] font-semibold text-rose-600">Active Alerts</span>
            </div>

            <div className="space-y-2.5">
              {data.critical_events.map((ev) => (
                <div
                  key={ev.id}
                  onClick={() => setActiveTab('conjunctions')}
                  className="p-2.5 rounded-lg border border-slate-100 bg-slate-50/70 hover:bg-orange-50/50 hover:border-orange-200 transition-colors cursor-pointer"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-slate-900 text-xs truncate max-w-[170px]">{ev.title}</span>
                    <RiskBadge level={ev.risk_level} size="sm" />
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-slate-500">
                    <span>Miss: {ev.miss_distance}</span>
                    <span>{ev.time_ago}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 text-[11px] text-slate-400 text-center">
            Prototype sample history
          </div>
        </div>
      </div>
    </div>
  );
};
