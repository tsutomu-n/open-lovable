import { NextResponse } from 'next/server';
import { getAiModelCatalog } from '@/lib/ai/model-runtime';

export const dynamic = 'force-dynamic';

export async function GET() {
  const catalog = getAiModelCatalog();

  return NextResponse.json(catalog, {
    headers: {
      'Cache-Control': 'no-store',
    },
  });
}
