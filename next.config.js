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
      // API-Sports media domain for team/league logos
      {
        protocol: "https",
        hostname: "media.api-sports.io",
        pathname: "/**",
      },
      // API-Sports may also use subdomains
      {
        protocol: "https",
        hostname: "*.api-sports.io",
        pathname: "/**",
      },
    ],
  },
};

module.exports = nextConfig;
