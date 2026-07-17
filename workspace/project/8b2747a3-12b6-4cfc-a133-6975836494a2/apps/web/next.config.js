/** @type {import('next').NextConfig} */
const fs = require('fs');
const path = require('path');

let webpackAliases = {};
try {
  const mappingPath = path.resolve(__dirname, '../../mapping.json');
  if (fs.existsSync(mappingPath)) {
    const mappingJson = JSON.parse(fs.readFileSync(mappingPath, 'utf-8'));
    if (mappingJson && mappingJson.aliases) {
      for (const [key, value] of Object.entries(mappingJson.aliases)) {
        webpackAliases[key] = path.resolve(__dirname, '../../', value);
      }
    }
  }
} catch (e) {
  // Fallback if mapping.json fails to read
  webpackAliases['@/modules'] = path.resolve(__dirname, '../../modules');
  webpackAliases['@/shared'] = path.resolve(__dirname, '../../shared');
  webpackAliases['@/domains'] = path.resolve(__dirname, '../../domains');
  webpackAliases['@/infrastructure'] = path.resolve(__dirname, '../../infrastructure');
  webpackAliases['@/services'] = path.resolve(__dirname, '../../services');
  webpackAliases['@/integrations'] = path.resolve(__dirname, '../../integrations');
}

const nextConfig = {
  reactStrictMode: true,
  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      ...webpackAliases
    };
    return config;
  }
}

module.exports = nextConfig
