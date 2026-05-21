import { NextRequest, NextResponse } from 'next/server';
import { store } from '@/lib/store';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const status = searchParams.get('status');
  const type = searchParams.get('type');
  const limit = parseInt(searchParams.get('limit') || '100');

  let incidents = [...store.incidents];
  if (status) incidents = incidents.filter(i => i.status === status);
  if (type) incidents = incidents.filter(i => i.type === type);
  incidents = incidents.slice(0, limit);

  return NextResponse.json({ incidents, total: store.incidents.length });
}
