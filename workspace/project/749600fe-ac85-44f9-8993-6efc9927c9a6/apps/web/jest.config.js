const nextJest = require('next/jest')
const fs = require('fs')
const path = require('path')

const createJestConfig = nextJest({
  // Provide the path to your Next.js app to load next.config.js and .env files in your test environment
  dir: './',
})

// Read mappings dynamically from mapping.json if exists
let jestAliases = {};
try {
  const mappingPath = path.resolve(__dirname, '../../mapping.json');
  if (fs.existsSync(mappingPath)) {
    const mappingJson = JSON.parse(fs.readFileSync(mappingPath, 'utf-8'));
    if (mappingJson && mappingJson.aliases) {
      for (const [key, value] of Object.entries(mappingJson.aliases)) {
        jestAliases[`^${key}/(.*)$`] = `<rootDir>/../../${value}/$1`;
      }
    }
  }
} catch (e) {
  // Fallback
  jestAliases = {
    '^@/modules/(.*)$': '<rootDir>/../../modules/$1',
    '^@/shared/(.*)$': '<rootDir>/../../shared/$1',
    '^@/domains/(.*)$': '<rootDir>/../../domains/$1',
    '^@/infrastructure/(.*)$': '<rootDir>/../../infrastructure/$1',
    '^@/services/(.*)$': '<rootDir>/../../services/$1',
    '^@/integrations/(.*)$': '<rootDir>/../../integrations/$1',
  };
}

// Add any custom config to be passed to Jest
const customJestConfig = {
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  testEnvironment: 'jest-environment-jsdom',
  moduleNameMapper: {
    ...jestAliases,
    '^@/(.*)$': '<rootDir>/src/$1',
  },
}

// createJestConfig is exported this way to ensure that next/jest can load the Next.js config which is async
module.exports = createJestConfig(customJestConfig)
