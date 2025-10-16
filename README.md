# Ledger Backend API

Backend API for Yaris Water Refilling Ledger built with Express.js, TypeScript, Prisma, and PostgreSQL.

## Tech Stack

- **Runtime**: Node.js 18+
- **Framework**: Express.js
- **Language**: TypeScript
- **Database**: PostgreSQL 17+
- **ORM**: Prisma
- **Authentication**: JWT (Access + Refresh tokens)
- **Validation**: Zod
- **Logging**: Winston
- **Security**: Helmet, CORS, bcrypt

## Project Structure

```
backend-v2/
├── src/
│   ├── config/           # Configuration files (database, env, logger)
│   ├── middleware/       # Express middleware (auth, error handler, validator, logger, cors)
│   ├── modules/          # Feature modules (auth, customers, sales, settings, users)
│   │   └── auth/         # Auth module with routes, controller, service, validators, types
│   ├── utils/            # Helper utilities (errors, response formatters, pagination)
│   ├── app.ts            # Express app configuration
│   └── server.ts         # Server entry point
├── prisma/
│   ├── schema.prisma     # Prisma schema with all models
│   └── seed.ts           # Database seed script
├── logs/                 # Application logs (gitignored)
├── dist/                 # Compiled JavaScript (gitignored)
├── .env                  # Environment variables (gitignored)
├── .env.example          # Environment variable template
├── package.json          # Dependencies and scripts
└── tsconfig.json         # TypeScript configuration
```

## Setup Instructions

### 1. Install Dependencies

```powershell
cd backend-v2
npm install
```

### 2. Configure Environment

Copy `.env.example` to `.env` and update the values:

```powershell
cp .env.example .env
```

Update `DATABASE_URL` with your PostgreSQL connection string.

### 3. Setup Database

Generate Prisma client:

```powershell
npm run prisma:generate
```

Run database migrations:

```powershell
npm run prisma:migrate
```

Seed initial data (admin user + default settings):

```powershell
npm run prisma:seed
```

**Default Admin User:**
- Username: `admin`
- Passcode: `000000`

### 4. Start Development Server

```powershell
npm run dev
```

Server will run on `http://localhost:3000`

## Available Scripts

- `npm run dev` - Start development server with hot reload
- `npm run build` - Build TypeScript to JavaScript
- `npm start` - Start production server
- `npm run prisma:generate` - Generate Prisma Client
- `npm run prisma:migrate` - Run database migrations
- `npm run prisma:studio` - Open Prisma Studio (database GUI)
- `npm run prisma:seed` - Seed database with initial data

## API Endpoints

### Authentication

- `POST /api/auth/login` - Login with username and passcode
- `POST /api/auth/refresh` - Refresh access token
- `POST /api/auth/logout` - Logout (invalidate session)
- `GET /api/auth/me` - Get current user info (protected)
- `POST /api/auth/change-password` - Change own password (protected)
- `POST /api/auth/register` - Register new user (admin only)

### Health Check

- `GET /health` - Health check endpoint

## Database Schema

### Models

- **User** - User accounts (max 3 users)
- **Customer** - Customer records with location and optional custom pricing
- **Sale** - Sale transactions linked to customer and user
- **Setting** - Key-value settings (unitPrice, businessName)
- **Session** - JWT refresh token sessions
- **AuditLog** - Audit trail for all CRUD operations

### Enums

- **UserRole**: ADMIN, STAFF
- **Location**: BANAI, DOUBE_L, JOVIL_3, LOWER_LOOB, PINATUBO, PLASTIKAN, SAN_ISIDRO, UPPER_LOOB, URBAN, ZUNIGA
- **AuditAction**: CREATE, UPDATE, DELETE, LOGIN, LOGOUT

## Authentication Flow

1. **Login**: POST `/api/auth/login` with username + passcode
   - Returns: `{ user, accessToken, refreshToken, expiresIn }`
   - Access token expires in 15 minutes
   - Refresh token expires in 7 days

2. **Access Protected Routes**: Include `Authorization: Bearer <accessToken>` header

3. **Refresh Token**: POST `/api/auth/refresh` with `refreshToken` body
   - Returns new access token

4. **Logout**: POST `/api/auth/logout` with `refreshToken` body
   - Invalidates session

## Error Handling

All API responses follow a standard format:

**Success Response:**
```json
{
  "success": true,
  "data": { ... },
  "message": "Operation completed",
  "pagination": { ... }  // Optional for list endpoints
}
```

**Error Response:**
```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Error description",
    "details": { ... }  // Optional
  }
}
```

## Development Notes

- **File Size Rule**: Keep files ≤ 300 lines; extract to smaller modules when needed
- **Layered Architecture**: Routes → Controllers → Services → Repositories → Database
- **Validation**: All input validated with Zod schemas
- **Error Handling**: Custom error classes with global error handler middleware
- **Logging**: Winston logger with console + file transports
- **Security**: JWT authentication, bcrypt password hashing, helmet middleware

## Production Deployment

1. Set `NODE_ENV=production` in environment
2. Update `DATABASE_URL` to production PostgreSQL
3. Generate strong random strings for `JWT_SECRET` and `JWT_REFRESH_SECRET` (min 64 chars)
4. Run migrations: `npm run prisma:migrate`
5. Build application: `npm run build`
6. Start server: `npm start`

## Next Steps (Phase 2-5)

- [ ] Implement Customers API (CRUD + stats)
- [ ] Implement Sales API (CRUD + aggregations)
- [ ] Implement Settings API (key-value store)
- [ ] Implement Users API (admin management)
- [ ] Implement Analytics API (dashboard, trends, CLV)
- [ ] Implement Audit Logs API (trail of all actions)
- [ ] Add comprehensive unit + integration tests
- [ ] Performance optimization (indexes, caching)
- [ ] Deploy to Railway with automated backups

---

**Status**: Phase 1 Complete ✅  
**Next Phase**: Core APIs (Week 2)
