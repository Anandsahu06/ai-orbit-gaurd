import React, { useState, useEffect } from 'react';
import { ConjunctionEvent, ManeuverSimulationResponse } from '../types';
import { api } from '../services/api';
import {
  simulateCustomManeuver,
  validateManeuverParams,
  CustomSimulationResult
} from '../services/simulationService';
import { RiskBadge } from '../components/RiskBadge';
import { ScenarioComparisonChart } from '../components/ScenarioComparisonChart';
import {
  Sliders,
  ShieldCheck,
  Fuel,
  TrendingDown,
  Info,
  CheckCircle2,
  RefreshCw,
  Navigation,
  ArrowLeft,
  AlertTriangle,
  Clock,
  Compass
} from 'lucide-react';
import { NavTab } from '../components/Sidebar';

interface SimulationPageProps {
  initialConjunctionId?: string | null;
  setActiveTab: (tab: NavTab) => void;
}

export const SimulationPage: React.FC<SimulationPageProps> = ({
  initialConjunctionId,
  setActiveTab
}) => {
  const [conjunctions, setConjunctions] = useState<ConjunctionEvent[]>([]);
  const [selectedConjId, setSelectedConjId] = useState<string>(initialConjunctionId || 'CONJ-2026-0104');
  const [deltaVMs, setDeltaVMs] = useState<number>(40.0);
  const [direction, setDirection] = useState<string>('PROGRADE');
  const [timingHours, setTimingHours] = useState<number>(6.0);
  const [simData, setSimData] = useState<ManeuverSimulationResponse | null>(null);
  const [customResult, setCustomResult] = useState<CustomSimulationResult | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [computing, setComputing] = useState<boolean>(false);
  const [btnState, setBtnState] = useState<'idle' | 'calculating' | 'recalculated'>('idle');
  const [lastCalculatedTime, setLastCalculatedTime] = useState<string | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Watch for initialConjunctionId changes from parent navigation or URL
  useEffect(() => {
    if (initialConjunctionId && initialConjunctionId !== selectedConjId) {
      setSelectedConjId(initialConjunctionId);
      executeSimulation(initialConjunctionId, deltaVMs, direction, timingHours);
    }
  }, [initialConjunctionId]);

  // Initial load
  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    try {
      setLoading(true);
      setErrorMsg(null);
      const conjList = await api.getConjunctions();
      setConjunctions(conjList);

      const targetId = initialConjunctionId || (conjList.length > 0 ? conjList[0].id : 'CONJ-2026-0104');
      setSelectedConjId(targetId);
      await executeSimulation(targetId, deltaVMs, direction, timingHours);
    } catch (err) {
      console.error('Failed to load simulation setup:', err);
      setErrorMsg('Unable to load conjunctions for simulation.');
    } finally {
      setLoading(false);
    }
  };

  const executeSimulation = async (conjId: string, dv: number, dir: string, lead: number) => {
    try {
      setComputing(true);
      setErrorMsg(null);
      const activeConj = conjunctions.find((c) => c.id === conjId);
      if (activeConj) {
        const result = await simulateCustomManeuver({
          conjunction: activeConj,
          deltaV: dv,
          direction: dir,
          leadTime: lead
        });
        setCustomResult(result);
        setSimData(result.fullSimulationResponse);
        setLastCalculatedTime(result.timestamp);
      } else {
        const res = await api.simulateManeuver(conjId, dv, dir, lead);
        setSimData(res);
        setLastCalculatedTime(
          new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })
        );
      }
    } catch (err) {
      console.error('Simulation calculation failed:', err);
      setErrorMsg('Unable to run simulation. Please verify backend service.');
    } finally {
      setComputing(false);
    }
  };

  const handleSelectConjunction = (id: string) => {
    setSelectedConjId(id);
    const params = new URLSearchParams(window.location.search);
    params.set('tab', 'simulation');
    params.set('conjunctionId', id);
    window.history.replaceState(null, '', `${window.location.pathname}?${params.toString()}`);
    executeSimulation(id, deltaVMs, direction, timingHours);
  };

  const handleRecalculate = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);

    // 1. Validate inputs
    const val = validateManeuverParams({ deltaV: deltaVMs, direction, leadTime: timingHours });
    if (!val.valid) {
      setValidationError(val.error || 'Invalid maneuver parameters.');
      return;
    }

    const activeConj = conjunctions.find((c) => c.id === selectedConjId);
    if (!activeConj) {
      setErrorMsg('No active conjunction selected.');
      return;
    }

    try {
      setBtnState('calculating');
      setComputing(true);
      setErrorMsg(null);

      const result = await simulateCustomManeuver({
        conjunction: activeConj,
        deltaV: deltaVMs,
        direction: direction,
        leadTime: timingHours
      });

      setCustomResult(result);
      setSimData(result.fullSimulationResponse);
      setLastCalculatedTime(result.timestamp);
      setBtnState('recalculated');

      setTimeout(() => {
        setBtnState('idle');
      }, 1500);
    } catch (err: any) {
      console.error('Recalculate avoidance trajectory failed:', err);
      setErrorMsg(err.message || 'Unable to calculate trajectory. Check maneuver parameters.');
      setBtnState('idle');
    } finally {
      setComputing(false);
    }
  };

  const activeEvent = conjunctions.find((c) => c.id === selectedConjId);

  return (
    <div className="space-y-5 max-w-7xl mx-auto pb-12">
      {/* Top Navigation & Scenario Context Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <button
          onClick={() => setActiveTab('conjunctions')}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white hover:bg-slate-100 text-slate-700 font-semibold text-xs border border-slate-200 shadow-xs transition-colors cursor-pointer w-fit"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Conjunctions</span>
        </button>

        <div className="text-xs text-slate-500 font-medium flex items-center gap-2">
          {activeEvent?.is_demo ? (
            <span className="px-2.5 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200 font-semibold">
              DEMO SCENARIO · Synthetic event for demonstration
            </span>
          ) : (
            <span className="px-2.5 py-0.5 rounded bg-slate-100 text-slate-600 font-medium">
              Potential Close Approach · Catalog Screening
            </span>
          )}
        </div>
      </div>

      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-orange-500" />
            <span className="text-xs font-bold text-orange-600 uppercase tracking-wider">MVP 03</span>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              Avoidance Scenario Simulation
            </h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Evaluate and compare hypothetical trajectory maneuvers to clear close approach safety volumes
          </p>
          <p className="text-[11px] text-slate-400 mt-0.5 italic">
            Hypothetical maneuver simulation — decision support only. Not an operational spacecraft command.
          </p>
        </div>

        {/* Conjunction Selector */}
        <div className="flex items-center gap-2">
          <label className="text-xs font-semibold text-slate-600 whitespace-nowrap">Target Conjunction:</label>
          <select
            value={selectedConjId}
            onChange={(e) => handleSelectConjunction(e.target.value)}
            className="bg-slate-50 border border-slate-300 rounded-lg px-3 py-1.5 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-orange-500 shadow-xs cursor-pointer"
          >
            {conjunctions.map((c) => (
              <option key={c.id} value={c.id}>
                {c.primary_name} vs {c.secondary_name} ({c.miss_distance_km.toFixed(2)} km)
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Error Banner with Retry */}
      {errorMsg && (
        <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-700 flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-600 flex-shrink-0" />
            <span>{errorMsg}</span>
          </div>
          <button
            onClick={() => executeSimulation(selectedConjId, deltaVMs, direction, timingHours)}
            className="px-2.5 py-1 bg-rose-600 text-white rounded font-semibold text-xs hover:bg-rose-700 cursor-pointer"
          >
            Retry
          </button>
        </div>
      )}

      {/* Main Simulation Results & Inputs */}
      {simData && (
        <>
          {/* Scenario Comparison Cards */}
          <div className={`grid grid-cols-1 ${simData.scenarios.length >= 4 ? 'sm:grid-cols-2 lg:grid-cols-4' : 'md:grid-cols-3'} gap-4`}>
            {simData.scenarios.map((scen, idx) => {
              const isBaseline = scen.scenario_id === 'SCEN-0';
              const isCustom = scen.scenario_id === 'SCEN-CUSTOM';
              return (
                <div
                  key={scen.scenario_id}
                  className={`relative rounded-xl border p-4.5 transition-all shadow-xs ${
                    isBaseline
                      ? 'bg-slate-50/70 border-slate-200'
                      : isCustom
                      ? 'bg-white border-purple-300 ring-2 ring-purple-100/70'
                      : idx === 1
                      ? 'bg-white border-amber-200 ring-1 ring-amber-100'
                      : 'bg-white border-emerald-300 ring-2 ring-emerald-100/60'
                  }`}
                >
                  <div className="flex items-center justify-between pb-2.5 border-b border-slate-100 mb-2.5">
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                        {isBaseline ? 'Baseline' : isCustom ? 'Custom Maneuver' : `Scenario ${idx === 1 ? 'A' : 'B'}`}
                      </span>
                      <h3 className="font-black text-slate-900 text-xs sm:text-sm">{scen.name}</h3>
                    </div>
                    <RiskBadge level={scen.risk_level} size="sm" />
                  </div>

                  <p className="text-xs text-slate-500 mb-3 min-h-[28px] leading-relaxed">
                    {scen.description}
                  </p>

                  <div className="space-y-2 text-xs">
                    <div className="flex items-center justify-between py-1 border-b border-slate-100">
                      <span className="text-slate-500 flex items-center gap-1.5">
                        <Fuel className="w-3.5 h-3.5 text-slate-400" />
                        ΔV Expenditure
                      </span>
                      <span className="font-mono font-bold text-slate-800">
                        {scen.delta_v_ms > 0 ? `${scen.delta_v_ms.toFixed(1)} m/s` : '0 m/s'}
                      </span>
                    </div>

                    <div className="flex items-center justify-between py-1 border-b border-slate-100">
                      <span className="text-slate-500 flex items-center gap-1.5">
                        <Compass className="w-3.5 h-3.5 text-slate-400" />
                        Direction
                      </span>
                      <span className="font-mono font-bold text-slate-800">
                        {scen.direction}
                      </span>
                    </div>

                    <div className="flex items-center justify-between py-1 border-b border-slate-100">
                      <span className="text-slate-500 flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        Lead Time
                      </span>
                      <span className="font-mono font-bold text-slate-800">
                        {scen.burn_time_before_tca_h > 0 ? `${scen.burn_time_before_tca_h.toFixed(1)} h` : 'N/A'}
                      </span>
                    </div>

                    <div className="flex items-center justify-between py-1 border-b border-slate-100">
                      <span className="text-slate-500 flex items-center gap-1.5">
                        <Navigation className="w-3.5 h-3.5 text-slate-400" />
                        Miss Distance at TCA
                      </span>
                      <span className="font-mono font-bold text-slate-900 text-sm">
                        {scen.miss_distance_km.toFixed(2)} km
                      </span>
                    </div>

                    <div className="flex items-center justify-between py-1 border-b border-slate-100">
                      <span className="text-slate-500 flex items-center gap-1.5">
                        <ShieldCheck className="w-3.5 h-3.5 text-slate-400" />
                        Prototype Risk Score
                      </span>
                      <span className="font-mono font-bold text-slate-800">
                        {Math.round(scen.risk_score)} / 100
                        {!isBaseline && simData.original_risk_score > scen.risk_score && (
                          <span className="text-emerald-600 text-[11px] ml-1.5 font-normal">
                            (-{Math.round(simData.original_risk_score - scen.risk_score)} pts)
                          </span>
                        )}
                      </span>
                    </div>

                    <div className="flex items-center justify-between py-1">
                      <span className="text-slate-500 flex items-center gap-1.5">
                        <TrendingDown className="w-3.5 h-3.5 text-slate-400" />
                        {scen.risk_reduction_pct >= 0 ? 'Risk Reduction' : 'Risk Increase'}
                      </span>
                      <span
                        className={`font-mono font-bold ${
                          scen.risk_reduction_pct > 0
                            ? 'text-emerald-600'
                            : scen.risk_reduction_pct < 0
                            ? 'text-rose-600'
                            : 'text-slate-400'
                        }`}
                      >
                        {scen.risk_reduction_pct > 0
                          ? `${scen.risk_reduction_pct}%`
                          : scen.risk_reduction_pct < 0
                          ? `+${Math.abs(scen.risk_reduction_pct)}%`
                          : '0%'}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Custom Maneuver Parameters & Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Custom Interactive Parameter Controls (5 Cols) */}
            <div className="lg:col-span-5 bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-4">
              <div className="pb-3 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <Sliders className="w-4 h-4 text-orange-600" />
                    <span>MANEUVER PARAMETERS</span>
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Adjust Delta-V magnitude, thrust direction, and lead time to evaluate custom clearance.
                  </p>
                </div>
                {lastCalculatedTime && (
                  <div className="text-right flex-shrink-0">
                    <span className="text-[10px] text-slate-400 block uppercase tracking-wider">Status</span>
                    <span className="text-[11px] font-mono font-medium text-slate-600">
                      {lastCalculatedTime}
                    </span>
                  </div>
                )}
              </div>

              {/* Validation Error Banner */}
              {validationError && (
                <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-700 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-rose-600 flex-shrink-0" />
                  <span>{validationError}</span>
                </div>
              )}

              <form onSubmit={handleRecalculate} className="space-y-4 text-xs">
                <div>
                  <div className="flex justify-between mb-1">
                    <label className="font-semibold text-slate-700">Delta-V (m/s)</label>
                    <span className="font-mono font-bold text-orange-600 text-sm">{deltaVMs} m/s</span>
                  </div>
                  <input
                    type="range"
                    min="5"
                    max="100"
                    step="5"
                    value={deltaVMs}
                    onChange={(e) => setDeltaVMs(parseFloat(e.target.value))}
                    className="w-full accent-orange-600 cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] text-slate-400 mt-0.5">
                    <span>5 m/s (Micro-burn)</span>
                    <span>50 m/s (Nominal)</span>
                    <span>100 m/s (Aggressive)</span>
                  </div>
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1.5">Direction</label>
                  <div className="grid grid-cols-2 gap-2">
                    {['RETROGRADE', 'PROGRADE', 'RADIAL', 'NORMAL'].map((dir) => (
                      <button
                        type="button"
                        key={dir}
                        onClick={() => setDirection(dir)}
                        className={`p-2 rounded-lg border text-xs font-semibold text-center transition-colors cursor-pointer ${
                          direction === dir
                            ? 'bg-orange-50 border-orange-500 text-orange-700 font-bold shadow-xs'
                            : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                        }`}
                      >
                        {dir}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <div className="flex justify-between mb-1">
                    <label className="font-semibold text-slate-700">Lead Time</label>
                    <span className="font-mono font-bold text-blue-600 text-sm">{timingHours} hours</span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="24"
                    step="0.5"
                    value={timingHours}
                    onChange={(e) => setTimingHours(parseFloat(e.target.value))}
                    className="w-full accent-blue-600 cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] text-slate-400 mt-0.5">
                    <span>1 hour (Immediate)</span>
                    <span>12 hours (Half-day)</span>
                    <span>24 hours (Multi-orbit)</span>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={btnState === 'calculating'}
                  className={`w-full py-2.5 rounded-lg font-bold text-xs flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer ${
                    btnState === 'recalculated'
                      ? 'bg-emerald-600 text-white'
                      : 'bg-orange-600 hover:bg-orange-500 text-white'
                  }`}
                >
                  {btnState === 'calculating' ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Calculating...</span>
                    </>
                  ) : btnState === 'recalculated' ? (
                    <>
                      <CheckCircle2 className="w-4 h-4 text-white" />
                      <span>Trajectory Recalculated</span>
                    </>
                  ) : (
                    <>
                      <RefreshCw className="w-4 h-4" />
                      <span>Recalculate Avoidance Trajectory</span>
                    </>
                  )}
                </button>
              </form>

              {/* Recommendation Box */}
              <div className="bg-blue-50/70 border border-blue-200/80 rounded-lg p-3 text-xs text-blue-900 leading-relaxed">
                <div className="font-bold mb-1 flex items-center gap-1.5 text-blue-800">
                  <Info className="w-3.5 h-3.5 text-blue-600 flex-shrink-0" />
                  <span>Decision Support Recommendation</span>
                </div>
                {simData.recommendation}
              </div>

              {/* Honest Disclaimer Notice */}
              <div className="text-[11px] text-slate-400 italic text-center">
                {simData.simulation_notes}
              </div>
            </div>

            {/* Recharts Visual Comparison Curves (7 Cols) */}
            <div className="lg:col-span-7">
              <ScenarioComparisonChart scenarios={simData.scenarios} />
            </div>
          </div>
        </>
      )}
    </div>
  );
};
