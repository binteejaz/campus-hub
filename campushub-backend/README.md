# 🎓 CampusHub Backend

Production-grade REST API + WebSockets backend for the CampusHub campus-life platform.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Runtime | Node.js 20 + TypeScript |
| Framework | Express.js |
| Database | PostgreSQL 16 + Prisma ORM |
| Cache | Redis 7 |
| Auth | JWT (access + refresh) + Google OAuth |
| Real-time | Socket.io |
| Validation | Zod |
| Email | Nodemailer |
| Upload | Multer |
| Logging | Winston |
| Container | Docker + Docker Compose |
| CI/CD | GitHub Actions |

## Quick Start (Docker — Recommended)

```bash
# 1. Clone and configure
cp .env.example .env
# Edit .env with your secrets

# 2. Start everything
docker compose up -d

# 3. Run migrations + seed
docker compose exec api npx prisma migrate dev
docker compose exec api npm run db:seed

# API is live at http://localhost:5000
# pgAdmin at http://localhost:5050 (with --profile dev-tools)
```

## Local Development

### Prerequisites
- Node.js 20+
- PostgreSQL 16
- Redis 7
- npm

```bash
# Install dependencies
npm install

# Configure environment
cp .env.example .env
# Fill in your DATABASE_URL, REDIS_URL, JWT_SECRET etc.

# Generate Prisma client
npm run db:generate

# Push schema to database
npm run db:push

# Seed with sample data
npm run db:seed

# Start dev server with hot reload
npm run dev
```

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | ✅ | PostgreSQL connection string |
| `REDIS_URL` | ⭕ | Redis URL (caching optional) |
| `JWT_SECRET` | ✅ | Min 32 chars, cryptographically random |
| `JWT_REFRESH_SECRET` | ✅ | Different from JWT_SECRET |
| `CLIENT_URL` | ✅ | Frontend origin for CORS |
| `GOOGLE_CLIENT_ID` | ⭕ | For Google OAuth |
| `GOOGLE_CLIENT_SECRET` | ⭕ | For Google OAuth |
| `EMAIL_HOST/USER/PASS` | ⭕ | For email features |

## Project Structure

```
campushub-backend/
├── src/
│   ├── app.ts                  # Express app setup
│   ├── server.ts               # HTTP server + bootstrap
│   ├── config/
│   │   ├── database.ts         # Prisma client singleton
│   │   ├── jwt.ts              # Token utilities
│   │   ├── logger.ts           # Winston logger
│   │   ├── passport.ts         # OAuth strategies
│   │   ├── redis.ts            # Redis client + cache helpers
│   │   └── socket.ts           # Socket.io server + events
│   ├── controllers/
│   │   ├── auth.controller.ts
│   │   ├── studyGroup.controller.ts
│   │   ├── carpool.controller.ts
│   │   ├── lostFound.controller.ts
│   │   ├── event.controller.ts
│   │   ├── chat.controller.ts
│   │   ├── user.controller.ts
│   │   ├── notification.controller.ts
│   │   └── search.controller.ts
│   ├── middleware/
│   │   ├── auth.ts             # JWT authenticate + requireRole
│   │   ├── errorHandler.ts     # Global error + 404
│   │   ├── notFound.ts
│   │   └── validate.ts         # Zod schema validator
│   ├── routes/
│   │   ├── auth.routes.ts
│   │   ├── studyGroup.routes.ts
│   │   ├── carpool.routes.ts
│   │   ├── lostFound.routes.ts
│   │   ├── event.routes.ts
│   │   ├── chat.routes.ts
│   │   ├── user.routes.ts
│   │   ├── notification.routes.ts
│   │   ├── search.routes.ts
│   │   └── upload.routes.ts
│   ├── services/
│   │   ├── email.service.ts    # Nodemailer templated emails
│   │   └── notification.service.ts  # Create + push notifications
│   ├── utils/
│   │   ├── ApiError.ts
│   │   └── ApiResponse.ts
│   └── validators/
│       └── schemas.ts          # All Zod schemas
├── prisma/
│   ├── schema.prisma           # Full data model
│   └── seed.ts                 # Realistic sample data
├── .env.example
├── .github/workflows/ci.yml    # GitHub Actions pipeline
├── API_DOCS.md                 # Full API reference
├── docker-compose.yml
├── Dockerfile
└── tsconfig.json
```

## Available Scripts

```bash
npm run dev          # Dev server with hot reload
npm run build        # Compile TypeScript → dist/
npm run start        # Start compiled production server
npm run db:generate  # Generate Prisma client
npm run db:push      # Push schema without migration
npm run db:migrate   # Create + apply migration
npm run db:studio    # Open Prisma Studio GUI
npm run db:seed      # Seed sample data
npm run lint         # ESLint
npm run test         # Jest tests
```

## Security Highlights

- **Helmet** — HTTP security headers
- **CORS** — Strict allowlist
- **Rate limiting** — 100 req/15min global, 10/15min on auth
- **bcrypt** — Password hashing (12 rounds)
- **JWT rotation** — Short-lived access (15min) + refresh token rotation
- **Zod validation** — All inputs validated at the route level
- **SQL injection** — Prisma ORM parameterizes all queries
- **Non-root Docker** — Container runs as `campushub` user

## Demo Credentials (after seeding)

```
Email:    demo@campus.edu
Password: Demo1234!

Email:    sara@campus.edu
Password: Demo1234!
```

## API Health Check

```bash
curl http://localhost:5000/health
```
