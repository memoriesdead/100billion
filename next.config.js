/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "ext.same-assets.com",
      },
      {
        protocol: "https",
        hostname: "api.dicebear.com",
      },
      {
        protocol: "https",
        hostname: "bhdufveahujzsaofatnx.supabase.co", // Added Supabase storage hostname
      }
    ],
    unoptimized: true, // Using unoptimized makes images load faster for this demo
  },
};

module.exports = nextConfig;
