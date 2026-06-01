# Umrah Quotation System V2

Production-ready Umrah quotation and management system built with Next.js 14, TypeScript, PostgreSQL, and raw SQL.

## Tech Stack

- **Frontend:** React 18, Next.js 14 App Router, TypeScript, Tailwind CSS
- **Backend:** Next.js API Routes, TypeScript
- **Database:** PostgreSQL 15 (Supabase or self-hosted), raw SQL via `pg`
- **Auth:** JWT (access + refresh tokens), bcryptjs

## Quick Start

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment

```bash
cp .env.example .env
```

Edit `.env` with your PostgreSQL connection string and JWT secrets.

### 3. Set up database

```bash
npm run db:migrate
npm run db:seed
```

### 4. Run development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

### Demo Login

| Email | Role | Password |
|-------|------|----------|
| admin@umrah.com | SUPER_ADMIN | Admin@123 |
| manager@umrah.com | MANAGER | Admin@123 |
| staff@umrah.com | STAFF | Admin@123 |

## Verified Test Case (9 People)

| Component | Expected |
|-----------|----------|
| Hotels | 5,416 SAR |
| Transport | 1,800 SAR |
| Visa | 4,330 SAR |
| Transfers | 1,350 SAR |
| **Total SAR** | **12,896 SAR** |
| Flights PKR | 31,500 PKR |
| **Total PKR** | **354,085 PKR** |

Run unit tests:

```bash
npm test
```

## API Endpoints (26+)

### Authentication
- `POST /api/auth/login`
- `POST /api/auth/logout`
- `POST /api/auth/refresh`
- `GET /api/auth/me`

### Hotels
- `GET /api/hotels`
- `GET /api/hotels/:id`
- `POST /api/hotels`
- `PUT /api/hotels/:id`
- `DELETE /api/hotels/:id`

### Transport
- `GET /api/transport/routes`
- `GET /api/transport/options/:route_id`
- `POST /api/quotations/:id/transport`

### Visa
- `GET /api/visa/categories`
- `POST /api/quotations/:id/visa`

### Quotations
- `POST /api/quotations`
- `GET /api/quotations`
- `GET /api/quotations/:id`
- `PUT /api/quotations/:id`
- `POST /api/quotations/:id/calculate`
- `POST /api/quotations/:id/approve`
- `POST /api/quotations/:id/addhotel`
- `GET /api/quotations/:id/summary`
- `POST /api/quotations/room-assignment`

### Admin
- `GET /api/admin/users`
- `POST /api/admin/users`
- `PUT /api/admin/users/:id`
- `GET /api/admin/audit`

## Database Schema

20 tables: organizations, users, user_roles, hotels, hotel_rooms, hotel_seasons, hotel_commissions, hotel_rate_snapshots, transport_routes, vehicles, transport_rates, visa_categories, quotations, quotation_hotels, quotation_transport, quotation_visas, staff_commissions, invoices, audit_logs.

See `database/schema.sql` for full schema.

## Deployment

Deploy to Vercel or any Node.js host. Set environment variables:

- `DATABASE_URL`
- `JWT_SECRET`
- `JWT_REFRESH_SECRET`
- `EXCHANGE_RATE=74.5`
- `NODE_ENV=production`

## Project Structure

```
src/
├── app/           # Pages & API routes
├── components/    # React components
├── context/       # Auth context
├── lib/
│   ├── calculations/  # Pricing algorithms
│   └── services/      # Business logic
└── types/         # TypeScript types
database/
├── schema.sql
scripts/
├── migrate.js
└── seed.js
__tests__/         # Unit tests
```
