/** @type {import('next').NextConfig} */
const backendOrigin = (process.env.BACKEND_INTERNAL_URL ?? "http://localhost:3000").replace(
  /\/+$/,
  "",
);

const nextConfig = {
  output: "standalone",
  distDir: process.env.NEXT_BUILD_DIR || ".next",
  async rewrites() {
    return [
      { source: "/api/:path*", destination: `${backendOrigin}/api/:path*` },
      { source: "/uploads/:path*", destination: `${backendOrigin}/uploads/:path*` },
      {
        source: "/marketing-media/:path*",
        destination: `${backendOrigin}/marketing-media/:path*`,
      },
    ];
  },
};

export default nextConfig;
