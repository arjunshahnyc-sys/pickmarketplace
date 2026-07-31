import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV === "development";

// Pragmatic CSP: inline scripts/styles stay allowed (Next hydration, JSON-LD,
// and motion need them), but external script sources, framing, and cross-site
// form posts are blocked. Product images come from arbitrary retailer CDNs,
// hence img-src https:. Dev additions cover HMR (eval + websocket).
const contentSecurityPolicy = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' https: data: blob:",
  `connect-src 'self'${isDev ? " ws:" : ""}`,
  "font-src 'self' data:",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
].join("; ");

const nextConfig: NextConfig = {
  images: {
    // No wildcard here: with one, /_next/image acts as an open proxy for any
    // https URL on the internet. Nothing currently renders through
    // next/image (product images are plain <img>), so this list only
    // matters if that changes — extend it per host when it does.
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'm.media-amazon.com',
      },
      {
        protocol: 'https',
        hostname: 'i5.walmartimages.com',
      },
      {
        protocol: 'https',
        hostname: 'static.nike.com',
      },
      {
        protocol: 'https',
        hostname: 'dyson-h.assetsadobe2.com',
      },
      {
        protocol: 'https',
        hostname: 'images.lululemon.com',
      },
    ],
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "Content-Security-Policy", value: contentSecurityPolicy },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
          { key: "Strict-Transport-Security", value: "max-age=31536000" },
        ],
      },
    ];
  },
};

export default nextConfig;
