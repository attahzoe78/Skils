'use client';
import { useState, useEffect } from 'react';
import { Shield, Stethoscope, Flame, Swords, MapPin, CheckCircle } from 'lucide-react';

interface Responder {
  id: string;
  name: string;
  type: string;
  location: { lat: number; lng: number };
  status: string;
  phone: string;
  unit: string;
  assignedIncident?: string;
}

interface Props {
  selectedIncidentId?: string;
  onDispatch?: (responderId: string) => void;
}

const TYPE_ICONS: Record<string, React.ReactNode> = {
  police: <Shield size={16} />,
  medical: <Stethoscope size={16} />,
  fire: <Flame size={16} />,
  military: <Swords size={16} />,
};

const TYPE_COLORS: Record<string, string> = {
  police: '#1d4ed8',
  medical: '#0891b2',
  fire: '#ea580c',
  military: '#7c3aed',
};

const STATUS_COLORS: Record<string, string> = {
  available: '#16a34a',
  responding: '#d97706',
  off_duty: '#64748b',
};

export default function ResponderPanel({ selectedIncidentId, onDispatch }: Props) {
  const [responders, setResponders] = useState<Responder[]>([]);
  const [dispatching, setDispatching] = useState<string | null>(null);
  const [dispatched, setDispatched] = useState<Set<string>>(new Set());
  const [filter, setFilter] = useState<string>('all');

  useEffect(() => {
    const load = async () => {
      const res = await fetch('/api/responders');
      const data = await res.json();
      setResponders(data.responders);
    };
    load();
    const interval = setInterval(load, 15000);
    return () => clearInterval(interval);
  }, []);

  const dispatch = async (responderId: string) => {
    if (!selectedIncidentId) return;
    setDispatching(responderId);
    try {
      const res = await fetch('/api/dispatch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ incidentId: selectedIncidentId, responderId }),
      });
      if (res.ok) {
        setDispatched(prev => new Set(prev).add(responderId));
        onDispatch?.(responderId);
      }
    } catch {}
    setDispatching(null);
  };

  const types = ['all', 'police', 'medical', 'fire', 'military'];
  const filtered = responders.filter(r => filter === 'all' || r.type === filter);

  const stats = {
    available: responders.filter(r => r.status === 'available').length,
    responding: responders.filter(r => r.status === 'responding').length,
    offDuty: responders.filter(r => r.status === 'off_duty').length,
  };

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b border-slate-700">
        <h2 className="font-bold text-white mb-3">Emergency Responders</h2>
        <div className="grid grid-cols-3 gap-2 mb-3">
          <div className="bg-green-950 border border-green-900 rounded-xl p-2 text-center">
            <p className="text-xl font-bold text-green-400">{stats.available}</p>
            <p className="text-xs text-green-600">Available</p>
          </div>
          <div className="bg-amber-950 border border-amber-900 rounded-xl p-2 text-center">
            <p className="text-xl font-bold text-amber-400">{stats.responding}</p>
            <p className="text-xs text-amber-600">Deployed</p>
          </div>
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-2 text-center">
            <p className="text-xl font-bold text-slate-400">{stats.offDuty}</p>
            <p className="text-xs text-slate-500">Off Duty</p>
          </div>
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1">
          {types.map(t => (
            <button
              key={t}
              onClick={() => setFilter(t)}
              className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-colors capitalize ${
                filter === t ? 'bg-cyan-600 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
              }`}
            >
              {t === 'all' ? 'All Units' : t}
            </button>
          ))}
        </div>
      </div>

      {selectedIncidentId && (
        <div className="px-4 py-2 bg-amber-950/50 border-b border-amber-900/50 text-xs text-amber-300 flex items-center gap-2">
          <span className="w-2 h-2 bg-amber-400 rounded-full animate-pulse" />
          Select responder to dispatch to active incident
        </div>
      )}

      <div className="flex-1 overflow-y-auto">
        {filtered.map(responder => {
          const color = TYPE_COLORS[responder.type] || '#64748b';
          const isDispatched = dispatched.has(responder.id);
          const isAvailable = responder.status === 'available';
          return (
            <div
              key={responder.id}
              className="responder-card px-4 py-3 border-b border-slate-800 transition-all"
            >
              <div className="flex items-start gap-3">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                  style={{ background: `${color}25`, color, border: `1px solid ${color}50` }}
                >
                  {TYPE_ICONS[responder.type]}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="font-medium text-sm text-white">{responder.name}</span>
                    <span
                      className="w-2 h-2 rounded-full ml-auto"
                      style={{ background: STATUS_COLORS[responder.status] }}
                    />
                  </div>
                  <p className="text-xs text-slate-400 truncate">{responder.unit}</p>
                  <div className="flex items-center gap-3 mt-1 text-xs text-slate-500">
                    <span className="flex items-center gap-1">
                      <MapPin size={10} />
                      ~{(Math.random() * 3 + 0.5).toFixed(1)}km away
                    </span>
                    <a href={`tel:${responder.phone}`} className="text-cyan-400 hover:text-cyan-300">
                      {responder.phone}
                    </a>
                  </div>
                </div>
                {selectedIncidentId && (
                  <button
                    onClick={() => dispatch(responder.id)}
                    disabled={!isAvailable || dispatching === responder.id || isDispatched}
                    className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                      isDispatched
                        ? 'bg-green-900 text-green-300 cursor-default'
                        : isAvailable
                        ? 'bg-cyan-700 hover:bg-cyan-600 text-white'
                        : 'bg-slate-700 text-slate-500 cursor-not-allowed'
                    }`}
                  >
                    {isDispatched ? <CheckCircle size={14} /> : dispatching === responder.id ? '…' : 'Dispatch'}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
