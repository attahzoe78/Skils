// In-memory store with seeded data for Jos, Plateau State emergency system
import { v4 as uuidv4 } from 'uuid';

export type EmergencyType =
  | 'medical'
  | 'fire'
  | 'robbery'
  | 'kidnapping'
  | 'terrorism'
  | 'bomb_threat'
  | 'civil_unrest';

export type IncidentLevel = 'critical' | 'high' | 'medium' | 'low';
export type IncidentStatus = 'active' | 'responding' | 'resolved';
export type ResponderType = 'police' | 'medical' | 'fire' | 'military';

export interface GeoLocation {
  lat: number;
  lng: number;
  address: string;
  lga: string;
}

export interface Incident {
  id: string;
  type: EmergencyType;
  level: IncidentLevel;
  location: GeoLocation;
  description: string;
  reportedBy: string;
  reportedAt: string;
  status: IncidentStatus;
  respondersAssigned: string[];
  phoneNumber?: string;
  ussdSession?: string;
  updates: { time: string; message: string }[];
}

export interface Responder {
  id: string;
  name: string;
  type: ResponderType;
  location: { lat: number; lng: number };
  status: 'available' | 'responding' | 'off_duty';
  phone: string;
  unit: string;
  assignedIncident?: string;
}

// Jos, Plateau State LGAs with coordinates
const josAreas: GeoLocation[] = [
  { lat: 9.9236, lng: 8.8910, address: 'Terminus Market, Jos', lga: 'Jos North' },
  { lat: 9.9310, lng: 8.8800, address: 'Bukuru Express Way, Jos', lga: 'Jos South' },
  { lat: 9.9100, lng: 8.9050, address: 'Rayfield, Jos', lga: 'Jos North' },
  { lat: 9.9480, lng: 8.8700, address: 'Tudun Wada, Jos', lga: 'Jos North' },
  { lat: 9.9050, lng: 8.8600, address: 'Bukuru, Jos South', lga: 'Jos South' },
  { lat: 9.9600, lng: 8.9100, address: 'Angwan Rogo, Jos North', lga: 'Jos North' },
  { lat: 9.9150, lng: 8.8750, address: 'Congo Russia Area, Jos', lga: 'Jos North' },
  { lat: 9.9400, lng: 8.9200, address: 'Dogon Karfe, Jos', lga: 'Jos East' },
  { lat: 9.9200, lng: 8.8500, address: 'Gyel, Jos South', lga: 'Jos South' },
  { lat: 9.9700, lng: 8.8850, address: 'Nasarawa, Jos North', lga: 'Jos North' },
];

const incidentDescriptions: Record<EmergencyType, string[]> = {
  medical: [
    'Multiple casualties from road traffic accident',
    'Patient in critical condition, suspected cardiac arrest',
    'Pregnant woman in labor, no transport',
    'Mass food poisoning at local restaurant',
  ],
  fire: [
    'Building engulfed in flames, residents trapped',
    'Market stall fire spreading rapidly',
    'Gas explosion in residential area',
    'Electrical fire at shopping complex',
  ],
  robbery: [
    'Armed robbery at ATM machine',
    'Bank robbery in progress, suspects armed',
    'Carjacking reported on highway',
    'Armed thugs attacking traders at market',
  ],
  kidnapping: [
    'School children abducted near school gate',
    'Businessman reported missing, suspected kidnap',
    'Ransom demand received for missing person',
    'Child abduction reported by parent',
  ],
  terrorism: [
    'Suspicious individuals spotted with weapons',
    'Reported militant activity near border area',
    'Armed group sighted on outskirts of city',
    'Intelligence report of planned attack',
  ],
  bomb_threat: [
    'Suspicious package found at public venue',
    'Bomb threat call received at government building',
    'Unattended bag at bus station',
    'Threat call to church/mosque event',
  ],
  civil_unrest: [
    'Violent protest blocking major road',
    'Communal clash between groups reported',
    'Youth restiveness, property destruction',
    'Political gathering turning violent',
  ],
};

function randomLevel(): IncidentLevel {
  const r = Math.random();
  if (r < 0.2) return 'critical';
  if (r < 0.5) return 'high';
  if (r < 0.8) return 'medium';
  return 'low';
}

function randomStatus(): IncidentStatus {
  const r = Math.random();
  if (r < 0.3) return 'active';
  if (r < 0.7) return 'responding';
  return 'resolved';
}

function hoursAgo(h: number): string {
  return new Date(Date.now() - h * 3600000).toISOString();
}

