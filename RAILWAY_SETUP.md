# Railway PostgreSQL Setup Guide

> **Part of**: [Water Refilling Ledger Backend](https://github.com/walaywashere/ledger-v2-backend)  
> **Frontend Repository**: https://github.com/walaywashere/ledger-v2-frontend

Express.js + Prisma + PostgreSQL backend setup guide for Railway deployment.

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
- Create all database tables (User, Customer, Sale, Setting, Session, AuditLog)
- Apply indexes for performance (customerId, userId, date)
- Set up foreign key relationships
- Create unique constraint for one sale per customer per day

## Step 5: Seed Initial Data

```powershell
npm run prisma:seed
```

This creates:
- **Admin user**: username `admin`, passcode `000000`
- **Default settings**: unitPrice = 25.00, businessName = "Yaris Ledger"

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

**Solution**: The server will retry connections automatically.

### SSL Required Error

Some PostgreSQL hosts require SSL.

**Solution**: Add `?sslmode=require` to connection string:
```bash
DATABASE_URL="postgresql://user:pass@host:port/db?sslmode=require"
```

### Migration Failed

If migration fails mid-way, reset and retry:

```powershell
npx prisma migrate reset
npm run prisma:migrate
npm run prisma:seed
```

**⚠️ Warning**: This deletes all data. Only use in development.

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
- Monitor connection pool usage (default: 10 connections)
- Consider read replicas for high traffic

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
- **User** - System users (admin/staff)
- **Customer** - Water refilling customers
- **Sale** - Daily gallon sales (unique per customer per day)
- **Setting** - Key-value config (unitPrice, businessName, etc.)
- **Session** - JWT refresh token storage
- **AuditLog** - Activity tracking (JSONB changes)

### Key Constraints
- `unique_customer_date` - One sale per customer per day
- Foreign keys with cascade deletes (sessions, audit logs)
- Indexes on frequently queried fields

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

## API Endpoints

### Authentication (6 endpoints)
- `POST /api/auth/login` - Login with username/passcode
- `POST /api/auth/logout` - Logout (invalidate tokens)
- `POST /api/auth/refresh` - Refresh access token
- `GET /api/auth/me` - Get current user
- `POST /api/auth/change-passcode` - Change own passcode
- `POST /api/auth/validate` - Validate access token

### Customers (8 endpoints)
- `GET /api/customers` - List all customers (pagination)
- `GET /api/customers/:id` - Get customer by ID
- `POST /api/customers` - Create customer
- `PUT /api/customers/:id` - Update customer
- `DELETE /api/customers/:id` - Delete customer (soft delete)
- `GET /api/customers/location/:location` - Filter by location
- `GET /api/customers/search` - Search by name/phone
- `GET /api/customers/:id/sales` - Get customer sales history

### Sales (11 endpoints)
- `GET /api/sales` - List all sales (pagination)
- `GET /api/sales/:id` - Get sale by ID
- `POST /api/sales` - Create/update sale (upsert logic)
- `PUT /api/sales/:id` - Update sale
- `DELETE /api/sales/:id` - Delete sale
- `GET /api/sales/today` - Today's sales
- `GET /api/sales/date/:date` - Sales by date
- `GET /api/sales/customer/:customerId` - Customer sales
- `GET /api/sales/location/:location` - Location sales
- `GET /api/sales/date-range` - Sales between dates
- `GET /api/sales/analytics/kpis` - KPI calculations

### Settings (8 endpoints)
- `GET /api/settings` - Get all settings
- `GET /api/settings/:key` - Get setting by key
- `POST /api/settings` - Create setting
- `PUT /api/settings/:key` - Update setting
- `DELETE /api/settings/:key` - Delete setting
- `POST /api/settings/bulk` - Bulk update settings
- `GET /api/settings/defaults` - Get default settings
- `POST /api/settings/reset` - Reset to defaults (admin only)

### Users (7 endpoints)
- `GET /api/users` - List all users (admin only)
- `GET /api/users/:id` - Get user by ID
- `POST /api/users` - Create user (admin only, max 3 users)
- `PUT /api/users/:id` - Update user (admin only)
- `DELETE /api/users/:id` - Deactivate user (admin only)
- `PUT /api/users/:id/activate` - Reactivate user (admin only)
- `GET /api/users/active` - List active users

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
