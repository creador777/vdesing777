/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  images: { unoptimized: true },
  reactStrictMode: true,
  transpilePackages: ['three'],
  experimental: {
    optimizePackageImports: ['@react-three/drei', '@react-three/fiber']
  },
  webpack: (config) => {
    config.module.rules.push({
      test: /\.(glsl|vs|fs|vert|frag)$/,
      exclude: /node_modules/,
      use: ['raw-loader', 'glslify-loader']
    });
    return config;
  }
};

export default nextConfig;