import { GeneratedFile } from '@/types';

export function getDefaultRootPackageJson(projectId: string): string {
  return JSON.stringify({
    name: `project-${projectId}-root`,
    version: "0.1.0",
    private: true,
    workspaces: [
      "apps/*",
      "domains/*",
      "modules/*",
      "shared"
    ],
    scripts: {
      "dev": "npm run dev --workspace=apps/web",
      "build": "npm run build --workspace=apps/web",
      "start": "npm run start --workspace=apps/web",
      "lint": "npm run lint --workspace=apps/web",
      "test": "npm run test --workspace=apps/web"
    }
  }, null, 2);
}

export function getDefaultRootTsConfig(): string {
  return JSON.stringify({
    compilerOptions: {
      target: "es2022",
      lib: ["dom", "dom.iterable", "esnext"],
      allowJs: true,
      skipLibCheck: true,
      strict: true,
      noEmit: true,
      esModuleInterop: true,
      module: "esnext",
      moduleResolution: "bundler",
      resolveJsonModule: true,
      isolatedModules: true,
      jsx: "preserve",
      incremental: true,
      plugins: [
        {
          name: "next"
        }
      ],
      paths: {
        "@/*": ["./apps/web/src/*", "./modules/*", "./shared/*"]
      }
    },
    include: [
      "apps/web/next-env.d.ts",
      "apps/web/**/*.ts",
      "apps/web/**/*.tsx",
      "modules/**/*.ts",
      "modules/**/*.tsx",
      "shared/**/*.ts",
      "shared/**/*.tsx"
    ],
    exclude: ["node_modules"]
  }, null, 2);
}

export function getDefaultRootReadme(): string {
  return `# COLLABRO AI Universal Software Project
This project follows the **Universal Software Project Architecture (USPA)** standard.

## Structure
- \`apps/\`: Executable applications (e.g. Next.js web application).
- \`domains/\`: Heart of the application containing business rules only.
- \`modules/\`: Self-contained feature modules.
- \`shared/\`: Reusable types, utilities, and components.
- \`configs/\`: Environment, application, and database configurations.
`;
}

export function getDefaultGitignore(): string {
  return `# dependencies
/node_modules
/.pnp
.pnp.js

# testing
/coverage

# next.js
/.next/
/out/

# production
/build

# debug
npm-debug.log*
yarn-debug.log*
yarn-error.log*

# local env files
.env*.local

# vercel
.vercel

# typescript
*.tsbuildinfo
next-env.d.ts
`;
}

export function getDefaultPackageJson(projectId: string): string {
  return JSON.stringify({
    name: `project-${projectId}`,
    version: "0.1.0",
    private: true,
    scripts: {
      "dev": "next dev",
      "build": "next build",
      "start": "next start",
      "lint": "next lint",
      "test": "jest",
      "test:watch": "jest --watch"
    },
    dependencies: {
      "react": "latest",
      "react-dom": "latest",
      "next": "latest",
      "lucide-react": "latest",
      "next-themes": "latest",
      "clsx": "latest",
      "tailwind-merge": "latest",
      "selenium-webdriver": "latest"
    },
    devDependencies: {
      "typescript": "latest",
      "@types/node": "latest",
      "@types/react": "latest",
      "@types/react-dom": "latest",
      "postcss": "latest",
      "tailwindcss": "latest",
      "@tailwindcss/postcss": "latest",
      "autoprefixer": "latest",
      "eslint": "latest",
      "eslint-config-next": "latest",
      "jest": "latest",
      "jest-environment-jsdom": "latest",
      "@testing-library/react": "latest",
      "@testing-library/jest-dom": "latest",
      "ts-jest": "latest",
      "@types/jest": "latest",
      "@types/selenium-webdriver": "latest"
    }
  }, null, 2);
}

