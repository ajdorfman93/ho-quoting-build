import type { Header, NextConfig } from "next";

const LONG_TERM_CACHE_HEADERS: Header[] = [
  { key: "Cache-Control", value: "public, max-age=31536000, immutable" },
];

const API_NO_CACHE_HEADERS: Header[] = [
  { key: "Cache-Control", value: "no-store" },
];

const nextConfig: NextConfig = {
  compress: true,
  poweredByHeader: false,
  swcMinify: true,
  experimental: {
    instrumentationHook: true,
  },
  async headers() {
    return [
      {
        source: "/_next/static/:path*",
        headers: LONG_TERM_CACHE_HEADERS,
      },
      {
        source:
          "/:all*(svg|jpg|jpeg|gif|png|webp|avif|ico|css|js|woff|woff2|ttf|otf)",
        headers: LONG_TERM_CACHE_HEADERS,
      },
      {
        source: "/api/:path*",
        headers: API_NO_CACHE_HEADERS,
      },
    ];
  },
};

export default nextConfig;
