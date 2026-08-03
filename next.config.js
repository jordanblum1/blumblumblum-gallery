module.exports = {
  // Served at blumblumblum.com/gallery via a CloudFront behavior that
  // proxies /gallery* to this app's Vercel deployment.
  basePath: '/gallery',
  async redirects() {
    return [
      {
        source: '/',
        destination: '/gallery',
        basePath: false,
        permanent: false,
      },
    ];
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'res.cloudinary.com',
        pathname: `/${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME}/**`,
      },
    ],
  },
};
