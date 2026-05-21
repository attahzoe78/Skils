import { NextRequest, NextResponse } from 'next/server';
import { addIncident, EmergencyType, IncidentLevel } from '@/lib/store';

const LEVEL_MAP: Record<EmergencyType, IncidentLevel> = {
  terrorism: 'critical',
  bomb_threat: 'critical',
  kidnapping: 'high',
  robbery: 'high',
  civil_unrest: 'high',
  fire: 'high',
  medical: 'medium',
};

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { type, description, lat, lng, address, lga, phoneNumber, reportedBy } = body;

    if (!type || !lat || !lng) {
      return NextResponse.json({ error: 'type, lat, lng are required' }, { status: 400 });
    }

    const incident = addIncident({
      type: type as EmergencyType,
      level: LEVEL_MAP[type as EmergencyType] || 'medium',
      location: {
        lat: parseFloat(lat),
        lng: parseFloat(lng),
        address: address || 'Jos, Plateau State',
        lga: lga || 'Jos North',
      },
      description: description || `${type} emergency reported`,
      reportedBy: reportedBy || 'Citizen',
      status: 'active',
      respondersAssigned: [],
      phoneNumber,
    });

    return NextResponse.json({ success: true, incident }, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
}
