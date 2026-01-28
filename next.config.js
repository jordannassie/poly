/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "upload.wikimedia.org",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "*.wikipedia.org",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "phhczohqidgrvcmszets.supabase.co",
        pathname: "/**",
      },
    ],
  },
};

module.exports = nextConfig;
