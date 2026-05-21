import { NextRequest, NextResponse } from 'next/server';
import { assignResponder, updateIncidentStatus, store } from '@/lib/store';

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { incidentId, responderId } = body;

  if (!incidentId || !responderId) {
    return NextResponse.json({ error: 'incidentId and responderId required' }, { status: 400 });
  }

  const success = assignResponder(incidentId, responderId);
  if (!success) {
    return NextResponse.json({ error: 'Incident or responder not found' }, { status: 404 });
  }

  const incident = store.incidents.find(i => i.id === incidentId);
  return NextResponse.json({ success: true, incident });
}

export async function PATCH(req: NextRequest) {
  const body = await req.json();
  const { incidentId, status, message } = body;

  if (!incidentId || !status) {
    return NextResponse.json({ error: 'incidentId and status required' }, { status: 400 });
  }

  const incident = updateIncidentStatus(incidentId, status, message);
  if (!incident) {
    return NextResponse.json({ error: 'Incident not found' }, { status: 404 });
  }

  return NextResponse.json({ success: true, incident });
}
