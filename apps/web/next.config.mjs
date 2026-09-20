/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: [
    '@barberos/auth',
    '@barberos/config',
    '@barberos/contracts',
    '@barberos/permissions',
    '@barberos/ui',
  ],
};

export default nextConfig;
