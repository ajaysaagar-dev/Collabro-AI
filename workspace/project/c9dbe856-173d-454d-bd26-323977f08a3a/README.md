# Simple Calculator Web Application
[![License](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![Next.js](https://img.shields.io/badge/Next.js-12.2.0-blue.svg)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-18.2.0-blue.svg)](https://reactjs.org/)
[![TailwindCSS](https://img.shields.io/badge/TailwindCSS-3.0.11-blue.svg)](https://tailwindcss.com/)

## Features
* Basic arithmetic operations (addition, subtraction, multiplication, division)
* User input handling
* Real-time calculation display
* Clear/reset functionality
* Keyboard support

## Tech Stack
| Category | Technology |
| --- | --- |
| Frontend | Next.js |
| Backend | None |
| Database | None |
| Authentication | None |

## Prerequisites
* Node.js version 16.17.0 or higher
* npm version 8.19.0 or higher
* yarn version 1.22.19 or higher

## Getting Started
### Clone the Repo
```bash
git clone https://github.com/your-username/simple-calculator-web-app.git
```
### Install Dependencies
```bash
npm install
```
### Environment Setup
Create a `.env` file in the root directory and add the following environment variables:
```makefile
DATABASE_URL=
NEXTAUTH_SECRET=
```
### Database Setup
No database setup is required for this project.

### Run Development Server
```bash
npm run dev
```
### API Documentation
| Method | Endpoint | Description |
| --- | --- | --- |
| GET | /api/calculator | Get calculator state |
| POST | /api/calculator | Update calculator state |

## Project Structure
```markdown
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
│   │   │   └── ...
│   │   └── ...
├── domains/
│   └── README.md
├── modules/
│   └── README.md
├── shared/
│   └── README.md
├── services/
│   └── README.md
├── integrations/
│   └── README.md
├── data/
│   └── README.md
├── configs/
│   └── README.md
├── scripts/
│   └── README.md
├── tests/
│   └── README.md
├── deployment/
│   └── README.md
├── docs/
│   └── README.md
└── metadata/
    └── README.md
```
## Environment Variables
| Name | Description | Required/Optional |
| --- | --- | --- |
| DATABASE_URL | Database URL | Optional |
| NEXTAUTH_SECRET | NextAuth secret | Required |

## Database Schema
No database schema is required for this project.

## Deployment
This project uses Docker for deployment. To deploy, run the following command:
```bash
docker build -t simple-calculator-web-app .
docker run -p 3000:3000 simple-calculator-web-app
```
## Testing
To run tests, use the following command:
```bash
npm run test
```
## Contributing
Contributions are welcome! Please fork the repository and submit a pull request.

## License
This project is licensed under the MIT License.