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
      // Supabase Storage - allow all supabase.co subdomains
      {
        protocol: "https",
        hostname: "*.supabase.co",
        pathname: "/**",
      },
      // Specific Supabase project (current production)
      {
        protocol: "https",
        hostname: "qiodxdkcvewvappuzuud.supabase.co",
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
