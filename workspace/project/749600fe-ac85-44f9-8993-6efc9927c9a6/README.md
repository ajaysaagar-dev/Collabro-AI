# Theme Toggle Web Application

A simple web application with a theme toggle button that switches between dark and light modes. This is a client-side feature with no backend or database requirements.

## Features

- Theme toggle button for seamless mode switching
- Dark mode support with smooth transitions
- Light mode support for day-time usage
- Page theme switching with persistent preferences
- Responsive design with Tailwind CSS

## Tech Stack

| Category | Technology |
|----------|------------|
| Frontend | Next.js 12.2.3 |
| Styling | Tailwind CSS 3.2.4 |
| Language | TypeScript |
| Testing | Jest, Playwright, Puppeteer, Lighthouse |
| Database | Prisma (schema defined) |

## Prerequisites

- Node.js >= 16.14.0
- npm >= 8.0.0 or yarn >= 1.22.0
- Git

## Getting Started

### Clone the repo

```bash
git clone https://github.com/your-org/theme-toggle-app.git
cd theme-toggle-app
```

### Install dependencies

```bash
npm install
# or
yarn install
```

### Environment setup

Create a `.env.local` file in the root directory:

```bash
cp .env.example .env.local
```

### Run development server

```bash
npm run dev
# or
yarn dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Project Structure

```
├── apps/
│   └── web/
│       ├── package.json
│       ├── tsconfig.json
│       ├── tailwind.config.js
│       ├── postcss.config.js
│       ├── next.config.js
│       ├── jest.config.js
│       ├── jest.setup.js
│       └── src/
│           └── app/
│               ├── globals.css
│               ├── layout.tsx
│               └── page.tsx
├── domains/
├── modules/
│   └── theme/
│       ├── domain/
│       │   └── theme-toggle-button-aggregate.ts
│       ├── application/
│       │   └── theme-toggle-button-commands.ts
│       └── presentation/
│           └── theme-toggle-button.tsx
├── shared/
│   └── utils/
│       └── theme.ts
├── services/
├── integrations/
├── data/
│   └── prisma/
│       └── schema.prisma
├── configs/
│   └── next.config.js
├── scripts/
├── tests/
├── deployment/
├── docs/
├── metadata/
├── tools/
├── workspace/
├── resources/
├── assets/
├── infrastructure/
├── packages/
├── __tests__/
│   ├── app.test.tsx
│   ├── playwright-e2e.test.ts
│   ├── puppeteer-cdp.test.ts
│   ├── lighthouse.test.ts
│   └── accessibility.test.ts
├── package.json
├── tsconfig.json
├── README.md
└── .gitignore
```

## API Documentation

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/theme` | GET | Get the current theme |
| `/api/theme` | POST | Set the theme |

## Environment Variables

| Name | Description | Required |
|------|-------------|----------|
| `NEXT_PUBLIC_THEME` | Default theme setting | No |
| `NEXT_PUBLIC_THEME_PREFERENCE` | Theme preference configuration | No |

## Database Schema

The project includes a Prisma schema for potential future database integration. The schema is located at `data/prisma/schema.prisma` and defines the foundational structure for theme-related data persistence.

## Deployment

### Build Configuration

```bash
npm run build
npm run export
```

### Docker Deployment

A Dockerfile is available for containerized deployment:

```bash
docker build -t theme-toggle-app .
docker run -p 3000:3000 theme-toggle-app
```

### Vercel Deployment

Deploy to Vercel with one click:

```bash
vercel
```

## Testing

Run the test suite:

```bash
# Run all tests
npm test

# Run unit tests
npm run test:unit

# Run integration tests
npm run test:integration

# Run E2E tests with Playwright
npm run test:e2e

# Run accessibility tests
npm run test:accessibility

# Run Lighthouse performance tests
npm run test:lighthouse
```

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

Please read the contributing guidelines for more details.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.