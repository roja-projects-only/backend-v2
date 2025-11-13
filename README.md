# Water Refilling Ledger - Backend

> **Part of Polyrepo**: [Frontend Repository](https://github.com/walaywashere/ledger-v2-frontend) | [Migration Guide](https://github.com/walaywashere/ledger-v2/blob/main/POLYREPO_MIGRATION.md)

Express.js + Prisma + PostgreSQL backend API for a family-run water refilling business sales tracking system. The backend is the single source of truth for sales, debts, customers, users, and configuration data consumed by the React frontend.

## 🚀 Quick Start

```bash
# Clone repository
git clone https://github.com/walaywashere/ledger-v2-backend.git
cd ledger-v2-backend

# Install dependencies
npm install

# Setup environment
cp .env.example .env
# Edit .env with your PostgreSQL credentials

# Run migrations
npx prisma migrate dev

# Seed database (optional)
npx prisma db seed

# Start development server
npm run dev
```

Server runs at: `http://localhost:3000`

## 📦 Features

### Authentication & Authorization
- JWT tokens (15min access + 7day refresh)
- Role-based access control (Admin/Staff)
- Automatic token refresh
- Session management

### Core Modules
- **Sales**: Track container sales with upsert behavior (one sale per customer per day) and Manila-aware date range queries
- **Customers**: Manage customer records, locations, activity state, and optional `customUnitPrice`
- **Settings**: Key-value store for app configuration (unit price, custom pricing toggle, business info)
- **Users**: User management (max 3 concurrent users) with role-based access and passcode rotation
- **Debts**: Manage running tabs, charges, payments, and adjustments for customers with audit trails
- **Audit Logs**: Persist mutation history for all write operations

### API Endpoints (34 total)
- **Auth** (6): login, logout, refresh, me, register, change-password
- **Sales** (11): CRUD + analytics (today, by-date, by-customer, stats) with inclusive `[start, end+1 day)` windows
- **Customers** (8): CRUD + search, stats, history, and pricing metadata
- **Settings** (8): CRUD + bulk operations for key-value config
- **Users** (7): CRUD + deactivation, current user, passcode maintenance
- **Debts** (6): Charges, payments, adjustments, close-tab flow, history, and customer debt snapshots

## 🛠️ Tech Stack

- **Runtime**: Node.js 20+ with TypeScript
- **Framework**: Express.js (layered: routes → controllers → services → repositories)
- **Database**: PostgreSQL 17+ via Prisma ORM
- **Authentication**: JWT (jsonwebtoken) + bcrypt
- **Validation**: Zod schemas (request DTO normalization + date parsing)
- **Logging**: Winston + Prisma audit logs
- **Deployment**: Railway-ready

## 📁 Project Structure

```
backend-v2/
├── src/
│   ├── modules/          # Feature modules (auth, sales, customers, debts, settings, users)
│   │   ├── <feature>.routes.ts     # Express routes (validation + auth guards)
│   │   ├── <feature>.controller.ts # Translate HTTP → service calls, normalize responses
│   │   ├── <feature>.service.ts    # Business rules, audit logging, retries
│   │   └── <feature>.repository.ts # Prisma queries (datastore layer)
│   ├── middleware/       # Express middleware (auth, cors, request logging, validation)
│   ├── config/           # Configuration (database, env, logger)
│   ├── utils/            # Utilities (errors, pagination, response helpers)
│   └── app.ts            # Express app setup and route mounting
├── prisma/
│   ├── schema.prisma     # Database schema and relations
│   ├── seed.ts           # Database seeder for baseline settings/users/customers
│   └── migrations/       # Migration history, locked via migration_lock.toml
└── TESTING/              # API test plans and scripts (customers, sales, settings, users)
```

## 🔧 Environment Variables

```bash
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/ledger"

# JWT
JWT_SECRET="your-secret-key-min-32-chars"
JWT_REFRESH_SECRET="your-refresh-secret-key"

# Server
PORT=3000
NODE_ENV=development

# CORS
CORS_ORIGIN="http://localhost:5173"
```

## 📡 API Documentation

### Base URL
- Development: `http://localhost:3000/api`
- Production: `https://your-backend.railway.app/api`

### Authentication
All endpoints except `/auth/login` and `/auth/register` require a Bearer token (15-minute access tokens with refresh rotation).

```
Authorization: Bearer <access_token>
```

### Response Format

```json
{
  "success": true,
  "data": {...},
  "pagination": {...}
}
```

- `data` contains the domain payload (single resource or list).
- `pagination` appears on endpoints returning paginated lists.

### Key Endpoint Flows

**Auth**
- `POST /auth/login` — Username + passcode; returns access + refresh tokens
- `POST /auth/refresh` — Rotates access token using refresh token cookie/header
- `GET /auth/me` — Returns authenticated user with role and status

**Sales**
- `GET /sales` — Paginated list filtered by customer, user, or ISO date range (inclusive end date)
- `POST /sales` — Upsert sale by `(customerId, date)`; enforces single daily sale per customer
- `GET /sales/today` — Convenience endpoint for Manila “today” window
- `GET /sales/date/:date` — Day snapshot (expects `YYYY-MM-DD`)
- `GET /sales/customer/:id` — Customer history with recalculated totals

**Customers**
- `GET /customers` — Paginated, filterable by search/location/active
- `POST /customers` — Creates new customer, defaulting `customUnitPrice` to null
- `PATCH /customers/:id` — Updates metadata and optional pricing overrides
- `GET /customers/:id/stats` — Aggregate view (sales count, last purchase, debts)

**Debts**
- `POST /debts/charge` — Adds containers to an open tab, creating one if needed
- `POST /debts/payment` — Records payment and auto-closes tab at zero balance
- `POST /debts/adjustment` — Positive/negative adjustments with reason auditing
- `POST /debts/mark-paid` — Closes tab, optionally posting a final payment
- `GET /debts/customer/:id` — Current tab snapshot + recent activity
- `GET /debts/history` — Paginated ledger with filters by customer, status, type, and ISO date range

**Settings**
- `GET /settings` — Returns key/value pairs with parsed types
- `PUT /settings/:key` — Updates existing setting with audit logs
- `POST /settings/bulk` — Upserts multiple settings atomically (e.g., toggle + price)

**Users**
- `GET /users` — Paginated staff/admin list
- `POST /users` — Admin-only creation of new staff members
- `PATCH /users/:id` — Toggle active flag, update role, or reset passcode

See [TESTING/](./TESTING/) for endpoint-specific payloads and scripted smoke checks.

## 🧪 Testing

```bash
# Run API tests
npm test

# Manual testing with scripts
node TESTING/quick-test-sales-api.js
node TESTING/quick-test-customers-api.js
```

## 🚢 Deployment

### Railway (Recommended)
1. Create Railway project
2. Add PostgreSQL plugin
3. Connect GitHub repository
4. Set environment variables
5. Deploy!

See [RAILWAY_SETUP.md](./RAILWAY_SETUP.md) for detailed guide.

### Custom Pricing Feature
The frontend supports **per-customer custom pricing** with a global toggle:
- `Settings.enableCustomPricing` (boolean) controls the feature
- `Customer.customUnitPrice` (optional decimal) stores custom price
- When toggle is **OFF**: Frontend uses global `Settings.unitPrice` for all
- When toggle is **ON**: Frontend uses `Customer.customUnitPrice` if set, else global
- Backend stores both values; **frontend handles the pricing logic**
- See frontend docs: `frontend-v2/docs/PRICING_GUIDE.md`

## Production Deployment

### Other Platforms
- Heroku
- Render
- AWS/GCP/Azure
- Any Node.js hosting

## 🔗 Related Repositories

- **Frontend**: https://github.com/walaywashere/ledger-v2-frontend
- **Migration Guide**: https://github.com/walaywashere/ledger-v2/blob/main/POLYREPO_MIGRATION.md

## 📝 Development Notes

### Architectural Decisions
- **Layered Architecture**: Routes → Controllers → Services → Repositories → Prisma
- **300-line Rule**: Keep files small and focused; extract helpers when business logic grows
- **Request Validation**: Zod schemas transform ISO strings into `Date` objects before hitting services
- **Response Helpers**: `sendSuccess` and error middleware enforce consistent JSON envelopes
- **Upsert Pattern**: Sales module ensures one sale per customer per day; debts module ensures single open tab per customer

### Database Schema Highlights
- **Users**: Admin/staff roles with bcrypt-hashed passcodes and active flag enforcement
- **Customers**: Location metadata, optional `customUnitPrice`, status flags, historical stats
- **Sales**: Linked to customers/users, stores quantity and stored total (frontend recalculates effective totals)
- **Debts**: `DebtTab` (open/closed tabs) + `DebtTransaction` (charges/payments/adjustments)
- **Settings**: Stringified key-value store with type metadata (`string | number | boolean | json`)
- **AuditLogs**: Records every mutation with actor, payload snapshot, user agent/IP when available

## 📄 License

MIT License - See LICENSE file for details

---

**Made for a family water refilling business** 💧
