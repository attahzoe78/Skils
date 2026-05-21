import { NextResponse } from 'next/server';
import { runAIAnalysis } from '@/lib/ai-analysis';

export async function GET() {
  const report = runAIAnalysis();
  return NextResponse.json(report);
}
