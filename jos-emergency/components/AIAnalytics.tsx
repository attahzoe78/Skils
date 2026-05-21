'use client';
import { useEffect, useState } from 'react';
import { Brain, TrendingUp, TrendingDown, Minus, AlertTriangle, Shield, Clock, Users } from 'lucide-react';

interface TrendData {
  type: string;
  label: string;
  count: number;
  trend: 'up' | 'down' | 'stable';
  changePercent: number;
  color: string;
}

interface Hotspot {
  lat: number;
  lng: number;
  risk: number;
  area: string;
  primaryThreat: string;
  incidentCount: number;
}

interface ResourceAlloc {
  type: string;
  available: number;
  deployed: number;
  color: string;
}

interface LGAData {
  lga: string;
  count: number;
  riskLevel: string;
}

interface AIReport {
  overallRisk: number;
  hotspots: Hotspot[];
  trends: TrendData[];
  predictions: string[];
  recommendations: string[];
  activeThreats: number;
  resolvedToday: number;
  avgResponseTime: number;
  resourceAllocation: ResourceAlloc[];
  incidentsByLGA: LGAData[];
  timeHeatmap: number[][];
}

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const HOUR_LABELS = ['0', '3', '6', '9', '12', '15', '18', '21'];

export default function AIAnalytics() {
  const [report, setReport] = useState<AIReport | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const res = await fetch('/api/analytics');
      const data = await res.json();
      setReport(data);
      setLoading(false);
    };
    load();
    const interval = setInterval(load, 30000);
    return () => clearInterval(interval);
  }, []);

  if (loading || !report) return (
    <div className="flex items-center justify-center h-full">
      <div className="text-center">
        <Brain size={40} className="text-purple-400 mx-auto mb-3 animate-pulse" />
        <p className="text-slate-400 text-sm">Running AI analysis…</p>
      </div>
    </div>
  );

  const riskColor = report.overallRisk > 70 ? '#dc2626' : report.overallRisk > 40 ? '#d97706' : '#16a34a';
  const maxHeatmap = Math.max(...report.timeHeatmap.flat(), 1);

  return (
    <div className="p-4 space-y-6 overflow-y-auto h-full">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-purple-900 flex items-center justify-center">
          <Brain size={20} className="text-purple-400" />
        </div>
        <div>
          <h2 className="font-bold text-white">AI Predictive Analysis</h2>
          <p className="text-xs text-slate-400">Real-time threat intelligence · Jos, Plateau State</p>
        </div>
        <div className="ml-auto text-xs text-green-400 flex items-center gap-1">
          <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
          Live
        </div>
      </div>

      {/* Risk gauge + stats */}
      <div className="grid grid-cols-2 gap-3">
        {/* Overall risk */}
        <div className="col-span-2 glass-card p-4">
          <p className="text-xs text-slate-400 mb-2">Overall Threat Level</p>
          <div className="flex items-center gap-4">
            <div className="relative w-20 h-20">
              <svg viewBox="0 0 36 36" className="w-20 h-20 -rotate-90">
                <circle cx="18" cy="18" r="15.9" fill="none" stroke="#1e293b" strokeWidth="3" />
                <circle
                  cx="18" cy="18" r="15.9" fill="none"
                  stroke={riskColor} strokeWidth="3"
                  strokeDasharray={`${report.overallRisk} ${100 - report.overallRisk}`}
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-xl font-bold" style={{ color: riskColor }}>{report.overallRisk}</span>
                <span className="text-xs text-slate-400">/ 100</span>
              </div>
            </div>
            <div className="flex-1 grid grid-cols-3 gap-3">
              <div className="text-center">
                <p className="text-2xl font-bold text-red-400">{report.activeThreats}</p>
                <p className="text-xs text-slate-400">Active</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-green-400">{report.resolvedToday}</p>
                <p className="text-xs text-slate-400">Resolved</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-amber-400">{report.avgResponseTime}m</p>
                <p className="text-xs text-slate-400">Avg. Response</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Resource allocation */}
      <div className="glass-card p-4">
        <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
          <Users size={15} className="text-cyan-400" /> Resource Allocation
        </h3>
        <div className="space-y-3">
          {report.resourceAllocation.map(r => {
            const total = r.available + r.deployed;
            const deployedPct = total > 0 ? (r.deployed / total) * 100 : 0;
            return (
              <div key={r.type}>
                <div className="flex justify-between text-xs mb-1">
                  <span style={{ color: r.color }} className="font-medium">{r.type}</span>
                  <span className="text-slate-400">{r.deployed} deployed / {r.available} available</span>
                </div>
                <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{ width: `${deployedPct}%`, background: r.color }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Incident trends */}
      <div className="glass-card p-4">
        <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
          <TrendingUp size={15} className="text-amber-400" /> 24h Incident Trends
        </h3>
        <div className="space-y-2">
          {report.trends.slice(0, 5).map(t => (
            <div key={t.type} className="flex items-center gap-3">
              <div className="w-24 text-xs font-medium" style={{ color: t.color }}>{t.label}</div>
              <div className="flex-1 h-2 bg-slate-800 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full"
                  style={{ width: `${Math.min(100, t.count * 15)}%`, background: t.color }}
                />
              </div>
              <span className="text-xs text-slate-300 w-6 text-center">{t.count}</span>
              <div className="w-14 flex items-center gap-1 text-xs">
                {t.trend === 'up' && <><TrendingUp size={12} className="text-red-400" /><span className="text-red-400">+{t.changePercent}%</span></>}
                {t.trend === 'down' && <><TrendingDown size={12} className="text-green-400" /><span className="text-green-400">-{t.changePercent}%</span></>}
                {t.trend === 'stable' && <><Minus size={12} className="text-slate-400" /><span className="text-slate-400">stable</span></>}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Time heatmap */}
      <div className="glass-card p-4">
        <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
          <Clock size={15} className="text-blue-400" /> Incident Time Pattern (Day × Hour)
        </h3>
        <div className="flex gap-1">
          <div className="flex flex-col justify-around">
            {DAY_LABELS.map(d => (
              <span key={d} className="text-xs text-slate-500 w-8 text-right pr-1">{d}</span>
            ))}
          </div>
          <div className="flex-1 grid gap-1" style={{ gridTemplateRows: `repeat(7, 1fr)` }}>
            {report.timeHeatmap.map((row, day) => (
              <div key={day} className="grid grid-cols-24 gap-px" style={{ gridTemplateColumns: `repeat(24, 1fr)` }}>
                {row.map((val, hour) => {
                  const intensity = val / maxHeatmap;
                  return (
                    <div
                      key={hour}
                      className="aspect-square rounded-sm"
                      style={{
                        background: `rgba(220, 38, 38, ${intensity * 0.9 + 0.05})`,
                        opacity: intensity > 0 ? 1 : 0.15,
                      }}
                      title={`${DAY_LABELS[day]} ${hour}:00 — ${val} incident${val !== 1 ? 's' : ''}`}
                    />
                  );
                })}
              </div>
            ))}
          </div>
        </div>
        <div className="flex justify-between mt-1">
          {HOUR_LABELS.map(h => (
            <span key={h} className="text-xs text-slate-600">{h}</span>
          ))}
        </div>
      </div>

      {/* AI Predictions */}
      <div className="glass-card p-4">
        <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
          <AlertTriangle size={15} className="text-amber-400" /> AI Predictions
        </h3>
        <div className="space-y-2">
          {report.predictions.map((p, i) => (
            <div key={i} className="flex gap-2 text-xs text-slate-300 bg-amber-950/30 border border-amber-900/40 rounded-lg p-3">
              <span className="text-amber-400 shrink-0">⚡</span>
              <span>{p}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Recommendations */}
      <div className="glass-card p-4">
        <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
          <Shield size={15} className="text-green-400" /> Recommended Actions
        </h3>
        <div className="space-y-2">
          {report.recommendations.slice(0, 4).map((r, i) => (
            <div key={i} className="flex gap-2 text-xs text-slate-300 bg-green-950/30 border border-green-900/40 rounded-lg p-3">
              <span className="text-green-400 shrink-0">{i + 1}.</span>
              <span>{r}</span>
            </div>
          ))}
        </div>
      </div>

      {/* LGA risk table */}
      <div className="glass-card p-4">
        <h3 className="text-sm font-semibold text-white mb-3">Incidents by LGA</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-slate-400 border-b border-slate-700">
                <th className="text-left pb-2">LGA</th>
                <th className="text-center pb-2">Incidents</th>
                <th className="text-right pb-2">Risk</th>
              </tr>
            </thead>
            <tbody>
              {report.incidentsByLGA.map(lga => (
                <tr key={lga.lga} className="border-b border-slate-800">
                  <td className="py-2 text-slate-300">{lga.lga}</td>
                  <td className="py-2 text-center text-white font-medium">{lga.count}</td>
                  <td className="py-2 text-right">
                    <span className={`px-2 py-0.5 rounded-full text-xs ${
                      lga.riskLevel === 'High' ? 'bg-red-900 text-red-300' :
                      lga.riskLevel === 'Medium' ? 'bg-amber-900 text-amber-300' :
                      'bg-green-900 text-green-300'
                    }`}>
                      {lga.riskLevel}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
