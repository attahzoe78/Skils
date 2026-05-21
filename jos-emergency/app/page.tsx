'use client';
import { useState, useEffect, useCallback } from 'react';
import dynamic from 'next/dynamic';
import {
  AlertTriangle, Map, List, Brain, Phone, Radio,
  Bell, Settings, RefreshCw, X, ChevronDown, ChevronUp,
  ShieldAlert, Flame, Stethoscope, Users, Activity
} from 'lucide-react';

// Dynamically import map to avoid SSR issues with Google Maps
const EmergencyMap = dynamic(() => import('@/components/EmergencyMap'), { ssr: false });
const IncidentReporter = dynamic(() => import('@/components/IncidentReporter'), { ssr: false });
const IncidentList = dynamic(() => import('@/components/IncidentList'), { ssr: false });
const AIAnalytics = dynamic(() => import('@/components/AIAnalytics'), { ssr: false });
const USSDSimulator = dynamic(() => import('@/components/USSDSimulator'), { ssr: false });
const ResponderPanel = dynamic(() => import('@/components/ResponderPanel'), { ssr: false });

type Tab = 'map' | 'incidents' | 'analytics' | 'ussd' | 'responders';
type Panel = 'report' | 'incident-detail' | null;

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

interface Hotspot {
  lat: number;
  lng: number;
  risk: number;
  area: string;
  primaryThreat: string;
  incidentCount: number;
}

const TYPE_ICONS: Record<string, string> = {
  medical: '🏥', fire: '🔥', robbery: '🔫', kidnapping: '🚨',
  terrorism: '⚠️', bomb_threat: '💣', civil_unrest: '👥',
};

