// USSD Callback handler — Africa's Talking compatible format
// POST /api/ussd
// Used as callback URL: https://your-domain/api/ussd
import { NextRequest, NextResponse } from 'next/server';
import { addIncident, EmergencyType, store } from '@/lib/store';

// Jos default coordinates (center)
const JOS_CENTER = { lat: 9.9236, lng: 8.8910, address: 'Jos, Plateau State', lga: 'Jos North' };

const MENU_MAIN = `CON Welcome to JOS Emergency Response
*767*911#

1. Medical Emergency
2. Fire Outbreak
3. Robbery/Armed Attack
4. Kidnapping
5. Civil Unrest
6. Bomb Threat
7. Terrorism
0. My Location Status`;

const MENU_CONFIRM = (type: string) =>
  `CON You selected: ${type}
Press 1 to CONFIRM and alert responders
Press 2 to Cancel`;

const MENU_SUCCESS = (ref: string) =>
  `END Emergency reported!
Ref: ${ref.slice(0, 8).toUpperCase()}
Responders dispatched.
Stay safe. Help is coming.
Call 112 for voice support.`;

const MENU_CANCEL = `END Report cancelled.
Dial *767*911# to report again.
Emergency: Call 112`;

const MENU_STATUS = (count: number) =>
  `END Active incidents near you: ${count}
Emergency hotline: 112
Police: 199
Fire: 01-7940028
Ambulance: 080-3337-7777`;

const TYPE_MAP: Record<string, EmergencyType> = {
  '1': 'medical',
  '2': 'fire',
  '3': 'robbery',
  '4': 'kidnapping',
  '5': 'civil_unrest',
  '6': 'bomb_threat',
  '7': 'terrorism',
};

const TYPE_LABELS: Record<string, string> = {
  '1': 'Medical Emergency',
  '2': 'Fire Outbreak',
  '3': 'Robbery/Armed Attack',
  '4': 'Kidnapping',
  '5': 'Civil Unrest',
  '6': 'Bomb Threat',
  '7': 'Terrorism',
};

export async function POST(req: NextRequest) {
  const contentType = req.headers.get('content-type') || '';
  let sessionId = '', phoneNumber = '', text = '';

  if (contentType.includes('application/json')) {
    const body = await req.json();
    sessionId = body.sessionId || '';
    phoneNumber = body.phoneNumber || '';
    text = body.text || '';
  } else {
    // application/x-www-form-urlencoded (Africa's Talking standard)
    const body = await req.text();
    const params = new URLSearchParams(body);
    sessionId = params.get('sessionId') || '';
    phoneNumber = params.get('phoneNumber') || '';
    text = params.get('text') || '';
  }

  const steps = text.split('*').filter(Boolean);

  // Step 0: Main menu
  if (text === '' || text === '0') {
    if (text === '0') {
      const active = store.incidents.filter(i => i.status === 'active').length;
      return new NextResponse(MENU_STATUS(active), {
        headers: { 'Content-Type': 'text/plain' },
      });
    }
    return new NextResponse(MENU_MAIN, { headers: { 'Content-Type': 'text/plain' } });
  }

  // Step 1: Confirmation menu
  if (steps.length === 1 && TYPE_MAP[steps[0]]) {
    const label = TYPE_LABELS[steps[0]];
    return new NextResponse(MENU_CONFIRM(label), { headers: { 'Content-Type': 'text/plain' } });
  }

  // Step 2: Confirmed — create incident
  if (steps.length === 2 && TYPE_MAP[steps[0]] && steps[1] === '1') {
    const type = TYPE_MAP[steps[0]];
    const incident = addIncident({
      type,
      level: type === 'terrorism' || type === 'bomb_threat' ? 'critical' : 'high',
      location: JOS_CENTER,
      description: `USSD report via ${phoneNumber}: ${TYPE_LABELS[steps[0]]}`,
      reportedBy: 'USSD',
      status: 'active',
      respondersAssigned: [],
      phoneNumber,
      ussdSession: sessionId,
    });
    return new NextResponse(MENU_SUCCESS(incident.id), { headers: { 'Content-Type': 'text/plain' } });
  }

  // Step 2: Cancelled
  if (steps.length === 2 && steps[1] === '2') {
    return new NextResponse(MENU_CANCEL, { headers: { 'Content-Type': 'text/plain' } });
  }

  // Fallback
  return new NextResponse(MENU_MAIN, { headers: { 'Content-Type': 'text/plain' } });
}

// Also support GET for health check
export async function GET() {
  return NextResponse.json({
    service: 'Jos Emergency USSD Handler',
    endpoint: 'POST /api/ussd',
    format: 'Africa\'s Talking USSD Compatible',
    ussdCode: '*767*911#',
    fields: ['sessionId', 'phoneNumber', 'text'],
    status: 'operational',
  });
}
