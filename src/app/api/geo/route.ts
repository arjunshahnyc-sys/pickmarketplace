// Country-level destination default for the picker. Vercel sets
// x-vercel-ip-country on every request; locally the header is absent and
// the response is { destination: null }, which leaves the US default.
// Nothing is logged or stored; see lib/landedCost/geo.ts for the posture.

import { NextRequest, NextResponse } from 'next/server';
import { landedCostEnabled } from '@/lib/flags';
import { geoDefaultDestination } from '@/lib/landedCost/geo';

export function GET(req: NextRequest) {
  // Flag off: this surface does not exist.
  if (!landedCostEnabled()) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
  return NextResponse.json({
    destination: geoDefaultDestination(
      req.headers.get('x-vercel-ip-country'),
      req.headers.get('x-vercel-ip-country-region')
    ),
  });
}
