/** @type {import('next').NextConfig} */
const nextConfig = {
  // MediaPipe WASM files need to be served from public
  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
    };
    return config;
  },
  // Allow loading VRM models
  async headers() {
    return [
      {
        source: '/assets/:path*',
        headers: [
          {
            key: 'Cross-Origin-Embedder-Policy',
            value: 'require-corp',
          },
          {
            key: 'Cross-Origin-Opener-Policy',
            value: 'same-origin',
          },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
