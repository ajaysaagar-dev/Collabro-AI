/** @type {import('next').NextConfig} */
const nextConfig = {
  // Enable React Strict Mode for better error detection
  reactStrictMode: true,
  
  // Configure images for optimized image handling
  images: {
    domains: [],
  },
  
  // Enable experimental features for better performance
  experimental: {
    // Optimize CSS extraction for faster page loads
    optimizeCss: true,
    // Enable server actions for better form handling
    serverActions: {
      enabled: true,
    },
  },
  
  // Configure the theme toggle and dark/light mode support
  // The theme is managed via CSS variables and localStorage
  // Theme preference is stored in the browser's localStorage
  // and can be overridden via the /api/theme endpoint
  env: {
    NEXT_PUBLIC_THEME_KEY: 'theme',
  },
  
  // Configure webpack for any custom optimizations
  webpack: (config) => {
    return config;
  },
};

module.exports = nextConfig;