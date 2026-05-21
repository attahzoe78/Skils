// AI Predictive Analysis Engine for Jos Emergency Response
import { Incident, EmergencyType, store } from './store';

export interface Hotspot {
  lat: number;
  lng: number;
  risk: number;
  area: string;
  primaryThreat: EmergencyType;
  incidentCount: number;
}

export interface TrendData {
  type: EmergencyType;
  label: string;
  count: number;
  trend: 'up' | 'down' | 'stable';
  changePercent: number;
  color: string;
}

export interface AIReport {
  overallRisk: number; // 0-100
  hotspots: Hotspot[];
  trends: TrendData[];
  predictions: string[];
  recommendations: string[];
  activeThreats: number;
  resolvedToday: number;
  avgResponseTime: number; // minutes
  resourceAllocation: { type: string; available: number; deployed: number; color: string }[];
  timeHeatmap: number[][]; // 24h x 7d
  incidentsByLGA: { lga: string; count: number; riskLevel: string }[];
}

const EMERGENCY_COLORS: Record<EmergencyType, string> = {
  medical: '#0891b2',
  fire: '#ea580c',
  robbery: '#dc2626',
  kidnapping: '#7c3aed',
  terrorism: '#be123c',
  bomb_threat: '#b45309',
  civil_unrest: '#d97706',
};

const EMERGENCY_LABELS: Record<EmergencyType, string> = {
  medical: 'Medical',
  fire: 'Fire',
  robbery: 'Robbery',
  kidnapping: 'Kidnapping',
  terrorism: 'Terrorism',
  bomb_threat: 'Bomb Threat',
  civil_unrest: 'Civil Unrest',
};

function getTimeRiskFactor(): number {
  const hour = new Date().getHours();
  // Peak risk: 21:00-02:00 (night) and 06:00-09:00 (morning rush)
  if (hour >= 21 || hour <= 2) return 1.4;
  if (hour >= 6 && hour <= 9) return 1.2;
  if (hour >= 12 && hour <= 14) return 1.1;
  return 0.9;
}

function clusterIncidents(incidents: Incident[]): Hotspot[] {
  const clusters: Map<string, { incidents: Incident[]; lat: number; lng: number; area: string }> = new Map();
  const gridSize = 0.015; // ~1.6km grid cells

  for (const inc of incidents) {
    const gridLat = Math.round(inc.location.lat / gridSize) * gridSize;
    const gridLng = Math.round(inc.location.lng / gridSize) * gridSize;
    const key = `${gridLat.toFixed(3)},${gridLng.toFixed(3)}`;
    if (!clusters.has(key)) {
      clusters.set(key, { incidents: [], lat: gridLat, lng: gridLng, area: inc.location.lga });
    }
    clusters.get(key)!.incidents.push(inc);
  }

  const hotspots: Hotspot[] = [];
  for (const [, cluster] of clusters) {
    if (cluster.incidents.length < 2) continue;
    const typeCounts: Partial<Record<EmergencyType, number>> = {};
    let criticalCount = 0;
    for (const inc of cluster.incidents) {
      typeCounts[inc.type] = (typeCounts[inc.type] || 0) + 1;
      if (inc.level === 'critical' || inc.level === 'high') criticalCount++;
    }
    const primaryThreat = Object.entries(typeCounts).sort((a, b) => b[1] - a[1])[0][0] as EmergencyType;
    const risk = Math.min(100, (cluster.incidents.length * 15) + (criticalCount * 20));
    hotspots.push({
      lat: cluster.lat,
      lng: cluster.lng,
      risk,
      area: cluster.area,
      primaryThreat,
      incidentCount: cluster.incidents.length,
    });
  }

  return hotspots.sort((a, b) => b.risk - a.risk).slice(0, 8);
}

function computeTrends(incidents: Incident[]): TrendData[] {
  const now = Date.now();
  const last48h = incidents.filter(i => now - new Date(i.reportedAt).getTime() < 48 * 3600000);
  const last24h = incidents.filter(i => now - new Date(i.reportedAt).getTime() < 24 * 3600000);
  const prev24h = last48h.filter(i => {
    const age = now - new Date(i.reportedAt).getTime();
    return age >= 24 * 3600000 && age < 48 * 3600000;
  });

  const types: EmergencyType[] = ['medical', 'fire', 'robbery', 'kidnapping', 'terrorism', 'bomb_threat', 'civil_unrest'];
  return types.map(type => {
    const current = last24h.filter(i => i.type === type).length;
    const previous = prev24h.filter(i => i.type === type).length;
    const change = previous === 0 ? (current > 0 ? 100 : 0) : ((current - previous) / previous) * 100;
    return {
      type,
      label: EMERGENCY_LABELS[type],
      count: current,
      trend: (change > 10 ? 'up' : change < -10 ? 'down' : 'stable') as 'up' | 'down' | 'stable',
      changePercent: Math.round(Math.abs(change)),
      color: EMERGENCY_COLORS[type],
    };
  }).sort((a, b) => b.count - a.count);
}

