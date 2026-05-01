# مَسَار — Masar Platform

A free digital incubator platform that prepares entrepreneurs for acceptance into incubators and accelerators through an 8-milestone guided journey with expert consultation.

**مبادرة مجانية تُجهّزك للقبول في الحاضنات والمسرّعات**

---

## Quick Start

### Development

```bash
cp .env.example .env      # Create .env from template
make gen-keys              # Generate secure random keys
make setup                 # Install bun + deps + push schema + seed
make dev                   # Start dev server on port 3000
```

### Production (Docker — recommended)

```bash
cp .env.production .env    # Create .env from production template
make gen-keys               # Generate secure random keys
nano .env                   # Set DOMAIN, ADMIN_PASSWORD
make deploy                 # Build Docker + start + seed (same as bash deploy.sh)
```

### Production (Direct — no Docker)

```bash
cp .env.production .env    # Create .env from production template
make gen-keys               # Generate secure random keys
nano .env                   # Set DOMAIN, ADMIN_PASSWORD
make prod-setup             # Install bun + deps + build + push schema + seed
make start                  # Start production server
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
| `DATABASE_URL` | Database connection string |
| `JWT_SECRET` | Secret key for auth tokens — generate with `make gen-keys` |

### Admin Account (set before seeding)

| Variable | Default | Description |
|----------|---------|-------------|
| `ADMIN_EMAIL` | `admin@masar.sa` | Admin login email |
| `ADMIN_PASSWORD` | `admin123` | Admin login password |
| `ADMIN_NAME` | `مدير المنصة` | Admin display name |

### Security

| Variable | Description |
|----------|-------------|
| `ENCRYPTION_KEY` | AES-256-CBC key for file encryption — generate with `make gen-keys` |

### Database

| Variable | When to Use |
|----------|-------------|
| `file:./dev.db` | Development (direct) |
| `file:./db/production.db` | Production (direct, no Docker) |
| `file:/app/db/production.db` | Production (inside Docker container) |
| `postgresql://user:pass@host:5432/masar` | PostgreSQL (for scaling) |

### Domain & Auth (required for production)

| Variable | Description |
|----------|-------------|
| `DOMAIN` | Your domain name (e.g., `masar.example.com`) |
| `NEXTAUTH_URL` | Base URL for email links (e.g., `https://masar.example.com`) |

### Optional Platform Config

These are stored in the database and can be changed from the **Admin Control Panel**. Env variables override database values.

| Variable | Default | Description |
|----------|---------|-------------|
| `PLATFORM_NAME` | `مَسَار` | Platform display name |
| `DEFAULT_MONTHLY_QUOTA` | `4` | Monthly booking limit for entrepreneurs |
| `DEFAULT_SLOT_DURATION` | `30` | Consultation slot duration in minutes |
| `UPLOAD_MAX_SIZE_MB` | `10` | Maximum file upload size in MB |
| `ALLOWED_FILE_TYPES` | `["pdf","doc","docx",...]` | Allowed file extensions (JSON array) |
| `DEFAULT_LANGUAGE` | `ar` | Default platform language |
| `JWT_EXPIRY` | `7d` | JWT token expiry duration |

### Email Service (optional — platform works without it)

Required for email verification and password reset. Without it, email links print to the server console.

