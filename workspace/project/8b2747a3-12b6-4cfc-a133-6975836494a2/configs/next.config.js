const { defineConfig } = require('vite');
const nextConfig = require('./next.config');

module.exports = defineConfig({
  plugins: [
    // ...
  ],
  // ...
  optimizeDeps: {
    include: ['react', 'react-dom'],
  },
  // ...
  next: nextConfig,
});