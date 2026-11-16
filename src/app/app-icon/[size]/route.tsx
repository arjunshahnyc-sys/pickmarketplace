import { ImageResponse } from 'next/og';

// Home screen icons for the web app manifest (app/manifest.ts): the same
// white bag on brand teal as the browser tab icon (app/icon.tsx), at 192 and
// 512 pixels. The square is full bleed and the bag sits inside the middle
// 60%, so Android can crop it to a circle or rounded square ("maskable")
// without cutting the bag. Prerendered at build for the two sizes; any
// other size is a 404.
const SIZES = [192, 512];

export function generateStaticParams() {
  return SIZES.map((size) => ({ size: String(size) }));
}

export const dynamicParams = false;

export async function GET(_request: Request, { params }: { params: Promise<{ size: string }> }) {
  const size = Number((await params).size);
  if (!SIZES.includes(size)) return new Response('Not found', { status: 404 });
  const bag = Math.round(size * 0.56);
  return new ImageResponse(
    (
      <div
        style={{
          background: '#2A9D8F',
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <svg
          width={bag}
          height={bag}
          viewBox="0 0 24 24"
          fill="none"
          stroke="white"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
          <line x1="3" y1="6" x2="21" y2="6" />
          <path d="M16 10a4 4 0 0 1-8 0" />
        </svg>
      </div>
    ),
    { width: size, height: size }
  );
}
