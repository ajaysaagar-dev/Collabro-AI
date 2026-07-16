# Food Delivery Web Application

A comprehensive food delivery platform built with Next.js that enables customers to browse restaurants, place orders, and track deliveries. The application supports multiple user roles including customers, restaurant owners, delivery drivers, and administrators, each with tailored features and permissions.

![Next.js](https://img.shields.io/badge/Next.js-12.2.0-black)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue)
![Tailwind CSS](https://img.shields.io/badge/Tailwind%20CSS-3.0.11-38B2AC)
![Prisma](https://img.shields.io/badge/Prisma-3.15.0-2C3E50)
![NextAuth](https://img.shields.io/badge/NextAuth-4.6.0-2C3E50)

## Features

- **User Authentication**: Secure registration and login system with role-based access control
- **Restaurant Management**: Browse and discover restaurants with detailed menus
- **Shopping Cart**: Intuitive cart functionality for managing food orders
- **Order Processing**: Complete order placement and management system
- **Order Tracking**: Real-time delivery tracking for customers
- **Payment Integration**: Seamless payment processing with secure gateway
- **Search & Filtering**: Advanced search and filtering capabilities for restaurants and foods
- **Responsive Design**: Mobile-first responsive UI built with Tailwind CSS
- **Multi-Role Support**: Distinct interfaces for customers, restaurant owners, delivery drivers, and admins

## Tech Stack

| Category | Technology | Version |
|----------|------------|---------|
| Framework | Next.js | ^12.2.0 |
| Language | TypeScript | ^5.0 |
| Database | PostgreSQL | - |
| ORM | Prisma | ^3.15.0 |
| Authentication | NextAuth.js | ^4.6.0 |
| Styling | Tailwind CSS | ^3.0.11 |
| State Management | React Hooks | - |
| Testing | Jest | - |

## Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** >= 16.8.0 (LTS version recommended)
- **npm** >= 8.0.0 or **yarn** >= 1.22.0
- **PostgreSQL** >= 12.0
- **Git** >= 2.20.0

## Getting Started

### Clone the Repository

```bash
git clone https://github.com/yourusername/food-delivery-app.git
cd food-delivery-app
```

### Install Dependencies

Using npm:

```bash
npm install
```

Or using yarn:

```bash
yarn install
```

### Environment Setup

Create a `.env` file in the root directory:

```bash
cp .env.example .env
```

Update the `.env` file with your configuration values (see [Environment Variables](#environment-variables) section).

### Database Setup

1. Create a PostgreSQL database:

```bash
createdb food_delivery_db
```

2. Run Prisma migrations:

```bash
npx prisma migrate dev --name init
```

3. (Optional) Seed the database with initial data:

```bash
npx prisma db seed
```

### Run Development Server

Start the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Project Structure

```
├── src
│   ├── app
│   │   ├── layout.tsx
│   │   ├── page.tsx
│   │   ├── components
│   │   │   ├── Header.tsx
│   │   │   ├── Footer.tsx
│   │   │   ├── Navigation.tsx
│   │   │   └── ... (other components)
│   │   ├── services
│   │   │   ├── api.ts
│   │   │   ├── payment.ts
│   │   │   ├── search.ts
│   │   │   └── ... (other services)
│   │   ├── utils
│   │   │   ├── auth.ts
│   │   │   ├── cart.ts
│   │   │   └── ... (other utils)
│   │   ├── models
│   │   │   ├── User.ts
│   │   │   ├── Restaurant.ts
│   │   │   ├── Order.ts
│   │   │   └── ... (other models)
│   │   ├── pages
│   │   │   ├── _app.tsx
│   │   │   ├── index.tsx
│   │   │   └── ... (other pages)
│   │   └── ... (other app files)
│   ├── lib
│   │   ├── prisma.ts
│   │   └── ... (other lib files)
│   ├── public
│   │   ├── index.html
│   │   └── ... (other public files)
│   └── ... (other root files)
├── __tests__
│   └── app.test.tsx
├── prisma
│   └── schema.prisma
├── .env.example
├── jest.config.js
├── jest.setup.js
├── next.config.js
├── package.json
├── postcss.config.js
├── tailwind.config.js
└── tsconfig.json
```

## API Documentation

### Users

| Endpoint | Method | Description | Auth Required |
|----------|--------|-------------|---------------|
| `/api/users` | GET | Get all users | Yes (Admin) |
| `/api/users` | POST | Create a new user | No |
| `/api/users/[id]` | GET | Get user by ID | Yes (Self/Admin) |
| `/api/users/[id]` | PUT | Update user | Yes (Self/Admin) |

### Restaurants

| Endpoint | Method | Description | Auth Required |
|----------|--------|-------------|---------------|
| `/api/restaurants` | GET | Get all restaurants | No |
| `/api/restaurants` | POST | Create a new restaurant | Yes (Admin/Restaurant Owner) |
| `/api/restaurants/[id]` | GET | Get restaurant by ID | No |
| `/api/restaurants/[id]` | PUT | Update restaurant | Yes (Owner/Admin) |

### Orders

| Endpoint | Method | Description | Auth Required |
|----------|--------|-------------|---------------|
| `/api/orders` | GET | Get all orders | Yes (Admin) |
| `/api/orders` | POST | Create a new order | Yes (Customer) |
| `/api/orders/[id]` | GET | Get order by ID | Yes (Owner/Admin) |
| `/api/orders/[id]` | PUT | Update order status | Yes (Owner/Admin) |

## Environment Variables

| Variable | Description | Required | Default |
|----------|-------------|----------|---------|
| `DATABASE_URL` | PostgreSQL connection string | Yes | - |
| `NEXTAUTH_SECRET` | Secret key for NextAuth.js | Yes | - |
| `NEXTAUTH_URL` | Base URL for NextAuth.js callbacks | Yes | `http://localhost:3000` |
| `PAYMENT_GATEWAY_ID` | API key for payment gateway | Yes | - |
| `SEARCH_SERVICE_API_KEY` | API key for search service | Yes | - |
| `EMAIL_SERVICE_API_KEY` | API key for email service | No | - |
| `STRIPE_SECRET_KEY` | Stripe secret key for payments | No | - |

## Database Schema

The application uses Prisma for database management. Key models include:

- **User**: Contains user information, email, password hash, and role
- **Restaurant**: Stores restaurant details, location, and owner information
- **Order**: Tracks order status, items, and delivery information
- **MenuItem**: Represents food items available in restaurants
- **Cart**: Manages user shopping carts
- **Review**: Stores user reviews for restaurants and dishes

For complete schema details, refer to `prisma/schema.prisma`.

## Deployment

### Docker Deployment

1. Build the Docker image:

```bash
docker build -t food-delivery-app .
```

2. Run the container:

```bash
docker run -p 3000:3000 --env-file .env food-delivery-app
```

### Vercel Deployment

1. Push your code to GitHub
2. Import the project in Vercel
3. Configure environment variables in Vercel dashboard
4. Set up PostgreSQL database (use Vercel Postgres or external provider)

### Manual Deployment

```bash
# Build the application
npm run build

# Start the production server
npm run start
```

## Testing

Run the test suite:

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage
```

The project uses Jest for testing. Test files are located in the `__tests__` directory.

## Contributing

We welcome contributions! Please follow these steps:

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/your-feature-name`
3. Make your changes and commit: `git commit -m 'Add some feature'`
4. Push to the branch: `git push origin feature/your-feature-name`
5. Open a pull request

Please ensure your code follows the project's coding standards and includes appropriate tests.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.