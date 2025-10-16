# Polyrepo Setup - Backend

This repository is part of a **polyrepo architecture** where the backend and frontend are separated into individual repositories.

## Repository Structure

- **Backend** (this repo): https://github.com/walaywashere/ledger-v2-backend
- **Frontend**: https://github.com/walaywashere/ledger-v2-frontend
- **Original Monorepo** (archived): https://github.com/walaywashere/ledger-v2

## Why Polyrepo?

**Benefits:**
1. ✅ **Lighter Pushes** - No need to push frontend code when only backend changes
2. ✅ **Independent Versioning** - Backend and frontend can have separate release cycles
3. ✅ **Easier CI/CD** - Deploy backend and frontend independently
4. ✅ **Cleaner Git History** - Each repo focuses on its own changes
5. ✅ **Better Permissions** - Can grant different access levels to each repo
6. ✅ **Faster Clones** - Clone only what you need to work on

## Development Workflow

### Initial Setup
```bash
# Clone backend
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

# Start dev server
npm run dev
```

### Working with Frontend
The frontend connects to this backend via REST API. Make sure:
1. Backend is running on `http://localhost:3000`
2. CORS is configured to allow frontend origin
3. Frontend `.env` has correct `VITE_API_URL`

### Deployment
Backend and frontend deploy independently:
- **Backend**: Railway, Heroku, or any Node.js host
- **Frontend**: Vercel, Netlify, or any static host

## API Documentation

See [README.md](./README.md) for complete API documentation and endpoint reference.

## Related Repositories

- [Frontend Repository](https://github.com/walaywashere/ledger-v2-frontend)
