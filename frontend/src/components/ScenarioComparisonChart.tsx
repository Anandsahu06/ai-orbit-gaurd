import React from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
  LineChart,
  Line
} from 'recharts';
import { ScenarioComparisonItem } from '../types';

interface ScenarioComparisonChartProps {
  scenarios: ScenarioComparisonItem[];
}

export const ScenarioComparisonChart: React.FC<ScenarioComparisonChartProps> = ({ scenarios }) => {
  const chartData = scenarios.map((s) => ({
    name:
      s.scenario_id === 'SCEN-0'
        ? 'Baseline'
        : s.scenario_id === 'SCEN-A'
        ? 'Scenario A'
        : s.scenario_id === 'SCEN-B'
        ? 'Scenario B'
        : 'Custom',
    missDistance: s.miss_distance_km,
    riskScore: s.risk_score,
    deltaV: s.delta_v_ms,
    id: s.scenario_id
  }));

  const baseDist = scenarios[0]?.miss_distance_km ?? 0.42;
  const scenADist = scenarios[1]?.miss_distance_km ?? 2.14;
  const scenBDist = scenarios[2]?.miss_distance_km ?? 4.85;
  const customScen = scenarios.find((s) => s.scenario_id === 'SCEN-CUSTOM');
  const customDist = customScen?.miss_distance_km;

  // Hyperbolic relative close-approach trajectory profile:
  // d(t) = sqrt(d_min^2 + (v_eff * delta_t)^2)
  const calcDist = (dMin: number, hours: number) => {
    const vEff = 1.35; // Effective relative closing rate in km/h
    return +(Math.sqrt(dMin * dMin + Math.pow(vEff * hours, 2))).toFixed(2);
  };

  const curveData = [
    {
      step: '-12h',
      baseline: calcDist(baseDist, 12),
      scenA: calcDist(scenADist, 12),
      scenB: calcDist(scenBDist, 12),
      custom: customDist !== undefined ? calcDist(customDist, 12) : undefined
    },
    {
      step: '-8h',
      baseline: calcDist(baseDist, 8),
      scenA: calcDist(scenADist, 8),
      scenB: calcDist(scenBDist, 8),
      custom: customDist !== undefined ? calcDist(customDist, 8) : undefined
    },
    {
      step: '-4h',
      baseline: calcDist(baseDist, 4),
      scenA: calcDist(scenADist, 4),
      scenB: calcDist(scenBDist, 4),
      custom: customDist !== undefined ? calcDist(customDist, 4) : undefined
    },
    {
      step: '-2h',
      baseline: calcDist(baseDist, 2),
      scenA: calcDist(scenADist, 2),
      scenB: calcDist(scenBDist, 2),
      custom: customDist !== undefined ? calcDist(customDist, 2) : undefined
    },
    {
      step: 'TCA',
      baseline: +baseDist.toFixed(2),
      scenA: +scenADist.toFixed(2),
      scenB: +scenBDist.toFixed(2),
      custom: customDist !== undefined ? +customDist.toFixed(2) : undefined
    },
    {
      step: '+2h',
      baseline: calcDist(baseDist, 2),
      scenA: calcDist(scenADist, 2),
      scenB: calcDist(scenBDist, 2),
      custom: customDist !== undefined ? calcDist(customDist, 2) : undefined
    },
    {
      step: '+4h',
      baseline: calcDist(baseDist, 4),
      scenA: calcDist(scenADist, 4),
      scenB: calcDist(scenBDist, 4),
      custom: customDist !== undefined ? calcDist(customDist, 4) : undefined
    }
  ];

  const getBarColor = (name: string) => {
    switch (name) {
      case 'Baseline':
        return '#f43f5e'; // Red / Rose
      case 'Scenario A':
        return '#f59e0b'; // Amber
      case 'Scenario B':
        return '#10b981'; // Emerald
      case 'Custom':
        return '#8b5cf6'; // Violet / Purple
      default:
        return '#3b82f6';
    }
  };

  const chartKey = `comparison-${scenarios.length}-${customScen?.miss_distance_km || 'none'}-${customScen?.delta_v_ms || 'none'}`;

  return (
    <div className="space-y-4">
      {/* Separation at TCA Comparison Bar Chart */}
      <div className="bg-white p-4 rounded-xl border border-slate-200">
        <div className="flex items-center justify-between mb-2">
          <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
            Miss Distance at TCA (km)
          </h4>
          <span className="text-[11px] text-slate-500 font-medium">Higher separation is safer</span>
        </div>
        <div className="h-44 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart key={`bar-${chartKey}`} data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={{ stroke: '#e2e8f0' }} />
              <YAxis tick={{ fontSize: 11, fill: '#64748b' }} axisLine={{ stroke: '#e2e8f0' }} />
              <Tooltip
                formatter={(value: any) => [`${value} km`, 'Miss Distance']}
                contentStyle={{ backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '12px' }}
              />
              <Bar dataKey="missDistance" radius={[4, 4, 0, 0]}>
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={getBarColor(entry.name)} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Trajectory Evolution Curve Chart matching PDF Screen C */}
      <div className="bg-white p-4 rounded-xl border border-slate-200">
        <div className="flex items-center justify-between mb-2">
          <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
            Relative Separation Curve Over Time (km)
          </h4>
          <span className="text-[11px] text-slate-500 font-medium">Prototype separation profile</span>
        </div>
        <div className="h-44 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart key={`line-${chartKey}`} data={curveData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
              <XAxis dataKey="step" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={{ stroke: '#e2e8f0' }} />
              <YAxis tick={{ fontSize: 11, fill: '#64748b' }} axisLine={{ stroke: '#e2e8f0' }} />
              <Tooltip
                contentStyle={{ backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '12px' }}
              />
              <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '6px' }} />
              <Line type="monotone" dataKey="baseline" name="Baseline (No Burn)" stroke="#f43f5e" strokeWidth={2} dot={{ r: 3 }} />
              <Line type="monotone" dataKey="scenA" name="Scenario A (20 m/s)" stroke="#f59e0b" strokeWidth={2} dot={{ r: 3 }} />
              <Line type="monotone" dataKey="scenB" name="Scenario B (40 m/s)" stroke="#10b981" strokeWidth={2} dot={{ r: 3 }} />
              {customScen && (
                <Line
                  type="monotone"
                  dataKey="custom"
                  name={`Custom (${customScen.delta_v_ms.toFixed(1)} m/s ${customScen.direction})`}
                  stroke="#8b5cf6"
                  strokeWidth={2.5}
                  strokeDasharray="4 4"
                  dot={{ r: 4 }}
                />
              )}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};
