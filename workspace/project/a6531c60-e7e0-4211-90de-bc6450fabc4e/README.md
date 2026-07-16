# Interactive Button

A simple Next.js web application featuring an interactive button that changes color when clicked. This project demonstrates basic state management and event handling in React/Next.js.

## Features

- Interactive button component with color-changing functionality
- State management using custom React hooks
- TypeScript support for type safety
- Tailwind CSS for styling
- ESLint and Prettier for code quality
- Jest testing setup

## Tech Stack

| Category | Technology |
|----------|------------|
| Framework | Next.js 14.2.0 |
| Language | TypeScript 5.2.2 |
| Styling | Tailwind CSS 3.3.3 |
| State Management | React Hooks |
| Testing | Jest 29.6.1 |
| Linting | ESLint 8.47.0 |

## Prerequisites

- Node.js 18.17.0 or higher
- npm 9.0.0 or higher
- Git

## Getting Started

### Clone the repo

```bash
git clone https://github.com/your-username/interactive-button.git
cd interactive-button
```

### Install dependencies

```bash
npm install
```

### Environment setup

This project doesn't require environment variables for basic functionality. For development, you can create a `.env.local` file if needed for future API integrations.

### Run development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser to see the application.

## Project Structure

```
├── src
│   ├── app
│   │   ├── layout.tsx
│   │   ├── page.tsx
│   │   └── components
│   │       └── InteractiveButton.tsx
│   ├── hooks
│   │   └── useButtonState.ts
│   ├── styles
│   │   └── globals.css
│   └── types
│       └── button.ts
├── public
│   └── favicon.ico
├── __tests__
│   └── app.test.tsx
├── .eslintrc.json
├── .gitignore
├── next.config.js
├── package.json
├── tsconfig.json
├── tailwind.config.js
└── vite.config.ts
```

## API Documentation

This is a frontend-only application with no API endpoints.

## Environment Variables

| Name | Description | Required |
|------|-------------|----------|
| N/A | No environment variables required for this project | - |

## Database Schema

This project doesn't use a database.

## Deployment

### Deploy with Vercel

The easiest way to deploy this Next.js application is using Vercel:

```bash
npm run build
npm run start
```

For production deployment:

1. Build the application:
```bash
npm run build
```

2. Start the production server:
```bash
npm run start
```

### Docker Deployment

Create a `Dockerfile`:

```dockerfile
FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:18-alpine AS runner
WORKDIR /app
ENV NODE_ENV production
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/package*.json ./
RUN npm ci --only=production
EXPOSE 3000
CMD ["npm", "run", "start"]
```

## Testing

Run the test suite:

```bash
npm test
```

Run tests in watch mode:

```bash
npm run test:watch
```

Run tests with coverage:

```bash
npm run test:coverage
```

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

Please make sure to update tests as appropriate and follow the existing code style.

## License

This project is open source and available under the MIT License.