export function getDefaultTsConfig(): string {
  return JSON.stringify({
    compilerOptions: {
      target: "es2022",
      lib: ["dom", "dom.iterable", "esnext"],
      allowJs: true,
      skipLibCheck: true,
      strict: true,
      noEmit: true,
      esModuleInterop: true,
      module: "esnext",
      moduleResolution: "bundler",
      resolveJsonModule: true,
      isolatedModules: true,
      jsx: "preserve",
      incremental: true,
      plugins: [
        {
          name: "next"
        }
      ],
      paths: {
        "@/*": ["./src/*"],
        "@/modules/*": ["../../modules/*"],
        "@/shared/*": ["../../shared/*"],
        "@/domains/*": ["../../domains/*"],
        "@/infrastructure/*": ["../../infrastructure/*"],
        "@/services/*": ["../../services/*"],
        "@/integrations/*": ["../../integrations/*"]
      }
    },
    include: [
      "next-env.d.ts",
      "**/*.ts",
      "**/*.tsx",
      ".next/types/**/*.ts",
      "../../modules/**/*.ts",
      "../../modules/**/*.tsx",
      "../../shared/**/*.ts",
      "../../shared/**/*.tsx",
      "../../domains/**/*.ts",
      "../../domains/**/*.tsx"
    ],
    exclude: ["node_modules"]
  }, null, 2);
}

export function getDefaultTailwindConfig(): string {
  return `/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      backgroundImage: {
        "gradient-radial": "radial-gradient(var(--tw-gradient-stops))",
        "gradient-conic":
          "conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))",
      },
    },
  },
  plugins: [],
}
`;
}

export function getDefaultPostcssConfig(): string {
  return `module.exports = {
  plugins: {
    '@tailwindcss/postcss': {},
    autoprefixer: {},
  },
}
`;
}

export function getDefaultNextConfig(): string {
  return `/** @type {import('next').NextConfig} */
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
  turbopack: {},
  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      ...webpackAliases
    };
    return config;
  }
}

module.exports = nextConfig
`;
}

export function getDefaultJestConfig(): string {
  return `const nextJest = require('next/jest')
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
        jestAliases[\`^\${key}/(.*)$\`] = \`<rootDir>/../../\${value}/$1\`;
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
`;
}

export function getDefaultJestSetup(): string {
  return `import '@testing-library/jest-dom'\n`;
}

export function getDefaultGlobalsCss(): string {
  return `@tailwind base;
@tailwind components;
@tailwind utilities;

:root {
  --foreground-rgb: 0, 0, 0;
  --background-start-rgb: 214, 219, 220;
  --background-end-rgb: 255, 255, 255;
}

@media (prefers-color-scheme: dark) {
  :root {
    --foreground-rgb: 255, 255, 255;
    --background-start-rgb: 0, 0, 0;
    --background-end-rgb: 0, 0, 0;
  }
}

body {
  color: rgb(var(--foreground-rgb));
  background: linear-gradient(
      to bottom,
      transparent,
      rgb(var(--background-end-rgb))
    )
    rgb(var(--background-start-rgb));
}
`;
}

export function getDefaultLayout(): string {
  return `import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Collabro AI Project',
  description: 'Generated by Collabro AI',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>{children}</body>
    </html>
  )
}
`;
}

export function getDefaultPage(): string {
  return `export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-between p-24">
      <div className="z-10 max-w-5xl w-full items-center justify-between font-mono text-sm lg:flex">
        <p className="fixed left-0 top-0 flex w-full justify-center border-b border-gray-300 bg-gradient-to-b from-zinc-200 pb-6 pt-8 backdrop-blur-2xl dark:border-neutral-800 dark:bg-zinc-800/30 dark:from-inherit lg:static lg:w-auto  lg:rounded-xl lg:border lg:bg-gray-200 lg:p-4 lg:dark:bg-zinc-800/30">
          Get started by editing&nbsp;
          <code className="font-bold">src/app/page.tsx</code>
        </p>
      </div>
    </main>
  )
}
`;
}

