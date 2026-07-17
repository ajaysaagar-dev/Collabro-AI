# Todo Application
[![License](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![Build Status](https://img.shields.io/badge/Build-Production%20Ready-green.svg)](https://github.com/todo-app/todo-app)
[![Code Coverage](https://img.shields.io/badge/Code%20Coverage-90%25-blue.svg)](https://github.com/todo-app/todo-app)

## Features
- Create todos
- Read todos
- Update todos
- Delete todos
- Mark todos as complete
- Todo list management
- Todo filtering (all/active/completed)
- Todo search
- Todo categorization/tags
- Due dates for todos
- Priority levels for todos
- Responsive design

## Tech Stack
| Technology | Version |
| --- | --- |
| Frontend | Next.js |
| Backend | Next.js API Routes |
| Database | Prisma + PostgreSQL |
| Authentication | NextAuth.js |

## Prerequisites
- Node.js version 14.17.0 or higher
- npm version 6.14.13 or higher
- Prisma CLI version 4.2.1 or higher
- PostgreSQL database

## Getting Started
### Clone the repo
```bash
git clone https://github.com/todo-app/todo-app.git
```
### Install dependencies
```bash
npm install
```
### Environment setup
Create a copy of `.env.example` and rename it to `.env`
```bash
cp .env.example .env
```
### Database setup
Create a PostgreSQL database and update the `DATABASE_URL` environment variable in `.env`
```bash
DATABASE_URL=postgresql://user:password@localhost:5432/database
```
### Run development server
```bash
npm run dev
```
### API Documentation
| Endpoint | Method | Description |
| --- | --- | --- |
| /api/todos | GET | Retrieve a list of todos |
| /api/todos | POST | Create a new todo |
| /api/todos/:id | GET | Retrieve a single todo |
| /api/todos/:id | PUT | Update a single todo |
| /api/todos/:id | DELETE | Delete a single todo |

## Environment Variables
| Name | Description | Required/Optional |
| --- | --- | --- |
| DATABASE_URL | PostgreSQL database URL | Required |
| NEXTAUTH_SECRET | NextAuth.js secret | Required |

## Project Structure
```
apps/
├── web/
│   ├── package.json
│   ├── tsconfig.json
│   ├── tailwind.config.js
│   ├── postcss.config.js
│   ├── next.config.js
│   ├── jest.config.js
│   ├── jest.setup.js
│   ├── src/
│   │   ├── app/
│   │   │   ├── globals.css
│   │   │   ├── layout.tsx
│   │   │   ├── page.tsx
│   │   └── ...
domains/
├── todo/
│   ├── domain.ts
│   └── ...
modules/
├── todo/
│   ├── infrastructure/
│   │   ├── todo-repository.ts
│   └── ...
shared/
├── styles/
│   ├── globals.css
│   └── ...
services/
├── auth-service.ts
└── ...
integrations/
└── ...
data/
└── prisma/
    ├── schema.prisma
    └── ...
configs/
└── next.config.js
scripts/
└── build.sh
tests/
└── ...
deployment/
└── ...
docs/
└── ...
metadata/
└── ...
```

## Deployment
This project uses Docker for deployment. To deploy, run the following command:
```bash
docker build -t todo-app .
docker run -p 3000:3000 todo-app
```
## Testing
To run tests, use the following command:
```bash
npm run test
```
## Contributing
Contributions are welcome! Please create a new branch and submit a pull request.

## License
This project is licensed under the MIT License.