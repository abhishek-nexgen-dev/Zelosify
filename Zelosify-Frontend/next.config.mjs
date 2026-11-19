const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  compress: true,

  serverExternalPackages: [],

  experimental: {
    serverActions: {
      bodySizeLimit: "2mb",
      allowedOrigins: ["localhost:5173"],
    },
  },

  onDemandEntries: {
    maxInactiveAge: 25 * 1000,
    pagesBufferLength: 5,
  },
};

export default nextConfig;