const LEVEL_BG: Record<string, string> = {
  critical: 'bg-red-600', high: 'bg-orange-500', medium: 'bg-amber-500', low: 'bg-green-500',
};

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState<Tab>('map');
  const [panel, setPanel] = useState<Panel>(null);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [hotspots, setHotspots] = useState<Hotspot[]>([]);
  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(null);
  const [loading, setLoading] = useState(true);
  const [showHeatmap, setShowHeatmap] = useState(false);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [alertBanner, setAlertBanner] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState(new Date());
  const [isInstallable, setIsInstallable] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<Event | null>(null);
  const [statsVisible, setStatsVisible] = useState(true);

  const loadData = useCallback(async () => {
    try {
      const [incRes, analyticsRes] = await Promise.all([
        fetch('/api/incidents'),
        fetch('/api/analytics'),
      ]);
      const incData = await incRes.json();
      const analyticsData = await analyticsRes.json();
      setIncidents(incData.incidents);
      setHotspots(analyticsData.hotspots || []);
      setLastRefresh(new Date());

      // Check for new critical incidents
      const critical = incData.incidents.filter((i: Incident) => i.status === 'active' && i.level === 'critical');
      if (critical.length > 0) {
        setAlertBanner(`🚨 ${critical.length} CRITICAL incident${critical.length > 1 ? 's' : ''} active — immediate response required`);
      }
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 20000); // refresh every 20s
    return () => clearInterval(interval);
  }, [loadData]);

  useEffect(() => {
    navigator.geolocation?.getCurrentPosition(
      pos => setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => {},
      { enableHighAccuracy: true, timeout: 8000 }
    );
  }, []);

  useEffect(() => {
    const handler = (e: Event) => { e.preventDefault(); setDeferredPrompt(e); setIsInstallable(true); };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstallPWA = async () => {
    if (!deferredPrompt) return;
    (deferredPrompt as unknown as { prompt: () => void }).prompt();
    setIsInstallable(false);
  };

  const stats = {
    active: incidents.filter(i => i.status === 'active').length,
    responding: incidents.filter(i => i.status === 'responding').length,
    resolved: incidents.filter(i => i.status === 'resolved').length,
    critical: incidents.filter(i => i.level === 'critical' && i.status !== 'resolved').length,
  };

  const tabs: { key: Tab; label: string; icon: React.ReactNode }[] = [
    { key: 'map', label: 'Map', icon: <Map size={20} /> },
    { key: 'incidents', label: 'Incidents', icon: <List size={20} /> },
    { key: 'analytics', label: 'AI Analysis', icon: <Brain size={20} /> },
    { key: 'ussd', label: 'USSD', icon: <Radio size={20} /> },
    { key: 'responders', label: 'Units', icon: <Users size={20} /> },
  ];

  return (
    <div className="flex flex-col h-screen bg-slate-950 overflow-hidden">
      {/* Top header */}
      <header className="flex items-center gap-3 px-4 py-3 bg-slate-900 border-b border-slate-800 shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-red-600 rounded-lg flex items-center justify-center">
            <ShieldAlert size={18} className="text-white" />
          </div>
          <div>
            <h1 className="font-bold text-sm text-white leading-none">JOS EMERGENCY</h1>
            <p className="text-xs text-slate-500 leading-none">Plateau State Rapid Response</p>
          </div>
        </div>

        <div className="ml-auto flex items-center gap-2">
          {/* Live indicator */}
          <div className="flex items-center gap-1.5 text-xs text-green-400">
            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
            LIVE
          </div>

          {/* Refresh */}
          <button onClick={loadData} className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors">
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </button>

          {/* Notifications */}
          <button className="relative p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors">
            <Bell size={14} />
            {stats.active > 0 && (
              <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-600 rounded-full text-xs flex items-center justify-center text-white font-bold" style={{ fontSize: 9 }}>
                {stats.active}
              </span>
            )}
          </button>
        </div>
      </header>

      {/* Critical alert banner */}
      {alertBanner && (
        <div className="flex items-center gap-3 px-4 py-2.5 bg-red-900 border-b border-red-700 shrink-0">
          <AlertTriangle size={16} className="text-red-300 shrink-0" />
          <span className="text-sm text-red-200 flex-1">{alertBanner}</span>
          <button onClick={() => setAlertBanner(null)} className="text-red-400 hover:text-red-200">
            <X size={14} />
          </button>
        </div>
      )}

      {/* Stats bar */}
      <div
        className="bg-slate-900 border-b border-slate-800 shrink-0 cursor-pointer"
        onClick={() => setStatsVisible(v => !v)}
      >
        <div className="flex items-center px-4 py-1">
          <div className="flex gap-4 flex-1">
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 bg-red-500 rounded-full" />
              <span className="text-xs text-slate-400">{stats.active} Active</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 bg-amber-500 rounded-full" />
              <span className="text-xs text-slate-400">{stats.responding} Responding</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 bg-green-500 rounded-full" />
              <span className="text-xs text-slate-400">{stats.resolved} Resolved</span>
            </div>
            {stats.critical > 0 && (
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 bg-red-600 rounded-full animate-pulse" />
                <span className="text-xs text-red-400 font-medium">{stats.critical} CRITICAL</span>
              </div>
            )}
          </div>
          {statsVisible ? <ChevronUp size={14} className="text-slate-600" /> : <ChevronDown size={14} className="text-slate-600" />}
        </div>

        {statsVisible && (
          <div className="grid grid-cols-4 gap-px bg-slate-800 border-t border-slate-800">
            {[
              { label: 'Medical', icon: <Stethoscope size={14} />, count: incidents.filter(i => i.type === 'medical' && i.status !== 'resolved').length, color: '#0891b2' },
              { label: 'Fire', icon: <Flame size={14} />, count: incidents.filter(i => i.type === 'fire' && i.status !== 'resolved').length, color: '#ea580c' },
              { label: 'Security', icon: <ShieldAlert size={14} />, count: incidents.filter(i => ['robbery', 'kidnapping', 'terrorism'].includes(i.type) && i.status !== 'resolved').length, color: '#dc2626' },
              { label: 'Civil', icon: <Activity size={14} />, count: incidents.filter(i => ['civil_unrest', 'bomb_threat'].includes(i.type) && i.status !== 'resolved').length, color: '#d97706' },
            ].map(s => (
              <div key={s.label} className="flex items-center gap-2 px-3 py-2 bg-slate-900">
                <span style={{ color: s.color }}>{s.icon}</span>
                <div>
                  <p className="text-lg font-bold text-white leading-none">{s.count}</p>
                  <p className="text-xs text-slate-500">{s.label}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Main content */}
      <main className="flex-1 overflow-hidden relative">
        {/* Map view (always rendered for performance) */}
        <div className={`absolute inset-0 ${activeTab === 'map' ? 'z-10' : 'z-0 pointer-events-none opacity-0'}`}>
          <div className="h-full relative">
            <EmergencyMap
              incidents={incidents}
              hotspots={hotspots}
              onSelectIncident={inc => { setSelectedIncident(inc); setPanel('incident-detail'); }}
              userLocation={userLocation}
              showHeatmap={showHeatmap}
            />

            {/* Map controls overlay */}
            <div className="absolute top-3 right-3 flex flex-col gap-2 z-20">
              <button
                onClick={() => setShowHeatmap(v => !v)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors shadow-lg ${
                  showHeatmap ? 'bg-purple-700 text-white' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
              >
                {showHeatmap ? '🔥 Heatmap ON' : '🗺 Heatmap'}
              </button>
            </div>

            {/* Map legend */}
            <div className="absolute bottom-20 left-3 glass-card p-3 z-20">
              <p className="text-xs text-slate-400 font-medium mb-2">Legend</p>
              <div className="space-y-1">
                {[
                  { label: 'Medical', color: '#0891b2' },
                  { label: 'Fire', color: '#ea580c' },
                  { label: 'Robbery', color: '#dc2626' },
                  { label: 'Other', color: '#7c3aed' },
                ].map(l => (
                  <div key={l.label} className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ background: l.color }} />
                    <span className="text-xs text-slate-400">{l.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Incidents list */}
        <div className={`absolute inset-0 overflow-y-auto ${activeTab === 'incidents' ? 'z-10' : 'z-0 pointer-events-none opacity-0'}`}>
          <IncidentList
            incidents={incidents}
            loading={loading}
            onSelect={inc => { setSelectedIncident(inc); setPanel('incident-detail'); }}
          />
        </div>

        {/* AI Analytics */}
        <div className={`absolute inset-0 overflow-y-auto ${activeTab === 'analytics' ? 'z-10' : 'z-0 pointer-events-none opacity-0'}`}>
          <AIAnalytics />
        </div>

        {/* USSD Simulator */}
        <div className={`absolute inset-0 overflow-y-auto ${activeTab === 'ussd' ? 'z-10' : 'z-0 pointer-events-none opacity-0'}`}>
          <USSDSimulator />
        </div>

        {/* Responder panel */}
        <div className={`absolute inset-0 overflow-y-auto ${activeTab === 'responders' ? 'z-10' : 'z-0 pointer-events-none opacity-0'}`}>
          <ResponderPanel
            selectedIncidentId={selectedIncident?.id}
            onDispatch={() => loadData()}
          />
        </div>

        {/* Incident detail sheet */}
        {panel === 'incident-detail' && selectedIncident && (
          <div className="absolute inset-0 z-30 bg-black/60 flex items-end justify-center" onClick={() => setPanel(null)}>
            <div className="w-full max-w-lg bg-slate-900 rounded-t-2xl border-t border-slate-700 max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between p-4 border-b border-slate-700">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{TYPE_ICONS[selectedIncident.type] || '❗'}</span>
                  <div>
                    <h3 className="font-bold text-white capitalize">{selectedIncident.type.replace('_', ' ')} Emergency</h3>
                    <p className="text-xs text-slate-400">{selectedIncident.location.address}</p>
                  </div>
                </div>
                <button onClick={() => setPanel(null)} className="text-slate-400 hover:text-white p-1">
                  <X size={20} />
                </button>
              </div>
              <div className="p-4 space-y-4">
                <div className="flex gap-2">
                  <span className={`px-2 py-0.5 rounded-full text-xs ${LEVEL_BG[selectedIncident.level]} text-white`}>
                    {selectedIncident.level.toUpperCase()}
                  </span>
                  <span className={`px-2 py-0.5 rounded-full text-xs ${
                    selectedIncident.status === 'active' ? 'bg-red-900 text-red-300' :
                    selectedIncident.status === 'responding' ? 'bg-amber-900 text-amber-300' :
                    'bg-green-900 text-green-300'
                  }`}>
                    {selectedIncident.status.toUpperCase()}
                  </span>
                  <span className="text-xs text-slate-400 ml-auto">
                    {new Date(selectedIncident.reportedAt).toLocaleString('en-NG')}
                  </span>
                </div>
                <p className="text-sm text-slate-300">{selectedIncident.description}</p>
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="bg-slate-800 rounded-xl p-3">
                    <p className="text-slate-500 mb-1">Reported By</p>
                    <p className="text-white font-medium">{selectedIncident.reportedBy}</p>
                  </div>
                  <div className="bg-slate-800 rounded-xl p-3">
                    <p className="text-slate-500 mb-1">Responders</p>
                    <p className="text-white font-medium">{selectedIncident.respondersAssigned.length} assigned</p>
                  </div>
                  <div className="bg-slate-800 rounded-xl p-3 col-span-2">
                    <p className="text-slate-500 mb-1">GPS Coordinates</p>
                    <p className="text-white font-mono">{selectedIncident.location.lat.toFixed(6)}, {selectedIncident.location.lng.toFixed(6)}</p>
                  </div>
                </div>
                {selectedIncident.updates.length > 0 && (
                  <div>
                    <p className="text-xs text-slate-500 mb-2 font-medium">TIMELINE</p>
                    <div className="space-y-2">
                      {selectedIncident.updates.map((u, i) => (
                        <div key={i} className="flex gap-3 text-xs">
                          <span className="text-slate-500 whitespace-nowrap">{new Date(u.time).toLocaleTimeString('en-NG')}</span>
                          <span className="text-slate-300">{u.message}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                <div className="flex gap-2 pt-2">
                  <button
                    onClick={() => { setActiveTab('responders'); setPanel(null); }}
                    className="flex-1 py-3 rounded-xl bg-cyan-700 hover:bg-cyan-600 text-white text-sm font-medium transition-colors"
                  >
                    Dispatch Responder
                  </button>
                  <a
                    href="tel:112"
                    className="px-4 py-3 rounded-xl bg-red-700 hover:bg-red-600 text-white text-sm font-medium transition-colors flex items-center gap-2"
                  >
                    <Phone size={16} /> 112
                  </a>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Report emergency slide-up panel */}
        {panel === 'report' && (
          <div className="absolute inset-0 z-30 bg-black/60 flex items-end justify-center" onClick={() => setPanel(null)}>
            <div className="w-full max-w-lg bg-slate-900 rounded-t-2xl border-t border-slate-700 h-[90vh]" onClick={e => e.stopPropagation()}>
              <div className="w-12 h-1 bg-slate-600 rounded-full mx-auto mt-2 mb-0" />
              <IncidentReporter
                onClose={() => setPanel(null)}
                onSuccess={() => { setPanel(null); loadData(); }}
              />
            </div>
          </div>
        )}
      </main>

      {/* SOS Button (always visible) */}
      {panel === null && (
        <div className="absolute bottom-20 right-4 z-20">
          <button
            onClick={() => setPanel('report')}
            className="w-16 h-16 bg-red-600 hover:bg-red-500 active:bg-red-700 rounded-full shadow-2xl flex items-center justify-center transition-all hover:scale-110 active:scale-95"
            style={{ boxShadow: '0 0 30px rgba(220, 38, 38, 0.6)' }}
          >
            <div className="text-white text-center">
              <AlertTriangle size={22} className="mx-auto" />
              <span className="text-xs font-bold leading-none">SOS</span>
            </div>
          </button>
        </div>
      )}

      {/* PWA install prompt */}
      {isInstallable && (
        <div className="absolute bottom-20 left-4 right-20 glass-card p-3 z-20 flex items-center gap-3">
          <div className="w-8 h-8 bg-red-600 rounded-lg flex items-center justify-center shrink-0">
            <ShieldAlert size={16} className="text-white" />
          </div>
          <div className="flex-1">
            <p className="text-xs font-medium text-white">Install JosER App</p>
            <p className="text-xs text-slate-400">Works offline • Faster access</p>
          </div>
          <button onClick={handleInstallPWA} className="px-3 py-1.5 bg-cyan-700 hover:bg-cyan-600 text-white text-xs rounded-lg font-medium">
            Install
          </button>
          <button onClick={() => setIsInstallable(false)} className="text-slate-500 hover:text-slate-300">
            <X size={14} />
          </button>
        </div>
      )}

      {/* Bottom navigation */}
      <nav className="mobile-nav shrink-0 safe-area-bottom">
        <div className="flex">
          {tabs.map(tab => (
            <button
              key={tab.key}
              onClick={() => { setActiveTab(tab.key); setPanel(null); }}
              className={`flex-1 flex flex-col items-center gap-1 py-3 transition-colors ${
                activeTab === tab.key
                  ? 'text-cyan-400'
                  : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              <div className={`p-1 rounded-lg transition-all ${activeTab === tab.key ? 'bg-cyan-900/50' : ''}`}>
                {tab.icon}
              </div>
              <span className="text-xs font-medium">{tab.label}</span>
              {tab.key === 'incidents' && stats.active > 0 && (
                <span className="absolute top-1 w-4 h-4 bg-red-600 rounded-full text-white text-xs flex items-center justify-center" style={{ fontSize: 9, transform: 'translateX(8px)' }}>
                  {stats.active}
                </span>
              )}
            </button>
          ))}
        </div>
      </nav>
    </div>
  );
}
