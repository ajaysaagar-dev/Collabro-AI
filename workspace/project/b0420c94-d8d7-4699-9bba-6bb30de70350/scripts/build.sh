#!/bin/bash

# Build script for Next.js application
set -e

echo "Starting build process..."

# Install dependencies
echo "Installing dependencies..."
npm ci

# Generate Prisma client
echo "Generating Prisma client..."
npx prisma generate

# Run database migrations (if needed in production)
if [ "$RUN_MIGRATIONS" = "true" ]; then
  echo "Running database migrations..."
  npx prisma migrate deploy
fi

# Build the application
echo "Building application..."
npm run build

echo "Build completed successfully!"

# Optional: Run tests if TESTING is enabled
if [ "$TESTING" = "true" ]; then
  echo "Running tests..."
  npm test
fi

echo "Build script finished."