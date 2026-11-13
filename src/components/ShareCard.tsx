import type { ShareImageContent } from '@/lib/shareImage';

// The share images, as markup for next/og's ImageResponse. That renderer
// knows flexbox and inline styles and little else: every element with more
// than one child is an explicit flex container, and there are no classes.
// 1200 x 630, the size every platform crops from.

const INK = '#07110F';
const MINT = '#8DEBDD';
const TEAL = '#2A9D8F';
const SOFT = 'rgba(255,255,255,0.68)';
const FAINT = 'rgba(255,255,255,0.45)';

const frame = {
  width: '100%',
  height: '100%',
  display: 'flex',
  flexDirection: 'column',
  backgroundColor: INK,
  backgroundImage: `radial-gradient(circle at 0% 0%, rgba(42,157,143,0.5), rgba(7,17,15,0) 58%), radial-gradient(circle at 100% 100%, rgba(141,235,221,0.14), rgba(7,17,15,0) 50%)`,
  color: 'white',
  fontFamily: 'DM Sans',
  padding: '52px 60px',
} as const;

function Brand({ right }: { right: string | null }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
      <div style={{ display: 'flex', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 48, height: 48, borderRadius: 12, backgroundColor: TEAL }}>
          <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
            <line x1="3" y1="6" x2="21" y2="6" />
            <path d="M16 10a4 4 0 0 1-8 0" />
          </svg>
        </div>
        <div style={{ display: 'flex', marginLeft: 14, fontSize: 36, fontWeight: 700 }}>pick</div>
      </div>
      {right && <div style={{ display: 'flex', fontSize: 22, fontWeight: 500, color: FAINT }}>{right}</div>}
    </div>
  );
}

/** A size that fits the name on two lines at most. */
const nameSize = (name: string) => (name.length <= 26 ? 68 : name.length <= 40 ? 58 : name.length <= 52 ? 50 : 44);

/** One comparison page: the product, its lowest confirmed price, and the cheaper match. */
export function ComparisonShareCard({ content }: { content: ShareImageContent }) {
  const { name, price, dupe, checked, dupeWord } = content;
  return (
    <div style={frame}>
      <Brand right={checked ? `Prices checked ${checked}` : 'pickmarketplace.app'} />

      <div style={{ display: 'flex', marginTop: 34, fontSize: nameSize(name), fontWeight: 700, lineHeight: 1.08, letterSpacing: -1 }}>
        {name}
      </div>

      {price ? (
        <div style={{ display: 'flex', marginTop: 'auto', alignItems: 'flex-end', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', fontSize: 20, fontWeight: 700, letterSpacing: 4, color: MINT }}>LOWEST CONFIRMED PRICE</div>
            <div style={{ display: 'flex', fontSize: dupe ? 124 : 150, fontWeight: 900, lineHeight: 1, letterSpacing: -4, marginTop: 6 }}>
              {price.amount}
            </div>
            <div style={{ display: 'flex', fontSize: 28, fontWeight: 500, color: SOFT, marginTop: 8 }}>at {price.store}</div>
          </div>

          {dupe ? (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                width: 540,
                padding: '28px 32px',
                borderRadius: 28,
                border: `2px solid rgba(141,235,221,0.55)`,
                backgroundColor: 'rgba(255,255,255,0.06)',
              }}
            >
              <div style={{ display: 'flex', fontSize: 20, fontWeight: 700, letterSpacing: 4, color: MINT }}>
                {`CHEAPER ${dupeWord.toUpperCase()} · ${dupe.savingsPercent}% LESS`}
              </div>
              <div style={{ display: 'flex', fontSize: 30, fontWeight: 700, lineHeight: 1.18, marginTop: 12 }}>{dupe.name}</div>
              <div style={{ display: 'flex', alignItems: 'baseline', marginTop: 14 }}>
                <div style={{ display: 'flex', fontSize: 76, fontWeight: 900, lineHeight: 1, letterSpacing: -2, color: MINT }}>{dupe.amount}</div>
                <div style={{ display: 'flex', fontSize: 26, fontWeight: 500, color: SOFT, marginLeft: 16 }}>at {dupe.store}</div>
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', width: 420, fontSize: 28, fontWeight: 500, lineHeight: 1.3, color: SOFT, textAlign: 'right', justifyContent: 'flex-end' }}>
              Every store Pick could confirm, side by side.
            </div>
          )}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', marginTop: 'auto' }}>
          <div style={{ display: 'flex', fontSize: 20, fontWeight: 700, letterSpacing: 4, color: MINT }}>PRICE CHECK</div>
          <div style={{ display: 'flex', fontSize: 44, fontWeight: 700, lineHeight: 1.15, marginTop: 10, maxWidth: 900 }}>
            {`Its lowest real price, and a cheaper ${dupeWord} when one is good enough.`}
          </div>
        </div>
      )}
    </div>
  );
}

/** A sale-event price check: the headline and what the page shows. */
export function PriceCheckShareCard({ eventName }: { eventName: string }) {
  return (
    <div style={frame}>
      <Brand right="pickmarketplace.app" />
      <div style={{ display: 'flex', marginTop: 'auto', fontSize: 30, fontWeight: 700, letterSpacing: 10, color: MINT }}>
        {eventName.toUpperCase()}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', marginTop: 14, fontSize: 112, fontWeight: 900, lineHeight: 0.95, letterSpacing: -3 }}>
        <div style={{ display: 'flex' }}>FIND THE TRUE</div>
        <div style={{ display: 'flex' }}>CHEAPEST PRICE</div>
      </div>
      <div style={{ display: 'flex', marginTop: 26, fontSize: 28, fontWeight: 500, lineHeight: 1.3, color: SOFT, maxWidth: 980 }}>
        Today&apos;s confirmed price, the price the store crossed out, and what Google says it usually costs.
      </div>
    </div>
  );
}
