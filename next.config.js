/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  trailingSlash: true,
  images: {
    unoptimized: true
  },
  // Uncomment and configure for GitHub Pages deployment:
  // basePath: '/your-repo-name',
  // assetPrefix: '/your-repo-name/',
}

module.exports = nextConfig