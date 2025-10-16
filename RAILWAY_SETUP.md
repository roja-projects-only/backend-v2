# Railway PostgreSQL Setup Guide

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

1. Open `backend-v2/.env`
2. Replace `DATABASE_URL` with the Railway connection string:
   ```
   DATABASE_URL="postgresql://postgres:YOUR_PASSWORD@containers-us-west-XXX.railway.app:7432/railway"
   ```

## Step 4: Run Database Migrations

```powershell
cd backend-v2
npm run prisma:migrate
```

This will:
- Create all database tables (User, Customer, Sale, Setting, Session, AuditLog)
- Apply indexes for performance
- Set up foreign key relationships

## Step 5: Seed Initial Data

```powershell
npm run prisma:seed
```

This creates:
- **Admin user**: username `admin`, passcode `000000`
- **Default settings**: unitPrice = 25.00, businessName = "Yaris Ledger"

## Step 6: Verify Database

Open Prisma Studio to view your data:

```powershell
npm run prisma:studio
```

This opens a web UI at `http://localhost:5555` where you can browse all tables.

## Alternative: Local PostgreSQL

If you prefer local development:

### Install PostgreSQL 17+

**Windows (via chocolatey):**
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

```
DATABASE_URL="postgresql://postgres:YOUR_PASSWORD@localhost:5432/ledger_dev"
```

### Run Migrations + Seed

```powershell
npm run prisma:migrate
npm run prisma:seed
```

## Troubleshooting

### Connection Timeout

Railway databases sleep after inactivity. First request might be slow.

**Solution**: The server will retry connections automatically.

### SSL Required Error

Some PostgreSQL hosts require SSL.

**Solution**: Add `?sslmode=require` to connection string:
```
DATABASE_URL="postgresql://user:pass@host:port/db?sslmode=require"
```

### Migration Failed

If migration fails mid-way, reset and retry:

```powershell
npx prisma migrate reset
npm run prisma:migrate
npm run prisma:seed
```

**Warning**: This deletes all data. Only use in development.

### Prisma Client Out of Sync

After schema changes, regenerate client:

```powershell
npm run prisma:generate
```

## Production Considerations

1. **Environment Variables**:
   - Use Railway's environment variable UI for production
   - Set `NODE_ENV=production`
   - Generate strong secrets for JWT keys (64+ characters)

2. **Backups**:
   - Railway provides daily automated backups
   - Configure retention period in project settings

3. **Scaling**:
   - Railway PostgreSQL can be upgraded to larger instances
   - Monitor connection pool usage

4. **Monitoring**:
   - Check Railway metrics dashboard
   - Monitor slow queries via Prisma logs
   - Set up alerts for high CPU/memory usage

---

**Status**: Ready for Phase 1 testing ✅  
**Next**: Start development server and test authentication endpoints