function seedIncidents(): Incident[] {
  const types: EmergencyType[] = [
    'medical', 'fire', 'robbery', 'kidnapping', 'civil_unrest',
    'medical', 'robbery', 'fire', 'bomb_threat', 'terrorism',
    'medical', 'civil_unrest', 'robbery', 'fire', 'kidnapping',
  ];
  return types.map((type, i) => {
    const area = josAreas[i % josAreas.length];
    const descs = incidentDescriptions[type];
    return {
      id: uuidv4(),
      type,
      level: randomLevel(),
      location: {
        ...area,
        lat: area.lat + (Math.random() - 0.5) * 0.02,
        lng: area.lng + (Math.random() - 0.5) * 0.02,
      },
      description: descs[Math.floor(Math.random() * descs.length)],
      reportedBy: ['Citizen', 'Police Patrol', 'FRSC', 'Hospital'][Math.floor(Math.random() * 4)],
      reportedAt: hoursAgo(Math.random() * 48),
      status: randomStatus(),
      respondersAssigned: [],
      updates: [],
    };
  });
}

function seedResponders(): Responder[] {
  return [
    { id: uuidv4(), name: 'Sgt. Bala Musa', type: 'police', location: { lat: 9.9240, lng: 8.8920 }, status: 'available', phone: '080111222333', unit: 'Divisional Police Jos North' },
    { id: uuidv4(), name: 'Cpl. Fatima Ahmed', type: 'police', location: { lat: 9.9300, lng: 8.8800 }, status: 'available', phone: '080222333444', unit: 'Mobile Police Unit 5' },
    { id: uuidv4(), name: 'Dr. Emmanuel Jang', type: 'medical', location: { lat: 9.9180, lng: 8.8870 }, status: 'available', phone: '080333444555', unit: 'BUTH Emergency Response' },
    { id: uuidv4(), name: 'Nurse Aisha Sule', type: 'medical', location: { lat: 9.9350, lng: 8.9000 }, status: 'responding', phone: '080444555666', unit: 'JUTH Ambulance Unit' },
    { id: uuidv4(), name: 'FF Yakubu Danladi', type: 'fire', location: { lat: 9.9220, lng: 8.8780 }, status: 'available', phone: '080555666777', unit: 'Jos Fire Service Station 1' },
    { id: uuidv4(), name: 'FF Peter Nwachukwu', type: 'fire', location: { lat: 9.9410, lng: 8.8950 }, status: 'available', phone: '080666777888', unit: 'Jos Fire Service Station 2' },
    { id: uuidv4(), name: 'Capt. Ibrahim Lawal', type: 'military', location: { lat: 9.9500, lng: 8.8700 }, status: 'available', phone: '080777888999', unit: '3 Div Nigerian Army' },
    { id: uuidv4(), name: 'Lt. Chioma Eze', type: 'military', location: { lat: 9.9100, lng: 8.9100 }, status: 'off_duty', phone: '080888999000', unit: 'JTF Plateau State' },
  ];
}

// Global singleton store
const globalStore = global as typeof global & {
  __josEmergencyStore?: {
    incidents: Incident[];
    responders: Responder[];
  };
};

if (!globalStore.__josEmergencyStore) {
  globalStore.__josEmergencyStore = {
    incidents: seedIncidents(),
    responders: seedResponders(),
  };
}

export const store = globalStore.__josEmergencyStore;

export function addIncident(incident: Omit<Incident, 'id' | 'reportedAt' | 'updates'>): Incident {
  const newIncident: Incident = {
    ...incident,
    id: uuidv4(),
    reportedAt: new Date().toISOString(),
    updates: [{ time: new Date().toISOString(), message: 'Incident reported' }],
  };
  store.incidents.unshift(newIncident);
  return newIncident;
}

export function updateIncidentStatus(id: string, status: IncidentStatus, message?: string): Incident | null {
  const incident = store.incidents.find(i => i.id === id);
  if (!incident) return null;
  incident.status = status;
  if (message) {
    incident.updates.push({ time: new Date().toISOString(), message });
  }
  return incident;
}

export function assignResponder(incidentId: string, responderId: string): boolean {
  const incident = store.incidents.find(i => i.id === incidentId);
  const responder = store.responders.find(r => r.id === responderId);
  if (!incident || !responder) return false;
  if (!incident.respondersAssigned.includes(responderId)) {
    incident.respondersAssigned.push(responderId);
    incident.status = 'responding';
    incident.updates.push({ time: new Date().toISOString(), message: `${responder.name} dispatched` });
  }
  responder.status = 'responding';
  responder.assignedIncident = incidentId;
  return true;
}
