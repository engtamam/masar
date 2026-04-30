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
# Edit .env — at minimum set JWT_SECRET and admin credentials

# 3. Initialize database (schema + seed)
make db-setup

# 4. Run the app
make dev
```

Open **http://localhost:3000** — you're live.

Or use the all-in-one command:

```bash
make setup    # install + generate + push schema + seed
make dev      # start dev server
```

---

## Accounts

Only the **Admin** account is seeded. Everyone else joins differently:

| Role | How to Access |
|------|---------------|
| **Admin** | Auto-seeded — credentials below |
| **Consultant** | Account created by Admin from the admin panel |
| **Entrepreneur** | Registers themselves from the landing page |

### Admin Credentials (defaults)

| | Value |
|---|---|
| Email | `admin@masar.sa` |
| Password | `admin123` |

Customize before seeding via `.env`:

```env
ADMIN_EMAIL=your-email@example.com
ADMIN_PASSWORD=your-secure-password
ADMIN_NAME=Your Name
```

⚠️ **Always change these in production!**

---

## Environment Variables

### Required

| Variable | Description |
|----------|-------------|
| `JWT_SECRET` | Secret key for auth tokens — must be a long random string in production |

### Admin Account (set before seeding)

| Variable | Default | Description |
|----------|---------|-------------|
| `ADMIN_EMAIL` | `admin@masar.sa` | Admin login email |
| `ADMIN_PASSWORD` | `admin123` | Admin login password |
| `ADMIN_NAME` | `مدير المنصة` | Admin display name |

### Database

| Variable | Default | Description |
|----------|---------|-------------|
| `DATABASE_URL` | `file:./db/custom.db` | SQLite database path (dev) |

### Optional Platform Config

These are stored in the database and can be changed from the **Admin Control Panel**. Env variables override database values.

| Variable | Default | Description |
|----------|---------|-------------|
| `PLATFORM_NAME` | `مَسَار` | Platform display name |
| `ENCRYPTION_KEY` | built-in default | AES-256-CBC key for file encryption (change in production!) |
| `DEFAULT_MONTHLY_QUOTA` | `4` | Monthly booking limit for entrepreneurs |
| `DEFAULT_SLOT_DURATION` | `30` | Consultation slot duration in minutes |
| `JITSI_DOMAIN` | `meet.jit.si` | Jitsi Meet domain for video calls |
| `UPLOAD_MAX_SIZE_MB` | `10` | Maximum file upload size in MB |
| `ALLOWED_FILE_TYPES` | `["pdf","doc","docx",...]` | Allowed file extensions (JSON array) |
| `DEFAULT_LANGUAGE` | `ar` | Default platform language |
| `JWT_EXPIRY` | `7d` | JWT token expiry duration |

### Email Service (optional)

Required for email verification and password reset. Without it, email links print to the server console.

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
- **Real-time:** Socket.IO chat service (standalone mini-service)
- **Video:** Jitsi Meet integration
- **Files:** AES-256-CBC encryption at rest
- **Deployment:** Docker + Caddy (auto HTTPS via Let's Encrypt)

### Platform Roles

| Role | How They Access | What They Do |
|------|----------------|-------------|
| **Entrepreneur** | Registers from landing page | Follows the 8-milestone journey, books consultations, uploads files, chats with consultants |
| **Consultant** | Account created by Admin | Reviews & approves milestones, provides consultations, guides entrepreneurs |
| **Admin** | Seeded during setup | Manages users, specialties, milestones, configs, quotas, monitors chat |

### 8-Milestone Journey

Each milestone unlocks only after the previous one is approved by a consultant:

| # | Stage | Arabic |
|---|-------|--------|
| 1 | Business Model Canvas | نموذج العمل |
| 2 | MVP | النموذج الأولي |
| 3 | Data Room | غرفة البيانات |
| 4 | Roadmap | خارطة الطريق |
| 5 | Financials | البيانات المالية |
| 6 | Pitch Deck | العرض الاستثماري |
| 7 | Exit Strategy | استراتيجية الخروج |
| 8 | The Ask | تحديد قيمة التمويل |

### Key Features

- **Gated progression** — milestones unlock sequentially after consultant approval
- **Booking engine** — entrepreneurs book consultation sessions with quota management
- **Real-time chat** — WebSocket-based messaging between entrepreneurs and consultants
- **Encrypted file storage** — AES-256-CBC encryption for all uploaded documents
- **Jitsi Meet video calls** — integrated video conferencing for consultation sessions
- **Dynamic platform config** — all settings manageable from admin panel (no code changes needed)
- **Legal pages from markdown** — privacy policy and terms of service read from `.md` files for easy editing
- **Dynamic stats** — entrepreneur count on landing page reflects actual database count (hidden if < 10)

---

## Project Structure

```
├── content/                    # Markdown files (legal pages — edit directly)
│   ├── privacy-policy.md       # سياسة الخصوصية
│   └── terms-of-service.md     # شروط وأحكام الاستخدام
├── prisma/
│   ├── schema.prisma           # Database schema
│   └── seed.ts                 # Seed data (admin + specialties + milestones)
├── src/
│   ├── app/
│   │   ├── api/                # API routes
│   │   │   ├── auth/           # Login, register, verify email, forgot/reset password
│   │   │   ├── admin/          # Admin-only routes (users, specialties, milestones, configs, quotas, reports, chat)
│   │   │   ├── bookings/       # Booking management + availability
│   │   │   ├── chat/           # Chat rooms & messages
│   │   │   ├── files/          # Encrypted file upload/download
│   │   │   ├── health/         # Health check endpoint
│   │   │   ├── milestones/     # Milestone progress & approval
│   │   │   ├── notifications/  # User notifications
│   │   │   └── stats/          # Public stats (entrepreneur count for landing page)
│   │   ├── privacy/            # Privacy policy page (reads from markdown)
│   │   ├── terms/              # Terms of service page (reads from markdown)
│   │   ├── globals.css         # Global styles
│   │   ├── layout.tsx          # Root layout (Arabic RTL + Noto Sans Arabic font)
│   │   └── page.tsx            # Main SPA entry (routes to landing/auth/dashboards)
│   ├── components/
│   │   ├── admin/              # Admin dashboard (users, specialties, milestones, configs, quotas, reports, chat monitor)
│   │   ├── auth/               # Login, register, forgot/reset password, verify email
│   │   ├── consultant/         # Consultant dashboard (overview, schedule, entrepreneurs, chat)
│   │   ├── entrepreneur/       # Entrepreneur dashboard (journey, bookings, chat, files)
│   │   ├── landing/            # Landing page (MasarLanding) — 10 animated sections
│   │   ├── legal/              # Legal page renderer (markdown → styled HTML)
│   │   └── ui/                 # shadcn/ui base components
│   └── lib/
│       ├── api.ts              # Frontend API client (all backend routes)
│       ├── auth.ts             # Password hashing + JWT utilities
│       ├── config.ts           # Platform config system (DB → env → defaults with caching)
│       ├── db.ts               # Prisma client singleton
│       ├── email.ts            # Email service (Resend API + console fallback)
│       ├── encryption.ts       # AES-256-CBC file encryption/decryption
│       ├── middleware.ts       # Auth middleware (getCurrentUser, requireRole, response helpers)
│       ├── quotas.ts           # Booking quota checking system
│       ├── store.ts            # Zustand global state (auth, navigation, UI)
│       └── utils.ts            # Shared utilities (cn, formatDate, etc.)
├── mini-services/
│   └── chat-service/           # Standalone Socket.IO WebSocket server (port 3003)
│       ├── index.ts            # Chat server with JWT auth, rooms, typing, presence
│       ├── package.json
│       └── Dockerfile
├── Caddyfile                   # Production reverse proxy (auto HTTPS + WebSocket)
├── docker-compose.yml          # Development Docker stack
├── docker-compose.prod.yml     # Production Docker stack (Caddy + Web + Chat)
├── deploy.sh                   # AWS deployment script (install, deploy, update, reset, backup)
├── Dockerfile                  # Multi-stage production build
├── Makefile                    # All commands (dev, db, docker, prod, cleanup)
└── .env.example                # Environment variable template
```

---

## Makefile Commands

### Quick Start

| Command | Description |
|---------|-------------|
| `make setup` | First-time setup: install deps + push schema + seed |
| `make dev` | Start Next.js dev server on port 3000 |
| `make fresh` | Delete everything and start from scratch |

### Development

| Command | Description |
|---------|-------------|
| `make dev` | Start Next.js dev server on port 3000 |
| `make dev-chat` | Start Socket.IO chat service on port 3003 |
| `make dev-all` | Start both web + chat in parallel |

### Database

| Command | Description |
|---------|-------------|
| `make db-setup` | Push schema + seed data |
| `make db-push` | Push schema changes only |
| `make db-generate` | Regenerate Prisma client |
| `make db-reset` | Reset database (destructive) |
| `make db-reset-fresh` | Delete DB file + push schema + seed |
| `make seed` | Run seed script only (idempotent) |

### Code Quality

| Command | Description |
|---------|-------------|
| `make lint` | Run ESLint |
| `make lint-fix` | Run ESLint with auto-fix |
| `make typecheck` | Run TypeScript type checking |

### Build & Run

| Command | Description |
|---------|-------------|
| `make build` | Build for production |
| `make start` | Start production server |

### Docker (Development)

| Command | Description |
|---------|-------------|
| `make docker-build` | Build Docker images |
| `make docker-up` | Start Docker containers |
| `make docker-down` | Stop Docker containers |
| `make docker-logs` | View container logs |
| `make docker-restart` | Restart all containers |

### Docker (Production)

| Command | Description |
|---------|-------------|
| `make prod-up` | Start production stack (Caddy + Web + Chat) |
| `make prod-down` | Stop production stack |
| `make prod-logs` | View production logs |
| `make prod-status` | Check container status |
| `make prod-reset` | Wipe production data and re-seed |
| `make prod-update` | Rebuild and redeploy (no data loss) |
| `make prod-backup` | Backup production database to ./backups/ |
| `make prod-seed` | Run seed in production container |

### Cleanup

| Command | Description |
|---------|-------------|
| `make clean` | Remove .next and cache |
| `make clean-all` | Remove node_modules too |
| `make nuke` | Delete EVERYTHING including .env (requires typing "DESTROY") |

---

## Chat Service (Real-time)

The standalone WebSocket chat service runs on port 3003:

```bash
make dev-chat
```

Features:
- Socket.IO with JWT authentication
- Messages persisted to the main database via API
- Typing indicators and read receipts
- Online presence tracking
- Multi-device support

Without the chat service, chat still works via API polling (5s interval).

---

## Production Deployment (AWS)

```bash
# One-command deploy (installs Docker, sets up everything)
bash deploy.sh deploy