export function getDefaultNextJsFiles(projectId: string): GeneratedFile[] {
  const timestamp = Date.now();
  const agent = 'manager';
  return [
    // Root configs
    { path: 'package.json', content: getDefaultRootPackageJson(projectId), agent, generatedAt: timestamp },
    { path: 'tsconfig.json', content: getDefaultRootTsConfig(), agent, generatedAt: timestamp },
    { path: 'README.md', content: getDefaultRootReadme(), agent, generatedAt: timestamp },
    { path: '.gitignore', content: getDefaultGitignore(), agent, generatedAt: timestamp },

    // Next.js App Web files
    { path: 'apps/web/package.json', content: getDefaultPackageJson(projectId), agent, generatedAt: timestamp },
    { path: 'apps/web/tsconfig.json', content: getDefaultTsConfig(), agent, generatedAt: timestamp },
    { path: 'apps/web/tailwind.config.js', content: getDefaultTailwindConfig(), agent, generatedAt: timestamp },
    { path: 'apps/web/postcss.config.js', content: getDefaultPostcssConfig(), agent, generatedAt: timestamp },
    { path: 'apps/web/next.config.js', content: getDefaultNextConfig(), agent, generatedAt: timestamp },
    { path: 'apps/web/jest.config.js', content: getDefaultJestConfig(), agent, generatedAt: timestamp },
    { path: 'apps/web/jest.setup.js', content: getDefaultJestSetup(), agent, generatedAt: timestamp },
    { path: 'apps/web/src/app/globals.css', content: getDefaultGlobalsCss(), agent, generatedAt: timestamp },
    { path: 'apps/web/src/app/layout.tsx', content: getDefaultLayout(), agent, generatedAt: timestamp },
    { path: 'apps/web/src/app/page.tsx', content: getDefaultPage(), agent, generatedAt: timestamp },

    // USPA structure placeholders/docs/keeps
    { path: 'domains/README.md', content: '# Domains\nHeart of the application containing business rules only.', agent, generatedAt: timestamp },
    { path: 'modules/README.md', content: '# Modules\nEvery feature becomes a module. Modules own UI, logic, tests, and infra.', agent, generatedAt: timestamp },
    { path: 'shared/README.md', content: '# Shared\nReusable types, utilities, and components.', agent, generatedAt: timestamp },
    { path: 'infrastructure/README.md', content: '# Infrastructure\nExternal implementations and adapters (database, cache, logger).', agent, generatedAt: timestamp },
    { path: 'services/README.md', content: '# Services\nCross-domain services.', agent, generatedAt: timestamp },
    { path: 'integrations/README.md', content: '# Integrations\nThird-party APIs (Stripe, OpenAI, Google).', agent, generatedAt: timestamp },
    { path: 'data/README.md', content: '# Data\nSchemas, migrations, seed, and cache.', agent, generatedAt: timestamp },
    { path: 'resources/README.md', content: '# Resources\nLocales, templates, themes.', agent, generatedAt: timestamp },
    { path: 'assets/README.md', content: '# Assets\nImages, audio, video.', agent, generatedAt: timestamp },
    { path: 'configs/README.md', content: '# Configurations\nNo hardcoded values config files.', agent, generatedAt: timestamp },
    { path: 'scripts/README.md', content: '# Scripts\nBuild, deploy, lint, format scripts.', agent, generatedAt: timestamp },
    { path: 'tests/README.md', content: '# Tests\nGlobal testing setup.', agent, generatedAt: timestamp },
    { path: 'deployment/README.md', content: '# Deployment\nDocker, Kubernetes, Terraform.', agent, generatedAt: timestamp },
    { path: 'docs/README.md', content: '# Documentation\nArchitecture and API documentation.', agent, generatedAt: timestamp },
    { path: 'metadata/README.md', content: '# Metadata\nproject.json, architecture.json.', agent, generatedAt: timestamp },
    { path: 'tools/README.md', content: '# Tools\nCLI tools and helper scripts.', agent, generatedAt: timestamp },
    { path: 'workspace/README.md', content: '# Workspace\nExports, artifacts, and temp files.', agent, generatedAt: timestamp }
  ];
}
