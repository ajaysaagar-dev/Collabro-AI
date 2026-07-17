/** @type {import('next').NextConfig} */
const nextConfig = {
  responsive: true,
  experimental: {
    turbo: true,
  },
  images: {
    domains: [],
  },
  env: {
    DATABASE_URL: process.env.DATABASE_URL,
    NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET,
  },
}

module.exports = nextConfig