| Variable | Description |
|----------|-------------|
| `RESEND_API_KEY` | API key from [resend.com](https://resend.com) (free tier available) |
| `EMAIL_FROM` | Sender email (e.g. `noreply@masar.sa`) |

You can add email service later — just set the variables and restart the server.

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
| **Entrepreneur** | Registers from landing page | Follows the 8-milestone journey, books consultations, uploads files, chats with consultants, downloads templates |
| **Consultant** | Account created by Admin | Reviews & approves milestones, provides consultations, guides entrepreneurs |
| **Admin** | Seeded during setup | Manages users, specialties, milestones, configs, quotas, templates, monitors chat |

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
- **Templates & Downloads** — admin uploads reusable templates (business plans, financial models, etc.), users browse and download them
- **Jitsi Meet video calls** — integrated video conferencing for consultation sessions
- **Dynamic platform config** — all settings manageable from admin panel (no code changes needed)
- **Legal pages from markdown** — privacy policy and terms of service read from `.md` files for easy editing
- **Dynamic stats** — entrepreneur count on landing page reflects actual database count (hidden if < 10)
- **Secure key generation** — `make gen-keys` generates cryptographically secure random keys
- **Backup & Restore** — database and file backups with `make backup` / `make restore`

---

## Project Structure

```
├── content/                    # Markdown files (legal pages — edit directly)
│   ├── privacy-policy.md       # سياسة الخصوصية
│   └── terms-of-service.md     # شروط وأحكام الاستخدام
├── prisma/
│   └── schema.prisma           # Database schema (User, Specialty, Milestone, Template, etc.)
├── scripts/
│   └── gen-keys.sh             # Secure key generator (JWT_SECRET + ENCRYPTION_KEY)
├── src/
│   ├── app/
│   │   ├── api/                # API routes
│   │   │   ├── auth/           # Login, register, verify email, forgot/reset password
│   │   │   ├── admin/          # Admin-only routes (users, specialties, milestones, configs, quotas, reports, chat, templates)
│   │   │   ├── bookings/       # Booking management + availability
│   │   │   ├── chat/           # Chat rooms & messages
│   │   │   ├── files/          # Encrypted file upload/download
│   │   │   ├── health/         # Health check endpoint
│   │   │   ├── milestones/     # Milestone progress & approval
│   │   │   ├── notifications/  # User notifications
│   │   │   ├── stats/          # Public stats (entrepreneur count for landing page)
│   │   │   └── templates/      # Public template listing + download
│   │   ├── privacy/            # Privacy policy page (reads from markdown)
│   │   ├── terms/              # Terms of service page (reads from markdown)
│   │   ├── globals.css         # Global styles
│   │   ├── layout.tsx          # Root layout (Arabic RTL + Noto Sans Arabic font)
│   │   └── page.tsx            # Main SPA entry (routes to landing/auth/dashboards)
│   ├── components/
│   │   ├── admin/              # Admin dashboard (users, specialties, milestones, configs, quotas, reports, chat monitor, templates)
│   │   ├── auth/               # Login, register, forgot/reset password, verify email
│   │   ├── consultant/         # Consultant dashboard (overview, schedule, entrepreneurs, chat, templates)
│   │   ├── entrepreneur/       # Entrepreneur dashboard (journey, bookings, chat, files, templates)
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
├── deploy.sh                   # Deployment script (build, start, seed, logs, status, backup, update, reset)
├── Dockerfile                  # Multi-stage production build
├── Makefile                    # All commands (dev, prod, docker, backup, gen-keys, cleanup)
├── .env.example                # Environment variable template (development)
└── .env.production             # Environment variable template (production)
```

---

## Makefile Commands

### Quick Start

| Command | Description |
|---------|-------------|
| `make setup` | Dev setup: install bun + deps + push schema + seed |
| `make prod-setup` | Production setup (no Docker): install bun + deps + build + push schema + seed |
| `make gen-keys` | Generate secure random JWT_SECRET + ENCRYPTION_KEY and update .env |
| `make deploy` | Deploy with Docker (Caddy + Web + Chat) — same as `bash deploy.sh` |
| `make dev` | Start Next.js dev server on port 3000 |

### Development

| Command | Description |
|---------|-------------|
| `make dev` | Start Next.js dev server on port 3000 |
| `make dev-chat` | Start Socket.IO chat service on port 3003 |
| `make dev-all` | Start both web + chat in parallel |

### Production (Direct — no Docker)

| Command | Description |
|---------|-------------|
| `make prod-setup` | First-time production setup (install bun + deps + build + seed) |
| `make build` | Build for production |
| `make start` | Start production server |

### Database

| Command | Description |
|---------|-------------|
| `make db-setup` | Push schema + seed data |
| `make db-push` | Push schema changes only |
| `make db-generate` | Regenerate Prisma client |
| `make db-reset` | Reset database (destructive) |
| `make db-reset-fresh` | Delete DB file + push schema + seed |
| `make seed` | Run seed script only (idempotent) |

### Backup & Restore

| Command | Description |
|---------|-------------|
| `make backup` | Backup dev database + uploaded files + .env to ./backups/ |
| `make restore DB=backups/file.sqlite` | Restore database from backup |
| `make restore DB=file.sqlite UPLOAD=file.tar.gz` | Restore database + uploaded files |
| `make restore DB=file.sqlite TEMPLATES=file.tar.gz` | Restore database + templates |
| `make backup-list` | List all available backups |

### Code Quality

| Command | Description |
|---------|-------------|
| `make lint` | Run ESLint |
| `make lint-fix` | Run ESLint with auto-fix |
| `make typecheck` | Run TypeScript type checking |

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
| `make deploy` | Deploy everything (Docker build + start + seed) — same as `bash deploy.sh` |
| `make prod-up` | Start production stack (Caddy + Web + Chat) |
| `make prod-down` | Stop production stack |
| `make prod-logs` | View production logs |
| `make prod-status` | Check container status |
| `make prod-reset` | Wipe production data and re-seed |
| `make prod-update` | Rebuild and redeploy (no data loss) |
| `make prod-backup` | Backup production database to ./backups/ |
| `make prod-restore DB=file.sqlite` | Restore production database |
| `make prod-seed` | Run seed in production container |

### Security

| Command | Description |
|---------|-------------|
| `make gen-keys` | Generate cryptographically secure JWT_SECRET + ENCRYPTION_KEY |

### Cleanup

| Command | Description |
|---------|-------------|
| `make clean` | Remove .next and cache |
| `make clean-all` | Remove node_modules too |
| `make fresh` | Delete data and reinstall from scratch (requires typing "yes") |
| `make nuke` | Delete EVERYTHING — local files + Docker containers/volumes/images + .env + backups (requires typing "DESTROY") |

---

## Templates & Downloads

Admins can upload reusable document templates that entrepreneurs and consultants can browse and download.

### Template Categories

| Category | Arabic | Description |
|----------|--------|-------------|
| Business Plan | خطة عمل | Business plan templates |
| Financial | مالي | Financial models and spreadsheets |
| Legal | قانوني | Legal document templates |
| Marketing | تسويقي | Marketing plan templates |
| Presentation | عرض تقديمي | Pitch deck and presentation templates |
| Other | أخرى | Any other useful documents |

### How It Works

1. **Admin** uploads templates from the admin dashboard (Templates tab)
2. Templates are stored encrypted with all other platform files
3. **Entrepreneurs & Consultants** browse and download from their dashboard
4. Each download increments a counter for tracking
5. Admin can toggle templates active/inactive, edit details, or delete

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

## AWS Production Deployment — Full Guide

This guide walks you through deploying Masar to AWS EC2 from scratch. No prior AWS setup needed.

### Step 1: Create an AWS Account

1. Go to [aws.amazon.com](https://aws.amazon.com) and create an account
2. You'll need a credit card on file (free tier eligible)
3. Choose a region close to your users (e.g., `me-south-1` Bahrain for Middle East)

### Step 2: Launch an EC2 Instance

1. Go to **AWS Console → EC2 → Launch Instance**
2. Configure:

| Setting | Value | Why |
|---------|-------|-----|
| **Name** | `masar-production` | Easy to identify |
| **AMI** | Ubuntu 22.04 LTS (or 24.04) | Required for our setup scripts |
| **Instance type** | `t3.medium` (2 vCPU, 4GB RAM) | Minimum for Docker + Next.js |
| | `t3.small` (2 vCPU, 2GB RAM) | Works but may be slow under load |
| **Storage** | 20 GB SSD (gp3) | Enough for app + database + uploads |
| **Key pair** | Create new → `masar-key` | Save the `.pem` file — this is your SSH key |

3. **Security Group** — Add these inbound rules:

| Type | Port | Source | Why |
|------|------|--------|-----|
| SSH | 22 | Your IP only | Secure server access |
| HTTP | 80 | 0.0.0.0/0 | Let's Encrypt HTTP challenge |
| HTTPS | 443 | 0.0.0.0/0 | Production website traffic |

4. Click **Launch Instance**

### Step 3: Connect via SSH

```bash
chmod 400 masar-key.pem
ssh -i masar-key.pem ubuntu@YOUR_EC2_PUBLIC_IP
```

### Step 4: Install Docker on the Server

```bash
sudo apt update && sudo apt upgrade -y
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker ubuntu
newgrp docker
```

### Step 5: Upload the Project to the Server

**Option A: Clone from Git (recommended)**

```bash
sudo apt install -y git
git clone https://github.com/YOUR_USERNAME/masar.git
cd masar
```

**Option B: Upload directly via SCP**

From your **local machine** (not the server):

```bash
scp -i masar-key.pem -r /path/to/masar ubuntu@YOUR_EC2_PUBLIC_IP:/home/ubuntu/masar
ssh -i masar-key.pem ubuntu@YOUR_EC2_PUBLIC_IP
cd masar
```

### Step 6: Configure Environment Variables

```bash
cp .env.production .env
make gen-keys
nano .env
```

**You MUST change these values:**

```env
DOMAIN=masar.yourdomain.com
ADMIN_EMAIL=admin@yourdomain.com
ADMIN_PASSWORD=YourVeryStrongPassword123!
ADMIN_NAME=مدير المنصة
NEXTAUTH_URL=https://masar.yourdomain.com
```

`make gen-keys` already generated secure `JWT_SECRET` and `ENCRYPTION_KEY` for you.

**Important for Docker deployment:** Change `DATABASE_URL` to the Docker path:

```env
# For Docker deployment:
DATABASE_URL=file:/app/db/production.db

# For direct deployment (no Docker):
DATABASE_URL=file:./db/production.db
```

**Optional: Email service** (can be added later — platform works without it):

```env
RESEND_API_KEY=re_your_key_here
EMAIL_FROM=noreply@masar.yourdomain.com
```

Without email service, verification/reset links print to the server console instead.

### Step 7: Point Your Domain to the Server

1. Go to your domain registrar (GoDaddy, Namecheap, Route 53, etc.)
2. Add a DNS **A Record**:

| Type | Name | Value |
|------|------|-------|
| A | `masar` (or `@` for root domain) | YOUR_EC2_PUBLIC_IP |

3. Wait 5-30 minutes for DNS propagation

4. Verify: `ping masar.yourdomain.com`

### Step 8: Deploy!

**Option A: With Docker (recommended)**

```bash
make deploy
```

This will:
1. Check all prerequisites
2. Build Docker images (takes 3-5 minutes)
3. Start 3 containers: Caddy (HTTPS) + Web (Next.js) + Chat (Socket.IO)
4. Wait for health checks to pass
5. Seed the database with admin account + specialties + milestones
6. Print your site URL

**Option B: Direct (no Docker)**

```bash
make prod-setup     # Install bun + deps + build + push schema + seed
make start          # Start production server
```

Visit **https://masar.yourdomain.com** — your platform is live!

### Step 9: Post-Deployment Checklist

- [ ] Site loads at `https://masar.yourdomain.com`
- [ ] Landing page shows with Arabic content
- [ ] You can login with admin credentials from `.env`
- [ ] Admin dashboard loads
- [ ] You can create a consultant from the admin panel
- [ ] You can register as entrepreneur from the landing page
- [ ] HTTPS certificate is valid (lock icon in browser)
- [ ] Terms of Service page loads at `/terms`
- [ ] Privacy Policy page loads at `/privacy`
- [ ] Templates tab visible in admin dashboard

### Day-to-Day Management

```bash
ssh -i masar-key.pem ubuntu@YOUR_EC2_PUBLIC_IP
cd masar

# Docker deployment
make prod-logs                  # View logs
make prod-status                # Check status
make prod-backup                # Backup DB + files
make prod-restore DB=backups/file.sqlite  # Restore DB
make prod-update                # Update + redeploy
make prod-down                  # Stop all services
make prod-up                    # Start all services

# Direct deployment
make backup                     # Backup database + files
make backup-list                # List available backups
make restore DB=backups/file.sqlite  # Restore from backup
```

### Updating the Platform

**Docker deployment:**

```bash
git pull origin main
make prod-update
```

**Direct deployment:**

```bash
git pull origin main
make prod-setup
make start
```

### Setting Up Automated Backups (Cron)

```bash
crontab -e

# Add daily backup at 3 AM
0 3 * * * cd /home/ubuntu/masar && make backup >> /home/ubuntu/masar/backups/cron.log 2>&1
```

### Monitoring the Server

```bash
df -h                          # Check disk space
free -m                        # Check memory usage
docker stats --no-stream       # Check Docker resource usage
make prod-status               # Check container status
curl -s http://localhost:3000/api/health | python3 -m json.tool  # Health check
```

### Scaling Considerations

| Users | Recommended Setup |
|-------|-------------------|
| 1-100 | `t3.small` + SQLite (current setup) |
| 100-500 | `t3.medium` + SQLite, consider PostgreSQL |
| 500+ | `t3.large` + PostgreSQL (RDS), separate upload storage (S3) |

To switch to PostgreSQL in production:
1. Provision an AWS RDS PostgreSQL instance
2. Update `DATABASE_URL` in `.env` to the RDS connection string
3. Add RDS security group access from your EC2 instance
4. Redeploy with `make prod-update`

### Troubleshooting

**Site not loading?**

```bash
make prod-status    # Check if containers are running
make prod-logs      # Check logs
```

**HTTPS certificate not working?**

- Make sure your domain DNS points to the EC2 IP
- Make sure port 80 is open (required for Let's Encrypt HTTP challenge)
- Make sure port 443 is open
- Check Caddy logs: `docker compose -f docker-compose.prod.yml logs caddy`

**Database errors?**

```bash
make prod-seed      # Reseed the database
make prod-reset     # Full reset (WARNING: deletes all data)
```

**Need to restore a backup?**

```bash
make backup-list
make restore DB=backups/masar_db_TIMESTAMP.sqlite
make restore DB=backups/masar_db_TIMESTAMP.sqlite UPLOAD=backups/masar_upload_TIMESTAMP.tar.gz
```

**Port already in use?**

```bash
sudo lsof -i :80
sudo lsof -i :443
make prod-down
```

### Cost Estimate (AWS)

| Resource | Monthly Cost | Notes |
|----------|-------------|-------|
| EC2 t3.small | ~$15 | 2 vCPU, 2GB RAM |
| EC2 t3.medium | ~$30 | 2 vCPU, 4GB RAM |
| EBS 20GB SSD | ~$2 | Storage |
| Data transfer | ~$0-5 | First 1GB free |
| **Total** | **~$17-37/month** | No hidden costs |

Free tier eligible: t2.micro (1GB RAM) is free for 12 months, but may not have enough memory.

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
| GET | `/api/templates` | List active templates (with category filter) |
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
| GET | `/api/templates/[id]/download` | Download a template (increments counter) |

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
| GET/POST | `/api/admin/templates` | List/create templates (with file upload) |
| PATCH/DELETE | `/api/admin/templates/[id]` | Update/delete a template |

---

## License

Proprietary — All rights reserved.
