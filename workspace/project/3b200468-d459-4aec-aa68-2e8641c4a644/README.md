# Theme Toggle Web Application

A simple web application with a theme toggle button that allows users to switch between dark and light modes. This is a client-side only feature with no backend or database requirements.

[![Next.js](https://img.shields.io/badge/Next.js-12.2.0-black)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-18.2.0-61DAFB)](https://reactjs.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind%20CSS-3.2.4-38B2AC)](https://tailwindcss.com/)

## Features

- Theme toggle button for seamless mode switching
- Dark mode support with smooth transitions
- Light mode support for enhanced readability
- Theme switching functionality with state persistence
- Responsive design compatible with all screen sizes

## Tech Stack

| Technology | Version | Purpose |
|------------|---------|---------|
| Next.js | ^12.2.0 | React Framework |
| React | ^18.2.0 | UI Library |
| Tailwind CSS | ^3.2.4 | Styling Framework |
| Prisma | ^4.10.0 | Database ORM (configured) |

## Prerequisites

- Node.js >= 16.14.0
- npm >= 8.0.0 or yarn >= 1.22.0
- Git

## Getting Started

### Clone the repo

```bash
git clone https://github.com/your-username/theme-toggle-app.git
cd theme-toggle-app
```

### Install dependencies

```bash
npm install
# or using yarn
yarn install
```

### Environment setup

Create a `.env` file in the `configs/` directory:

```bash
cp configs/.env.example configs/.env
```

### Database setup

This application is client-side only and does not require a database. The Prisma configuration is included for future extensibility.

### Run development server

```bash
npm run dev
# or using yarn
yarn dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser to see the application.

## Project Structure

```
├── apps/
│   └── web/
│       ├── src/
│       │   └── app/
│       │       ├── layout.tsx
│       │       └── page.tsx
│       ├── next.config.js
│       ├── tailwind.config.js
│       └── package.json
├── modules/
│   └── theme/
│       ├── presentation/
│       │   └── ThemeButton.tsx
│       ├── application/
│       │   └── ThemeService.ts
│       ├── domain/
│       │   └── Theme.ts
│       └── tests/
├── shared/
│   └── utils/
│       └── theme.ts
├── configs/
│   └── .env
├── data/
│   └── prisma/
│       └── schema.prisma
├── deployment/
├── docs/
├── tests/
└── metadata/
    ├── project.json
    ├── architecture.json
    └── routes.json
```

## API Documentation

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/theme` | GET | Get the current theme |
| `/api/theme` | POST | Switch to a different theme |

## Environment Variables

| Name | Description | Required |
|------|-------------|----------|
| `DATABASE_URL` | Database connection string | No |
| `NEXTAUTH_SECRET` | Secret for NextAuth.js | No |

## Database Schema

This application is client-side only and does not require a database. The Prisma schema is configured for future extensibility but is not actively used.

## Deployment

### Docker

Build the Docker image:

```bash
docker build -t theme-toggle-app .
```

Run the container:

```bash
docker run -p 3000:3000 theme-toggle-app
```

### Manual Deployment

```bash
npm run build && npm run start
```

## Testing

Run the test suite:

```bash
npm test
# or using yarn
yarn test
```

Run tests in watch mode:

```bash
npm run test:watch
# or using yarn
yarn run test:watch
```

Run tests with coverage:

```bash
npm run test:coverage
# or using yarn
yarn run test:coverage
```

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

Please make sure to update tests as appropriate.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.