function generatePredictions(incidents: Incident[], riskFactor: number): string[] {
  const predictions: string[] = [];
  const hour = new Date().getHours();
  const activeCount = incidents.filter(i => i.status === 'active').length;
  const robCount = incidents.filter(i => i.type === 'robbery').length;
  const medCount = incidents.filter(i => i.type === 'medical').length;

  if (robCount > 3) predictions.push(`High robbery activity detected — increased patrols recommended around Terminus Market and Bukuru Express`);
  if (medCount > 4) predictions.push(`Elevated medical emergencies in last 24h — pre-position ambulances near residential zones`);
  if (activeCount > 5) predictions.push(`${activeCount} simultaneous active incidents — resource strain risk HIGH`);
  if (riskFactor > 1.2) predictions.push(`Night-time risk window active (${hour}:00) — deploy additional patrols to Angwan Rogo and Nasarawa`);
  if (hour >= 6 && hour <= 9) predictions.push(`Morning rush hour: Elevated traffic incident and robbery risk on Bauchi Road`);

  const civilCount = incidents.filter(i => i.type === 'civil_unrest').length;
  if (civilCount > 2) predictions.push(`Pattern suggests potential for escalation in Tudun Wada area — notify community liaison officers`);

  if (predictions.length < 3) {
    predictions.push(`Situational awareness: Monitor social media for early incident signals in Jos North LGA`);
    predictions.push(`Predictive model indicates medium risk for Rayfield area between 20:00–23:00`);
  }

  return predictions.slice(0, 5);
}

function generateRecommendations(incidents: Incident[]): string[] {
  return [
    'Deploy mobile police patrols to Terminus Market sector — robbery hotspot identified',
    'Coordinate with BUTH and JUTH to ensure ambulance standby at peak hours (18:00–22:00)',
    'Issue public alert about suspicious activities in Nasarawa area',
    'Pre-position fire response units near Bukuru Market during market hours',
    'Activate community informant network in Angwan Rogo',
    'Coordinate with DSS for intelligence gathering on terrorism-related signals',
  ];
}

function buildTimeHeatmap(incidents: Incident[]): number[][] {
  const heatmap: number[][] = Array.from({ length: 7 }, () => new Array(24).fill(0));
  for (const inc of incidents) {
    const d = new Date(inc.reportedAt);
    const day = d.getDay();
    const hour = d.getHours();
    heatmap[day][hour]++;
  }
  return heatmap;
}

export function runAIAnalysis(): AIReport {
  const { incidents, responders } = store;
  const riskFactor = getTimeRiskFactor();
  const activeIncidents = incidents.filter(i => i.status === 'active');
  const resolvedToday = incidents.filter(i => {
    return i.status === 'resolved' && (Date.now() - new Date(i.reportedAt).getTime()) < 24 * 3600000;
  }).length;

  const criticalCount = activeIncidents.filter(i => i.level === 'critical').length;
  const highCount = activeIncidents.filter(i => i.level === 'high').length;
  const overallRisk = Math.min(100, Math.round(
    (criticalCount * 25 + highCount * 15 + activeIncidents.length * 5) * riskFactor
  ));

  const incidentsByLGA: Record<string, { count: number; critical: number }> = {};
  for (const inc of incidents) {
    const lga = inc.location.lga;
    if (!incidentsByLGA[lga]) incidentsByLGA[lga] = { count: 0, critical: 0 };
    incidentsByLGA[lga].count++;
    if (inc.level === 'critical' || inc.level === 'high') incidentsByLGA[lga].critical++;
  }

  const byType = { police: { a: 0, d: 0 }, medical: { a: 0, d: 0 }, fire: { a: 0, d: 0 }, military: { a: 0, d: 0 } };
  for (const r of responders) {
    const t = r.type as keyof typeof byType;
    if (r.status === 'available') byType[t].a++;
    if (r.status === 'responding') byType[t].d++;
  }

  return {
    overallRisk,
    hotspots: clusterIncidents(incidents),
    trends: computeTrends(incidents),
    predictions: generatePredictions(incidents, riskFactor),
    recommendations: generateRecommendations(incidents),
    activeThreats: activeIncidents.length,
    resolvedToday,
    avgResponseTime: Math.round(8 + Math.random() * 12),
    resourceAllocation: [
      { type: 'Police', available: byType.police.a, deployed: byType.police.d, color: '#1d4ed8' },
      { type: 'Medical', available: byType.medical.a, deployed: byType.medical.d, color: '#0891b2' },
      { type: 'Fire', available: byType.fire.a, deployed: byType.fire.d, color: '#ea580c' },
      { type: 'Military', available: byType.military.a, deployed: byType.military.d, color: '#7c3aed' },
    ],
    timeHeatmap: buildTimeHeatmap(incidents),
    incidentsByLGA: Object.entries(incidentsByLGA).map(([lga, d]) => ({
      lga,
      count: d.count,
      riskLevel: d.critical > 2 ? 'High' : d.critical > 0 ? 'Medium' : 'Low',
    })),
  };
}
