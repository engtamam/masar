# مَسَار — Masar Platform

A free digital incubator platform that prepares entrepreneurs for acceptance into incubators and accelerators through an 8-milestone guided journey with expert consultation.

**مبادرة مجانية تُجهّزك للقبول في الحاضنات والمسرّعات**

---

## Quick Start

```bash
# 1. Install dependencies
bun install

# 2. Set up environment
cp .env.example .env
# Edit .env — at minimum set JWT_SECRET

# 3. Initialize database (schema + seed)
make db-setup

# 4. Run the app
make dev
```

Open **http://localhost:3000** — you're live.

---

## Default Account (after seeding)

Only one account is created during seeding — the **Admin**. Everyone else joins differently:

| Role | How to Access |
|------|---------------|
| **Admin** | Seeded automatically — see credentials below |
| **Consultant** | Account created by Admin from the admin panel |
| **Entrepreneur** | Registers themselves from the landing page |

### Admin Credentials

By default:

| | Value |
|---|---|
| Email | `admin@masar.sa` |
| Password | `admin123` |

**⚠️ Change these in production!** Set in `.env`:

```env
ADMIN_EMAIL=your-email@example.com
ADMIN_PASSWORD=your-secure-password
ADMIN_NAME=Your Name
```

---

## Environment Variables

### Required

| Variable | Description |
|----------|-------------|
| `JWT_SECRET` | Secret key for auth tokens — must be a long random string in production |

### Optional (with defaults)

| Variable | Default | Description |
|----------|---------|-------------|
| `DATABASE_URL` | `file:./db/custom.db` | SQLite database path |
| `ENCRYPTION_KEY` | built-in default | AES-256-CBC key for file encryption (change in production!) |
| `PLATFORM_NAME` | `مَسَار` | Platform display name |
| `DEFAULT_MONTHLY_QUOTA` | `4` | Monthly booking limit for entrepreneurs |
| `DEFAULT_SLOT_DURATION` | `30` | Consultation slot duration in minutes |
| `JITSI_DOMAIN` | `meet.jit.si` | Jitsi Meet domain for video calls |
| `UPLOAD_MAX_SIZE_MB` | `10` | Maximum file upload size |
| `JWT_EXPIRY` | `7d` | JWT token expiry duration |
| `DEFAULT_LANGUAGE` | `ar` | Default platform language |

### Email Service (optional)

Required for email verification and password reset emails. Without it, email links print to server console.

