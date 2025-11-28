import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    console.log('Proxying to Backend:', process.env.BACKEND_URL || 'http://backend:8000');
    return [
      {
        source: '/api/:path*',
        destination: `${process.env.BACKEND_URL || 'http://backend:8000'}/api/:path*`,
      },
      {
        source: '/socket.io',
        destination: `${process.env.BACKEND_URL || 'http://backend:8000'}/socket.io`,
      },
      {
        source: '/socket.io/:path*',
        destination: `${process.env.BACKEND_URL || 'http://backend:8000'}/socket.io/:path*`,
      },
    ];
  },
};

export default nextConfig;
