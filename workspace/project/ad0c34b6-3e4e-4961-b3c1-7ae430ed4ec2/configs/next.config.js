const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const { NEXTAUTH_SECRET } = process.env;

module.exports = {
  reactStrictMode: true,
  experimental: {
    appDir: true,
  },
  // ... other Next.js configuration options
};