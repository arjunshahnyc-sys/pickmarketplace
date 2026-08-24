import { ImageResponse } from 'next/og';

export const runtime = 'edge';

export async function GET() {
  return new ImageResponse(
    (
      <div
        style={{
          height: '100%',
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#FAFAF8',
          backgroundImage: 'radial-gradient(circle at 25% 25%, rgba(42, 157, 143, 0.08) 0%, transparent 50%), radial-gradient(circle at 75% 75%, rgba(255, 107, 53, 0.08) 0%, transparent 50%)',
        }}
      >
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '24px',
          }}
        >
          <div
            style={{
              fontSize: 120,
              fontWeight: 700,
              letterSpacing: '-0.03em',
              color: '#1A1A1A',
              display: 'flex',
            }}
          >
            Pick
          </div>
          <div
            style={{
              fontSize: 48,
              fontWeight: 500,
              color: '#737373',
              display: 'flex',
            }}
          >
            Never Overpay Again
          </div>
          <div
            style={{
              marginTop: '40px',
              display: 'flex',
              gap: '48px',
              fontSize: 32,
              color: '#2A9D8F',
              fontWeight: 600,
            }}
          >
            {/* Claims here must match what the site actually does: it checks
                12 named stores (plus marketplace sellers), verifies sellers,
                and costs nothing. "50+ / Real-Time / AI Powered" did not. */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <div style={{ fontSize: 64, fontWeight: 700 }}>12+</div>
              <div style={{ fontSize: 24, color: '#737373', marginTop: '8px' }}>Major Stores</div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <div style={{ fontSize: 64, fontWeight: 700 }}>Verified</div>
              <div style={{ fontSize: 24, color: '#737373', marginTop: '8px' }}>Sellers</div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <div style={{ fontSize: 64, fontWeight: 700 }}>Free</div>
              <div style={{ fontSize: 24, color: '#737373', marginTop: '8px' }}>To Use</div>
            </div>
          </div>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
    }
  );
}