| Variable | Description |
|----------|-------------|
| `RESEND_API_KEY` | API key from [resend.com](https://resend.com) (free tier available) |
| `EMAIL_FROM` | Sender email (e.g. `noreply@masar.sa`) |

---

## Architecture

### Tech Stack

- **Frontend:** Next.js 16 (App Router) + React 19 + TypeScript + Tailwind CSS 4
- **UI:** shadcn/ui components + Framer Motion animations
- **State:** Zustand + React Query
- **Backend:** Next.js API Routes + Prisma ORM
- **Database:** SQLite (dev) / PostgreSQL (production)
- **Auth:** Custom JWT + bcryptjs
- **Real-time:** Socket.IO chat service (standalone)
- **Video:** Jitsi Meet integration
- **Files:** AES-256-CBC encryption at rest
- **Deployment:** Docker + Caddy (auto HTTPS)

### Platform Roles

| Role | How They Access |
|------|----------------|
| **Entrepreneur** | Registers directly from the landing page |
| **Consultant** | Account created by Admin |
| **Admin** | Account created during initial setup/seed |

### 8-Milestone Journey

1. **Business Model Canvas** — نموذج العمل
2. **MVP** — النموذج الأولي
3. **Data Room** — غرفة البيانات
4. **Roadmap** — خارطة الطريق
5. **Financials** — البيانات المالية
6. **Pitch Deck** — العرض الاستثماري
7. **Exit Strategy** — استراتيجية الخروج
8. **The Ask** — تحديد قيمة التمويل

Each milestone unlocks only after the previous one is approved by a consultant.

---

## Project Structure

```
├── content/                    # Markdown files (legal pages)
│   ├── privacy-policy.md
│   └── terms-of-service.md
├── prisma/
│   ├── schema.prisma           # Database schema
│   └── seed.ts                 # Seed data
├── src/
│   ├── app/
│   │   ├── api/                # API routes
│   │   │   ├── auth/           # Login, register, verify, reset
│   │   │   ├── admin/          # Admin-only routes
│   │   │   ├── bookings/       # Booking management
│   │   │   ├── chat/           # Chat rooms & messages
│   │   │   ├── files/          # Encrypted file upload/download
│   │   │   ├── health/         # Health check
│   │   │   ├── milestones/     # Milestone progress & approval
│   │   │   ├── notifications/  # User notifications
│   │   │   └── stats/          # Public stats (landing page)
│   │   ├── privacy/            # Privacy policy page
│   │   ├── terms/              # Terms of service page
│   │   ├── layout.tsx          # Root layout (Arabic RTL)
│   │   └── page.tsx            # Main SPA entry
│   ├── components/
│   │   ├── admin/              # Admin dashboard
│   │   ├── auth/               # Login, register, forgot password
│   │   ├── consultant/         # Consultant dashboard
│   │   ├── entrepreneur/       # Entrepreneur dashboard
│   │   ├── landing/            # Landing page (MasarLanding)
│   │   ├── legal/              # Legal page renderer
│   │   └── ui/                 # shadcn/ui components
│   └── lib/
│       ├── api.ts              # Frontend API client
│       ├── auth.ts             # Auth utilities
│       ├── config.ts           # Platform config (DB + env + defaults)
│       ├── db.ts               # Prisma client
│       ├── email.ts            # Email service (Resend + console fallback)
│       ├── encryption.ts       # AES-256-CBC file encryption
│       ├── middleware.ts        # Auth middleware helpers
│       ├── quotas.ts           # Booking quota system
│       ├── store.ts            # Zustand global state
│       └── utils.ts            # Shared utilities
├── mini-services/
│   └── chat-service/           # Socket.IO WebSocket chat server
├── Caddyfile                   # Production reverse proxy config
├── docker-compose.yml          # Development Docker stack
├── docker-compose.prod.yml     # Production Docker stack
├── deploy.sh                   # AWS deployment script
├── Dockerfile                  # Multi-stage production build
├── Makefile                    # All commands
└── .env.example                # Environment variable template
```

---

## Makefile Commands

### Development

| Command | Description |
|---------|-------------|
| `make dev` | Start Next.js dev server on port 3000 |
| `make dev-chat` | Start Socket.IO chat service on port 3003 |
| `make dev-all` | Start both web + chat in parallel |
| `make lint` | Run ESLint |

### Database

| Command | Description |
|---------|-------------|
| `make db-setup` | Push schema + seed data (first time) |
| `make db-push` | Push schema changes only |
| `make db-generate` | Regenerate Prisma client |
| `make db-reset` | Reset database (destructive) |
| `make seed` | Run seed script only |

### Build & Production

| Command | Description |
|---------|-------------|
| `make build` | Build for production |
| `make start` | Start production server |
| `make fresh` | Full reset: db + build + start |
| `make nuke` | Delete everything (db, node_modules, cache) |

### Docker (Development)

| Command | Description |
|---------|-------------|
| `make docker-build` | Build Docker images |
| `make docker-up` | Start Docker containers |
| `make docker-down` | Stop Docker containers |
| `make docker-logs` | View container logs |

### Docker (Production)

| Command | Description |
|---------|-------------|
| `make prod-up` | Start production stack (Caddy + Web + Chat) |
| `make prod-down` | Stop production stack |
| `make prod-logs` | View production logs |
| `make prod-status` | Check container status |
| `make prod-reset` | Reset production database |
| `make prod-update` | Pull latest + rebuild + restart |
| `make prod-backup` | Backup production database |

### Cleanup

| Command | Description |
|---------|-------------|
| `make clean` | Remove build artifacts and cache |
| `make clean-all` | Remove everything including node_modules and db |

---

## Chat Service (Real-time)

The standalone WebSocket chat service runs on port 3003:

```bash
make dev-chat
```

- Uses Socket.IO with JWT authentication
- Messages persisted to the main database via API
- Typing indicators, read receipts, presence tracking
- Without it, chat still works via API polling (5s interval)

---

## Production Deployment (AWS)

```bash
# One-command deploy (installs Docker, sets up everything)
bash deploy.sh deploy

# Or manually:
make prod-up
```

### Production Requirements

1. Set these in `.env`:
   ```env
   JWT_SECRET=your-very-long-random-secret-key
   ENCRYPTION_KEY=your-very-long-encryption-key
   DOMAIN=yourdomain.com
   ```

2. Caddy automatically provisions HTTPS via Let's Encrypt

3. The deploy script handles:
   - Docker installation
   - Container orchestration
   - Database initialization
   - SSL certificate provisioning

---

## Legal Pages

- **Privacy Policy:** `/privacy` — reads from `content/privacy-policy.md`
- **Terms of Service:** `/terms` — reads from `content/terms-of-service.md`

To edit the legal text, just modify the markdown files — no code changes needed. The pages render them automatically.

---

## License

Proprietary — All rights reserved.
