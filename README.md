# Water Refilling Ledger - Backend

> **Part of Polyrepo**: [Frontend Repository](https://github.com/walaywashere/ledger-v2-frontend) | [Migration Guide](https://github.com/walaywashere/ledger-v2/blob/main/POLYREPO_MIGRATION.md)

Express.js + Prisma + PostgreSQL backend API for a family-run water refilling business sales tracking system.

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
- **Sales**: Track gallon sales with upsert behavior (one per customer per day)
- **Customers**: Manage customer records with custom pricing
- **Settings**: Key-value store for app configuration
- **Users**: User management (max 3 concurrent users)
- **Audit Logs**: Track all mutations for accountability

### API Endpoints (34 total)
- **Auth** (6): login, logout, refresh, me, register, change-password
- **Sales** (11): CRUD + analytics (today, by-date, by-customer, stats)
- **Customers** (8): CRUD + search, stats, history
- **Settings** (8): CRUD + bulk operations
- **Users** (7): CRUD + deactivation, current user

## 🛠️ Tech Stack

- **Runtime**: Node.js 20+ with TypeScript
- **Framework**: Express.js
- **Database**: PostgreSQL 17+ via Prisma ORM
- **Authentication**: JWT (jsonwebtoken) + bcrypt
- **Validation**: Zod schemas
- **Logging**: Winston
- **Deployment**: Railway-ready

## 📁 Project Structure

```
backend-v2/
├── src/
│   ├── modules/          # Feature modules (auth, sales, customers, etc.)
│   │   ├── auth/         # Authentication module
│   │   ├── sales/        # Sales tracking
│   │   ├── customers/    # Customer management
│   │   ├── settings/     # App settings
│   │   └── users/        # User management
│   ├── middleware/       # Express middleware (auth, cors, error handling)
│   ├── config/           # Configuration (database, env, logger)
│   ├── utils/            # Utilities (errors, pagination, response)
│   └── app.ts            # Express app setup
├── prisma/
│   ├── schema.prisma     # Database schema
│   ├── seed.ts           # Database seeder
│   └── migrations/       # Migration history
└── TESTING/              # API test plans and scripts
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
All endpoints except `/auth/login` and `/auth/register` require JWT token:
```bash
Authorization: Bearer <access_token>
```

### Response Format
```json
{
  "success": true,
  "data": { ... },
  "pagination": { ... }  // Optional for list endpoints
}
```

### Key Endpoints

**Auth**
- `POST /auth/login` - Login with username/passcode
- `POST /auth/refresh` - Refresh access token
- `GET /auth/me` - Get current user

**Sales**
- `GET /sales` - List all sales (paginated)
- `POST /sales` - Create/update sale (upsert)
- `GET /sales/today` - Get today's sales
- `GET /sales/date/:date` - Get sales by date
- `GET /sales/customer/:id` - Get customer's sales history

**Customers**
- `GET /customers` - List all customers (paginated)
- `POST /customers` - Create customer
- `GET /customers/:id` - Get customer details
- `GET /customers/:id/stats` - Get customer statistics

See [TESTING/](./TESTING/) for complete API documentation and test scripts.

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
- **Layered Architecture**: Routes → Controllers → Services → Repository
- **300-line Rule**: Keep files small and focused
- **Response Adapters**: Consistent API response format
- **Upsert Pattern**: One sale per customer per day (auto-updates)

### Database Schema
- Users: Admin/Staff roles with bcrypt passwords
- Customers: Location-based with optional custom pricing
- Sales: Linked to customers and users with audit trail
- Settings: Key-value store with type validation
- AuditLogs: Track all mutations with user/IP/changes

## 📄 License

MIT License - See LICENSE file for details

---

**Made for a family water refilling business** 💧
