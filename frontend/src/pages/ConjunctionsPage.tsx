import React, { useState, useEffect } from 'react';
import { ConjunctionEvent, ManeuverSimulationResponse } from '../types';
import { api } from '../services/api';
import { RiskBadge } from '../components/RiskBadge';
import { ExplainabilityCard } from '../components/ExplainabilityCard';
import { ScenarioComparisonChart } from '../components/ScenarioComparisonChart';
import {
  ArrowRight,
  Filter,
  Search,
  Sliders,
  ShieldAlert,
  Play,
  CheckCircle2,
  RefreshCw
} from 'lucide-react';
import { NavTab } from '../components/Sidebar';

interface ConjunctionsPageProps {
  setActiveTab: (tab: NavTab) => void;
  preSelectedNoradId?: string | null;
  onOpenFullSimulation?: (conjId: string) => void;
}

export const ConjunctionsPage: React.FC<ConjunctionsPageProps> = ({
  setActiveTab,
  preSelectedNoradId,
  onOpenFullSimulation
}) => {
  const [conjunctions, setConjunctions] = useState<ConjunctionEvent[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<ConjunctionEvent | null>(null);
  const [riskFilter, setRiskFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);

  // Maneuver quick inputs matching PDF Screen C
  const [deltaVMs, setDeltaVMs] = useState<number>(40.0);
  const [direction, setDirection] = useState<string>('RETROGRADE');
  const [timingHours, setTimingHours] = useState<number>(6.0);
  const [simResult, setSimResult] = useState<ManeuverSimulationResponse | null>(null);
  const [simulating, setSimulating] = useState<boolean>(false);
  const [simBtnState, setSimBtnState] = useState<'idle' | 'calculating' | 'done' | 'error'>('idle');
  const [simError, setSimError] = useState<string | null>(null);

  useEffect(() => {
    loadConjunctions();
  }, [riskFilter]);

  const loadConjunctions = async () => {
    try {
      setLoading(true);
      const data = await api.getConjunctions(riskFilter, searchQuery);
      setConjunctions(data);

      // Select matching pre-selected NORAD id or SAT-104 by default
      if (data.length > 0) {
        let defaultEvent = data[0];
        if (preSelectedNoradId) {
          const match = data.find(
            (c) => c.primary_id === preSelectedNoradId || c.secondary_id === preSelectedNoradId
          );
          if (match) defaultEvent = match;
        }
        handleSelectEvent(defaultEvent);
      }
    } catch (err) {
      console.error('Failed to load conjunctions:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectEvent = async (event: ConjunctionEvent) => {
    setSelectedEvent(event);
    try {
      setSimulating(true);
      const sim = await api.simulateManeuver(event.id, deltaVMs, direction, timingHours);
      setSimResult(sim);
    } catch (err) {
      console.error('Failed to run default simulation:', err);
    } finally {
      setSimulating(false);
    }
  };

  const handleSimulate = (conjId: string) => {
    if (onOpenFullSimulation) {
      onOpenFullSimulation(conjId);
    } else {
      setActiveTab('simulation');
    }
  };

  const handleRunCustomSimulation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEvent) return;
    if (deltaVMs < 5 || deltaVMs > 100) {
      setSimError('Delta-V must be between 5 and 100 m/s.');
      return;
    }
    if (timingHours < 1 || timingHours > 24) {
      setSimError('Lead time must be between 1 and 24 hours.');
      return;
    }
    try {
      setSimulating(true);
      setSimBtnState('calculating');
      setSimError(null);
      const sim = await api.simulateManeuver(selectedEvent.id, deltaVMs, direction, timingHours);
      setSimResult(sim);
      setSimBtnState('done');
      setTimeout(() => setSimBtnState('idle'), 2000);
    } catch (err) {
      console.error('Simulation error:', err);
      setSimError('Unable to calculate. Please retry.');
      setSimBtnState('error');
      setTimeout(() => setSimBtnState('idle'), 3000);
    } finally {
      setSimulating(false);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Top Header matching PDF Screen C */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              Conjunction Events & Avoidance
            </h1>
            <span className="px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 text-xs font-semibold">
              Screening Window: 48 hours
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Physics-based close approach screening with AI-assisted risk prioritization
          </p>
        </div>

        {/* Top Right "Simulation ->" Button matching Screen C */}
        <button
          onClick={() => {
            if (selectedEvent && onOpenFullSimulation) {
              onOpenFullSimulation(selectedEvent.id);
            }
            setActiveTab('simulation');
          }}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-orange-600 hover:bg-orange-500 text-white font-semibold text-xs shadow-sm transition-all"
        >
          <Sliders className="w-4 h-4" />
          <span>Full Avoidance Simulation</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Main Grid: Left Table, Right Simulation Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Conjunction Events Table (Left 7 Cols) */}
        <div className="lg:col-span-7 bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col overflow-hidden">
          {/* Table Filters Toolbar */}
          <div className="p-4 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3">
            {/* Risk Filters Tabs */}
            <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-lg text-xs font-medium">
              {['ALL', 'CRITICAL', 'HIGH', 'MEDIUM', 'LOW'].map((lvl) => (
                <button
                  key={lvl}
                  onClick={() => setRiskFilter(lvl)}
                  className={`px-2.5 py-1 rounded-md transition-colors ${
                    riskFilter === lvl
                      ? 'bg-white text-slate-900 shadow-sm font-semibold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {lvl}
                </button>
              ))}
            </div>

            {/* Quick Search */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && loadConjunctions()}
                placeholder="Filter objects..."
                className="bg-slate-50 border border-slate-200 rounded-lg pl-8 pr-3 py-1 text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-orange-500 w-36 sm:w-44"
              />
            </div>
          </div>
          {/* Demo event note */}
          <div className="px-4 py-2 border-b border-slate-100 bg-amber-50/60 text-[11px] text-amber-800">
            <span className="font-semibold">SAT-104 vs DEB-27</span> is a synthetic event for prototype demonstration.
            {' '}All other events are SGP4-screened potential close approaches.
          </div>

          {/* Table Data matching Screen C Columns */}
          <div className="overflow-x-hidden">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-50 text-[11px] uppercase tracking-wider text-slate-500 border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-3 font-semibold">Primary</th>
                  <th className="py-2.5 px-3 font-semibold">Secondary</th>
                  <th className="py-2.5 px-2 font-semibold">TCA</th>
                  <th className="py-2.5 px-2 font-semibold">Miss Dist</th>
                  <th className="py-2.5 px-2 font-semibold">Rel. Vel</th>
                  <th className="py-2.5 px-2 font-semibold">Risk</th>
                  <th className="py-2.5 px-2 font-semibold text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {conjunctions.map((ev) => {
                  const isSelected = selectedEvent?.id === ev.id;
                  return (
                    <tr
                      key={ev.id}
                      onClick={() => handleSelectEvent(ev)}
                      className={`cursor-pointer transition-colors ${
                        isSelected ? 'bg-orange-50/60 font-medium' : 'hover:bg-slate-50'
                      }`}
                    >
                      <td className="py-2.5 px-3">
                        <div className="font-bold text-slate-900 leading-tight text-xs">{ev.primary_name}</div>
                        {ev.is_demo && (
                          <span className="px-1 py-0.5 rounded bg-amber-50 text-amber-700 text-[9px] font-bold border border-amber-200 inline-block mt-0.5">
                            DEMO
                          </span>
                        )}
                        <div className="text-[10px] text-slate-400">ID: {ev.primary_id}</div>
                      </td>
                      <td className="py-2.5 px-3">
                        <div className="font-semibold text-slate-800 text-xs leading-tight">{ev.secondary_name}</div>
                        <div className="text-[10px] text-slate-400">ID: {ev.secondary_id}</div>
                      </td>
                      <td className="py-2.5 px-2 whitespace-nowrap font-mono text-[11px] text-slate-600">
                        {ev.tca.split(' ')[1] || ev.tca}
                      </td>
                      <td className="py-2.5 px-2 font-mono font-semibold text-slate-900 text-xs">
                        {ev.miss_distance_km.toFixed(2)} km
                      </td>
                      <td className="py-2.5 px-2 font-mono text-slate-600 text-xs">
                        {ev.relative_velocity_kms.toFixed(2)} km/s
                      </td>
                      <td className="py-2.5 px-2">
                        <RiskBadge level={ev.risk_level} size="sm" />
                      </td>
                      <td className="py-2.5 px-2 text-right">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSimulate(ev.id);
                          }}
                          className="px-2.5 py-1.5 rounded-md bg-orange-600 hover:bg-orange-700 text-white font-semibold text-xs shadow-xs transition-colors inline-flex items-center gap-1 cursor-pointer"
                          title={`Simulate Avoidance for ${ev.primary_name} vs ${ev.secondary_name}`}
                        >
                          <span>Simulate</span>
                          <ArrowRight className="w-3 h-3" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="p-3 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between text-xs text-slate-500">
            <span>Showing {conjunctions.length} close approach candidates</span>
            <span className="italic text-[11px]">Click any event row to evaluate avoidance maneuvers</span>
          </div>
        </div>

        {/* Right Simulation & Detail Panel (5 Cols) matching Screen C */}
        <div className="lg:col-span-5 space-y-4">
          {selectedEvent ? (
            <>
              {/* Event Header Card */}
              <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                  <div>
                    <span className="text-[10px] font-bold text-orange-600 tracking-wider uppercase block">
                      {selectedEvent.is_demo ? 'DEMO SCENARIO · Synthetic Calibration Event' : 'Potential Close Approach (Catalog Screening)'}
                    </span>
                    <h3 className="font-black text-slate-900 text-base">
                      {selectedEvent.primary_name} vs {selectedEvent.secondary_name}
                    </h3>
                  </div>
                  <RiskBadge level={selectedEvent.risk_level} />
                </div>

                <div className="grid grid-cols-2 gap-2 mt-3 text-xs">
                  <div className="bg-slate-50 p-2 rounded border border-slate-100">
                    <span className="text-[10px] text-slate-500 block">TCA (UTC)</span>
                    <span className="font-semibold text-slate-800 font-mono">{selectedEvent.tca}</span>
                  </div>
                  <div className="bg-slate-50 p-2 rounded border border-slate-100">
                    <span className="text-[10px] text-slate-500 block">Time to Encounter</span>
                    <span className="font-semibold text-slate-800 font-mono">
                      {selectedEvent.time_to_tca_hours.toFixed(1)} hours
                    </span>
                  </div>
                </div>
              </div>

              {/* Explainability Card */}
              <ExplainabilityCard
                score={selectedEvent.risk_score}
                level={selectedEvent.risk_level}
                factors={selectedEvent.risk_factors}
                missDistanceKm={selectedEvent.miss_distance_km}
                relativeVelocityKms={selectedEvent.relative_velocity_kms}
                timeToTcaHours={selectedEvent.time_to_tca_hours}
              />

              {/* Quick Maneuver Parameter Inputs matching PDF Screen C */}
              <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
                <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-100">
                  <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider flex items-center gap-1.5">
                    <Sliders className="w-3.5 h-3.5 text-orange-600" />
                    <span>Maneuver Parameters</span>
                  </h4>
                  <span className="text-[11px] text-slate-500">Hypothetical Simulation</span>
                </div>

                <form onSubmit={handleRunCustomSimulation} className="space-y-3 text-xs">
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="text-[10px] font-semibold text-slate-500 block mb-1">
                        Delta-V (m/s)
                      </label>
                      <input
                        type="number"
                        min="1"
                        max="200"
                        step="1"
                        value={deltaVMs}
                        onChange={(e) => setDeltaVMs(parseFloat(e.target.value) || 0)}
                        className="w-full bg-slate-50 border border-slate-200 rounded p-1.5 text-xs font-mono font-semibold text-slate-800 focus:outline-none focus:ring-1 focus:ring-orange-500"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-semibold text-slate-500 block mb-1">
                        Direction
                      </label>
                      <select
                        value={direction}
                        onChange={(e) => setDirection(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded p-1.5 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-1 focus:ring-orange-500"
                      >
                        <option value="RETROGRADE">Retrograde</option>
                        <option value="PROGRADE">Prograde</option>
                        <option value="RADIAL">Radial Out</option>
                        <option value="NORMAL">Normal</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] font-semibold text-slate-500 block mb-1">
                        Lead Time
                      </label>
                      <input
                        type="number"
                        min="1"
                        max="48"
                        step="0.5"
                        value={timingHours}
                        onChange={(e) => setTimingHours(parseFloat(e.target.value) || 0)}
                        className="w-full bg-slate-50 border border-slate-200 rounded p-1.5 text-xs font-mono font-semibold text-slate-800 focus:outline-none focus:ring-1 focus:ring-orange-500"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={simulating}
                    className={`w-full py-2 rounded-lg font-semibold text-xs flex items-center justify-center gap-1.5 shadow-sm transition-all cursor-pointer ${
                      simBtnState === 'done'
                        ? 'bg-emerald-600 text-white'
                        : simBtnState === 'error'
                        ? 'bg-rose-600 text-white'
                        : 'bg-orange-600 hover:bg-orange-500 text-white'
                    }`}
                  >
                    {simBtnState === 'calculating' ? (
                      <><RefreshCw className="w-3.5 h-3.5 animate-spin" /><span>Calculating...</span></>
                    ) : simBtnState === 'done' ? (
                      <><CheckCircle2 className="w-3.5 h-3.5" /><span>Trajectory Recalculated</span></>
                    ) : simBtnState === 'error' ? (
                      <><span>Error — Retry</span></>
                    ) : (
                      <><Play className="w-3.5 h-3.5 fill-current" /><span>Recalculate Avoidance Trajectory</span></>
                    )}
                  </button>

                  {/* Validation / error message */}
                  {simError && (
                    <p className="text-[11px] text-rose-600 font-medium text-center">{simError}</p>
                  )}

                  {/* Custom scenario result — shown immediately after recalculate */}
                  {simResult && (() => {
                    const custom = simResult.scenarios.find(s => s.scenario_id === 'SCEN-CUSTOM');
                    const baseline = simResult.scenarios.find(s => s.scenario_id === 'SCEN-0');
                    if (!custom) return null;
                    const improved = custom.risk_reduction_pct > 0;
                    return (
                      <div className={`rounded-lg border p-3 space-y-2 text-xs ${
                        improved ? 'bg-emerald-50 border-emerald-200' : 'bg-amber-50 border-amber-200'
                      }`}>
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-slate-800 text-[11px] uppercase tracking-wide">Custom Result</span>
                          <span className={`font-bold text-[11px] px-2 py-0.5 rounded ${
                            custom.risk_level === 'CRITICAL' ? 'bg-rose-100 text-rose-700'
                            : custom.risk_level === 'HIGH' ? 'bg-orange-100 text-orange-700'
                            : custom.risk_level === 'MEDIUM' ? 'bg-amber-100 text-amber-700'
                            : 'bg-emerald-100 text-emerald-700'
                          }`}>{custom.risk_level}</span>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div className="bg-white rounded border border-slate-100 p-2">
                            <div className="text-[10px] text-slate-500">Miss Distance</div>
                            <div className="font-mono font-bold text-slate-900">{custom.miss_distance_km.toFixed(2)} km</div>
                            {baseline && <div className="text-[10px] text-slate-400">was {baseline.miss_distance_km.toFixed(2)} km</div>}
                          </div>
                          <div className="bg-white rounded border border-slate-100 p-2">
                            <div className="text-[10px] text-slate-500">Risk Score</div>
                            <div className="font-mono font-bold text-slate-900">{Math.round(custom.risk_score)} / 100</div>
                            {baseline && <div className="text-[10px] text-slate-400">was {Math.round(baseline.risk_score)} / 100</div>}
                          </div>
                          <div className="bg-white rounded border border-slate-100 p-2">
                            <div className="text-[10px] text-slate-500">{improved ? 'Risk Reduction' : 'Risk Change'}</div>
                            <div className={`font-mono font-bold ${
                              improved ? 'text-emerald-700' : 'text-rose-600'
                            }`}>
                              {improved ? `-${custom.risk_reduction_pct}%` : `+${Math.abs(custom.risk_reduction_pct)}%`}
                            </div>
                          </div>
                          <div className="bg-white rounded border border-slate-100 p-2">
                            <div className="text-[10px] text-slate-500">Burn Params</div>
                            <div className="font-mono font-bold text-slate-800 text-[11px]">{custom.delta_v_ms.toFixed(0)} m/s {custom.direction}</div>
                          </div>
                        </div>
                        <p className="text-[10px] text-slate-500 italic">
                          Hypothetical simulation — decision support only.
                        </p>
                      </div>
                    );
                  })()}

                  <button
                    type="button"
                    onClick={() => handleSimulate(selectedEvent.id)}
                    className="w-full py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs flex items-center justify-center gap-1.5 shadow-sm transition-colors cursor-pointer"
                  >
                    <Sliders className="w-3.5 h-3.5 text-orange-400" />
                    <span>Open Full Simulation Page</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </form>
              </div>

              {/* Recharts Simulation Outcome Curves matching Screen C */}
              {simResult && <ScenarioComparisonChart scenarios={simResult.scenarios} />}
            </>
          ) : (
            <div className="bg-white rounded-xl border border-slate-200 p-8 text-center text-xs text-slate-400">
              Select a conjunction event to view AI risk analysis and maneuver simulations.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