# Or manually:
make prod-up
```

### Production Requirements

1. **Set these in `.env`** before deploying:

```env
JWT_SECRET=your-very-long-random-secret-key
ENCRYPTION_KEY=your-very-long-encryption-key
ADMIN_EMAIL=admin@yourdomain.com
ADMIN_PASSWORD=a-secure-password
ADMIN_NAME=Platform Admin
DOMAIN=yourdomain.com
```

2. **Caddy** automatically provisions HTTPS via Let's Encrypt

3. **The deploy script** handles:
   - Docker installation
   - Container orchestration (Caddy + Web + Chat)
   - Database initialization and seeding
   - SSL certificate provisioning
   - Backups and updates

---

## Legal Pages

Legal pages render from markdown files — edit them directly without touching any code:

- **Privacy Policy:** `/privacy` → `content/privacy-policy.md`
- **Terms of Service:** `/terms` → `content/terms-of-service.md`

These pages are linked from:
- The landing page footer
- The registration form (required checkbox acceptance)
- The legal page footers

---

## API Routes

### Public (no auth)

| Method | Route | Description |
|--------|-------|-------------|
| GET | `/api/stats` | Public platform stats (entrepreneur count) |
| POST | `/api/auth/login` | Login |
| POST | `/api/auth/register` | Register (entrepreneur only) |
| POST | `/api/auth/forgot-password` | Request password reset |
| POST | `/api/auth/reset-password` | Reset password with token |
| GET | `/api/health` | Health check |

### Authenticated

| Method | Route | Description |
|--------|-------|-------------|
| GET | `/api/auth/me` | Get current user |
| POST | `/api/auth/verify-email` | Verify email |
| POST | `/api/auth/resend-verification` | Resend verification email |
| GET | `/api/milestones` | Get user's milestones |
| POST | `/api/milestones/[id]/submit` | Submit milestone for review |
| POST | `/api/milestones/[id]/approve` | Approve/reject milestone (consultant) |
| GET/POST | `/api/bookings` | List/create bookings |
| PATCH | `/api/bookings/[id]` | Update booking status |
| GET/POST | `/api/bookings/availability` | Get/set availability |
| POST | `/api/bookings/availability/clone` | Clone previous month's schedule |
| GET/POST | `/api/chat/rooms` | List/create chat rooms |
| GET/POST | `/api/chat/rooms/[id]/messages` | List/send messages |
| GET/POST | `/api/files` | List/upload encrypted files |
| GET/DELETE | `/api/files/[id]` | Download/delete file |
| GET/PATCH/DELETE | `/api/notifications` | List/mark/clear notifications |

### Admin Only

| Method | Route | Description |
|--------|-------|-------------|
| GET/POST | `/api/admin/users` | List/create users |
| GET/POST/PATCH/DELETE | `/api/admin/specialties` | Manage specialties |
| GET/POST/PATCH/DELETE | `/api/admin/milestones` | Manage milestone defaults |
| GET/PATCH | `/api/admin/configs` | Platform configuration |
| GET/PATCH | `/api/admin/quotas` | Manage booking quotas |
| GET | `/api/admin/reports` | Dashboard statistics |
| GET | `/api/admin/chat` | Monitor chat rooms |

---

## License

Proprietary — All rights reserved.
