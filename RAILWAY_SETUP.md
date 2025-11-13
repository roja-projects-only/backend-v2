# Railway PostgreSQL Setup Guide

> **Part of**: [Water Refilling Ledger Backend](https://github.com/walaywashere/ledger-v2-backend)  
> **Frontend Repository**: https://github.com/walaywashere/ledger-v2-frontend

Express.js + Prisma + PostgreSQL backend setup guide for Railway deployment. This document mirrors the current code base (routes → controllers → services → repositories) so new agents can provision infrastructure without surprises.

---

## Step 1: Create Railway Project

1. Go to [Railway.app](https://railway.app/) and sign in
2. Click **"New Project"**
3. Select **"Provision PostgreSQL"**
4. Wait for the database to be provisioned

## Step 2: Get Database Connection String

1. Click on your PostgreSQL service
2. Go to the **"Connect"** tab
3. Copy the **"Postgres Connection URL"**
   - Format: `postgresql://username:password@host:port/database`

## Step 3: Update Local Environment

1. Create `.env` file in project root (if it doesn't exist)
2. Add the Railway connection string:
   ```bash
   DATABASE_URL="postgresql://postgres:YOUR_PASSWORD@containers-us-west-XXX.railway.app:7432/railway"
   
   # JWT Secrets (generate strong random strings)
   JWT_SECRET="your-super-secret-jwt-key-64-characters-minimum"
   JWT_REFRESH_SECRET="your-super-secret-refresh-key-64-characters-minimum"
   
   # Environment
   NODE_ENV="development"
   PORT=3000
   ```

## Step 4: Run Database Migrations

```powershell
# Make sure you're in the backend repository
cd ledger-v2-backend

# Install dependencies (if not done yet)
npm install

# Run migrations
npm run prisma:migrate
```

This will:
- Create all database tables (User, Customer, Sale, DebtTab, DebtTransaction, Setting, Session, AuditLog)
- Apply indexes for performance (customerId, userId, date, debtTabId)
- Set up foreign key relationships (including cascades for audit/session records)
- Create unique constraint for one sale per customer per day

## Step 5: Seed Initial Data

```powershell
npm run prisma:seed
```

This creates:
- **Admin user**: username `admin`, passcode `000000`
- **Default settings**: `unitPrice = 25.00`, `businessName = "Yaris Ledger"`, `enableCustomPricing = true`
- **Reference customers**: Sample customers/locations for frontend dropdowns

**⚠️ Important**: Change the admin passcode after first login!

## Step 6: Verify Database

Open Prisma Studio to view your data:

```powershell
npm run prisma:studio
```

This opens a web UI at `http://localhost:5555` where you can browse all tables.

## Step 7: Start Development Server

```powershell
npm run dev
```

Server runs at: `http://localhost:3000`

Test the API:
```powershell
# Health check
curl http://localhost:3000/api/health

# Login
curl -X POST http://localhost:3000/api/auth/login `
  -H "Content-Type: application/json" `
  -d '{"username":"admin","passcode":"000000"}'
```

---

## Alternative: Local PostgreSQL

If you prefer local development database:

### Install PostgreSQL 17+

**Windows (via Chocolatey):**
```powershell
choco install postgresql
```

**Manual Download:**
- Download from [postgresql.org](https://www.postgresql.org/download/windows/)
- Follow installer instructions
- Remember the password you set for postgres user

### Create Local Database

```powershell
# Open psql terminal
psql -U postgres

# Create database
CREATE DATABASE ledger_dev;

# Exit psql
\q
```

### Update .env

```bash
DATABASE_URL="postgresql://postgres:YOUR_PASSWORD@localhost:5432/ledger_dev"
```

### Run Migrations + Seed

```powershell
npm run prisma:migrate
npm run prisma:seed
```

---

## Troubleshooting

### Connection Timeout

Railway databases sleep after inactivity. First request might be slow.

**Solution**: The Prisma client auto-retries with exponential backoff; simply retry the request.

### SSL Required Error

Some PostgreSQL hosts require SSL.

**Solution**: Add `?sslmode=require` to connection string:
```bash
DATABASE_URL="postgresql://user:pass@host:port/db?sslmode=require"
```

### Migration Failed

If migration fails mid-way, reset and retry (development only):

```powershell
npx prisma migrate reset
npm run prisma:migrate
npm run prisma:seed
```

**⚠️ Warning**: `prisma migrate reset` drops the database. Never run it against production.

### Prisma Client Out of Sync

After schema changes, regenerate client:

```powershell
npm run prisma:generate
```

### Port Already in Use

If port 3000 is busy:

```powershell
# Check what's using the port
netstat -ano | findstr :3000

# Kill the process (replace PID)
taskkill /PID <process_id> /F

# Or use a different port
# Update .env: PORT=3001
```

---

## Production Deployment on Railway

### 1. Deploy Backend Service

```powershell
# Install Railway CLI
npm install -g @railway/cli

# Login to Railway
railway login

# Link to project
railway link

# Deploy
railway up
```

### 2. Configure Environment Variables

In Railway dashboard, add:

```bash
NODE_ENV=production
PORT=3000
DATABASE_URL=<automatically set by Railway PostgreSQL>
JWT_SECRET=<generate strong 64+ character secret>
JWT_REFRESH_SECRET=<generate different 64+ character secret>
FRONTEND_URL=https://your-frontend-domain.vercel.app
```

### 3. Run Migrations on Production

```powershell
railway run npm run prisma:migrate
railway run npm run prisma:seed
```

`prisma:seed` is idempotent and safe to rerun; it upserts default settings and ensures the admin account exists.

### 4. Enable Custom Domain (Optional)

1. Go to Railway project settings
2. Click "Generate Domain" or add custom domain
3. Update frontend `.env` with new API URL

---

## Production Considerations

### 1. Environment Variables
- Use Railway's environment variable UI
- Set `NODE_ENV=production`
- Generate strong secrets (use `openssl rand -base64 64`)
- Configure CORS with frontend domain

### 2. Database Backups
- Railway provides daily automated backups
- Configure retention period in project settings
- Consider weekly manual exports for critical data

### 3. Scaling
- Railway PostgreSQL can be upgraded to larger instances
- Monitor connection pool usage (default: 10 connections); adjust `PRISMA_CLIENT_ENGINE_MAX_REQUESTS` if needed
- Consider read replicas for high traffic analytics workloads

### 4. Monitoring
- Check Railway metrics dashboard
- Monitor slow queries via Prisma logs
- Set up alerts for high CPU/memory usage
- Enable Railway's logging for debugging

### 5. Security
- **Change default admin passcode immediately**
- Use strong JWT secrets (64+ characters)
- Enable HTTPS (automatic on Railway)
- Configure CORS properly
- Rate limit authentication endpoints
- Keep dependencies updated

---

## Database Schema

### Tables
- **User** — System users (admin/staff) with active flag and audit metadata
- **Customer** — Water refilling customers with locations and optional `customUnitPrice`
- **Sale** — Daily container sales (unique per customer per day)
- **DebtTab** — Open/closed running tabs per customer
- **DebtTransaction** — Charges, payments, adjustments with running balances
- **Setting** — Key-value config (unit price, pricing toggle, business details)
- **Session** — JWT refresh token storage
- **AuditLog** — Activity tracking (JSONB changes)

### Key Constraints
- `unique_customer_date` — One sale per customer per day (enforced by migration `add_unique_customer_date_constraint`)
- Foreign keys with cascades on dependent tables (sessions, audit logs, debt transactions)
- Indexes on frequently queried fields (`customerId`, `userId`, `date`, `debtTabId`)

---

## Development Workflow

### Daily Development
```powershell
# Start backend
npm run dev

# In another terminal, start Prisma Studio
npm run prisma:studio

# Run tests
npm test
```

### After Schema Changes
```powershell
# Create migration
npx prisma migrate dev --name describe_your_change

# Update Prisma Client
npm run prisma:generate

# Restart server
```

### Resetting Development Database
```powershell
# Complete reset (deletes all data)
npx prisma migrate reset

# Seed fresh data
npm run prisma:seed
```

---

## API Endpoint Overview

The codebase groups endpoints by module (`src/modules/<feature>`). Each route file is the authoritative source. Highlights:

### Authentication
- `POST /api/auth/login`
- `POST /api/auth/logout`
- `POST /api/auth/refresh`
- `GET /api/auth/me`
- `POST /api/auth/change-passcode`

### Customers
- `GET /api/customers` — Filter by status/location/search
- `GET /api/customers/locations` — All distinct locations
- `GET /api/customers/:id`
- `POST /api/customers`
- `PUT /api/customers/:id`
- `DELETE /api/customers/:id` — Admin only (soft delete)
- `POST /api/customers/:id/restore` — Admin only
- `GET /api/customers/:id/stats`

### Sales
- `GET /api/sales` — Supports `date`, `startDate`, `endDate`, `customerId`, `userId`
- `GET /api/sales/today`
- `GET /api/sales/date/:date`
- `GET /api/sales/analytics/daily-trend`
- `GET /api/sales/analytics/location-performance`
- `GET /api/sales/analytics/summary`
- `GET /api/sales/customer/:customerId/history`
- `GET /api/sales/:id`
- `POST /api/sales`
- `PATCH /api/sales/:id`
- `DELETE /api/sales/:id`

### Debts
- `POST /api/debts/charge`
- `POST /api/debts/payment`
- `POST /api/debts/adjustment`
- `POST /api/debts/mark-paid`
- `GET /api/debts/customer/:customerId`
- `GET /api/debts/history`

### Settings
- `GET /api/settings`
- `GET /api/settings/:key`
- `PUT /api/settings/:key`
- `POST /api/settings/bulk`
- `DELETE /api/settings/:key`

### Users (Admin-only)
- `GET /api/users/stats`
- `GET /api/users`
- `GET /api/users/:id`
- `POST /api/users`
- `PATCH /api/users/:id`
- `DELETE /api/users/:id`
- `POST /api/users/:id/change-password`

---

## Frontend Integration

### API Base URL
Frontend `.env` should point to backend:

```bash
# Development
VITE_API_URL=http://localhost:3000/api

# Production
VITE_API_URL=https://your-backend.railway.app/api
```

### CORS Configuration
Backend already configured for common origins:
- `http://localhost:5173` (Vite dev)
- `http://localhost:4173` (Vite preview)
- Production frontend domain (configure in Railway env)

---

**Status**: ✅ Ready for production deployment  
**Next**: Deploy to Railway and configure frontend environment variables

**Related Repositories**:
- Frontend: https://github.com/walaywashere/ledger-v2-frontend
- Full documentation: See README.md and POLYREPO.md
