'use client';
import { useState } from 'react';
import { Filter, MapPin, Clock, ChevronRight } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface Incident {
  id: string;
  type: string;
  level: string;
  status: string;
  location: { lat: number; lng: number; address: string; lga: string };
  description: string;
  reportedAt: string;
  reportedBy: string;
  respondersAssigned: string[];
  updates: { time: string; message: string }[];
}

interface Props {
  incidents: Incident[];
  onSelect?: (incident: Incident) => void;
  loading?: boolean;
}

const TYPE_ICONS: Record<string, string> = {
  medical: '🏥', fire: '🔥', robbery: '🔫', kidnapping: '🚨',
  terrorism: '⚠️', bomb_threat: '💣', civil_unrest: '👥',
};

const TYPE_COLORS: Record<string, string> = {
  medical: '#0891b2', fire: '#ea580c', robbery: '#dc2626',
  kidnapping: '#7c3aed', terrorism: '#be123c', bomb_threat: '#b45309', civil_unrest: '#d97706',
};

const LEVEL_STYLES: Record<string, string> = {
  critical: 'level-critical',
  high: 'level-high',
  medium: 'level-medium',
  low: 'level-low',
};

const STATUS_STYLES: Record<string, string> = {
  active: 'bg-red-900 text-red-300 border border-red-700',
  responding: 'bg-amber-900 text-amber-300 border border-amber-700',
  resolved: 'bg-green-900 text-green-300 border border-green-700',
};

export default function IncidentList({ incidents, onSelect, loading }: Props) {
  const [filter, setFilter] = useState<string>('all');
  const [search, setSearch] = useState('');

  const statuses = ['all', 'active', 'responding', 'resolved'];
  const filtered = incidents.filter(i => {
    if (filter !== 'all' && i.status !== filter) return false;
    if (search && !i.description.toLowerCase().includes(search.toLowerCase()) &&
        !i.location.address.toLowerCase().includes(search.toLowerCase()) &&
        !i.type.includes(search.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="flex flex-col h-full">
      {/* Search + filter */}
      <div className="p-4 border-b border-slate-700 space-y-3">
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search incidents…"
          className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
        />
        <div className="flex gap-2">
          <Filter size={14} className="text-slate-400 mt-1" />
          {statuses.map(s => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-colors capitalize ${
                filter === s ? 'bg-cyan-600 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Count */}
      <div className="px-4 py-2 text-xs text-slate-500">
        {filtered.length} incident{filtered.length !== 1 ? 's' : ''}
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto">
        {loading && (
          <div className="flex items-center justify-center h-32 text-slate-400 text-sm">
            Loading incidents…
          </div>
        )}
        {!loading && filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center h-32 text-slate-500 text-sm gap-2">
            <span className="text-2xl">✅</span>
            No incidents found
          </div>
        )}
        {filtered.map(incident => (
          <button
            key={incident.id}
            onClick={() => onSelect?.(incident)}
            className="w-full text-left px-4 py-3 border-b border-slate-800 hover:bg-slate-800 transition-colors flex items-start gap-3"
          >
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 text-xl"
              style={{ background: `${TYPE_COLORS[incident.type]}25`, border: `1px solid ${TYPE_COLORS[incident.type]}50` }}
            >
              {TYPE_ICONS[incident.type] || '❗'}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <span className="font-medium text-sm text-white capitalize">
                  {incident.type.replace('_', ' ')}
                </span>
                <span className={`px-2 py-0.5 rounded-full text-xs ${LEVEL_STYLES[incident.level] || ''}`}>
                  {incident.level}
                </span>
                <span className={`px-2 py-0.5 rounded-full text-xs ml-auto ${STATUS_STYLES[incident.status] || ''}`}>
                  {incident.status}
                </span>
              </div>
              <p className="text-xs text-slate-400 truncate mb-1">{incident.description}</p>
              <div className="flex items-center gap-3 text-xs text-slate-500">
                <span className="flex items-center gap-1">
                  <MapPin size={10} />
                  {incident.location.lga}
                </span>
                <span className="flex items-center gap-1">
                  <Clock size={10} />
                  {formatDistanceToNow(new Date(incident.reportedAt), { addSuffix: true })}
                </span>
                {incident.respondersAssigned.length > 0 && (
                  <span className="text-cyan-400">
                    {incident.respondersAssigned.length} responder{incident.respondersAssigned.length > 1 ? 's' : ''}
                  </span>
                )}
              </div>
            </div>
            <ChevronRight size={16} className="text-slate-600 mt-1 shrink-0" />
          </button>
        ))}
      </div>
    </div>
  );
}
