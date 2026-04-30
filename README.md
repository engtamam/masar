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
# Move to your key file (downloaded in Step 2)
chmod 400 masar-key.pem

# Find your EC2 public IP in AWS Console → EC2 → Instances
ssh -i masar-key.pem ubuntu@YOUR_EC2_PUBLIC_IP

# If it asks "Are you sure you want to continue connecting?" → type yes
```

You're now inside your server! 🎉

### Step 4: Install Docker on the Server

```bash
# Update system packages
sudo apt update && sudo apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com | sh

# Add your user to the docker group (so you don't need sudo every time)
sudo usermod -aG docker ubuntu

# Apply the group change
newgrp docker

# Verify Docker works
docker --version
docker compose version
```

### Step 5: Upload the Project to the Server

**Option A: Clone from Git (recommended)**

If your code is on GitHub/GitLab:

```bash
# Install git (usually pre-installed on Ubuntu)
sudo apt install -y git

# Clone your repo
git clone https://github.com/YOUR_USERNAME/masar.git
cd masar
```

**Option B: Upload directly via SCP**

From your **local machine** (not the server):

```bash
# Upload the entire project folder
scp -i masar-key.pem -r /path/to/masar ubuntu@YOUR_EC2_PUBLIC_IP:/home/ubuntu/masar

# Then SSH back in
ssh -i masar-key.pem ubuntu@YOUR_EC2_PUBLIC_IP
cd masar
```

### Step 6: Configure Environment Variables

```bash
# Copy the production template
cp .env.production .env

# Edit with your values
nano .env
```

**You MUST change these values:**

```env
# Your domain name (must point to your EC2 IP — see Step 7)
DOMAIN=masar.yourdomain.com

# Generate a strong secret: openssl rand -hex 32
JWT_SECRET=paste-the-generated-secret-here

# Generate another strong secret for encryption: openssl rand -hex 32
ENCRYPTION_KEY=paste-another-generated-secret-here

# Admin account (this is the ONLY account created automatically)
ADMIN_EMAIL=admin@yourdomain.com
ADMIN_PASSWORD=YourVeryStrongPassword123!
ADMIN_NAME=مدير المنصة

# Base URL for email links
NEXTAUTH_URL=https://masar.yourdomain.com
```

Generate secrets on the server:

```bash
# Run these and copy the output into .env
echo "JWT_SECRET=$(openssl rand -hex 32)"
echo "ENCRYPTION_KEY=$(openssl rand -hex 32)"
```

**Optional: Email service** (for email verification and password reset):

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

4. Verify it worked:

```bash
# Run from your local machine
ping masar.yourdomain.com
# Should resolve to your EC2 IP
```

**Using AWS Route 53 (optional but recommended):**

1. AWS Console → Route 53 → Hosted Zones → Create Hosted Zone
2. Enter your domain name
3. Go to your domain registrar and change nameservers to the AWS ones
4. Create an A Record pointing to your EC2 IP
5. Enable the www redirect (optional)

### Step 8: Deploy!

```bash
# Make the deploy script executable
chmod +x deploy.sh

# Deploy everything (Docker build + start + seed database)
bash deploy.sh
```

This will:
1. Check all prerequisites
2. Build Docker images (takes 3-5 minutes)
3. Start 3 containers: Caddy (HTTPS) + Web (Next.js) + Chat (Socket.IO)
4. Wait for health checks to pass
5. Seed the database with admin account + specialties + milestones
6. Print your site URL

Visit **https://masar.yourdomain.com** — your platform is live! 🚀

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

### Day-to-Day Management

```bash
# SSH into the server
ssh -i masar-key.pem ubuntu@YOUR_EC2_PUBLIC_IP
cd masar

# View live logs
bash deploy.sh --logs

# Check service status
bash deploy.sh --status

# Backup database
bash deploy.sh --backup

# Update code and redeploy (after git pull)
bash deploy.sh --update

# Wipe everything and start fresh (DANGEROUS)
bash deploy.sh --reset

# Reseed database
bash deploy.sh --seed
```

Or use Makefile commands:

```bash
make prod-logs      # View logs
make prod-status    # Check status
make prod-backup    # Backup DB
make prod-update    # Update + redeploy
make prod-reset     # Full reset
make prod-seed      # Reseed database
make prod-down      # Stop all services
make prod-up        # Start all services
```

### Updating the Platform

When you have code changes to deploy:

```bash
# SSH into the server
ssh -i masar-key.pem ubuntu@YOUR_EC2_PUBLIC_IP
cd masar

# Pull latest code (if using git)
git pull origin main

# Rebuild and restart (zero downtime)
bash deploy.sh --update
```

Or manually:

```bash
docker compose -f docker-compose.prod.yml build
docker compose -f docker-compose.prod.yml up -d --remove-orphans
docker image prune -f
```

### Setting Up Automated Backups (Cron)

```bash
# Edit crontab
crontab -e

# Add daily backup at 3 AM
0 3 * * * cd /home/ubuntu/masar && bash deploy.sh --backup >> /home/ubuntu/masar/backups/cron.log 2>&1
```

Backups are saved to `./backups/` and auto-rotated (keeps last 10).

### Monitoring the Server

```bash
# Check disk space
df -h

# Check memory usage
free -m

# Check Docker container resource usage
docker stats --no-stream

# Check if containers are running
docker compose -f docker-compose.prod.yml ps

# Check application health
curl -s http://localhost:3000/api/health | python3 -m json.tool
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
4. Redeploy with `bash deploy.sh --update`

### Troubleshooting

**Site not loading?**

```bash
# Check if containers are running
bash deploy.sh --status

# Check logs
bash deploy.sh --logs

# Check Caddy logs specifically
docker compose -f docker-compose.prod.yml logs caddy
```

**HTTPS certificate not working?**

- Make sure your domain DNS points to the EC2 IP
- Make sure port 80 is open (required for Let's Encrypt HTTP challenge)
- Make sure port 443 is open
- Check Caddy logs: `docker compose -f docker-compose.prod.yml logs caddy`

**Can't connect via SSH?**

- Verify your security group allows port 22 from your IP
- Verify you're using the correct key file: `ssh -i masar-key.pem ubuntu@IP`
- Check the key file permissions: `chmod 400 masar-key.pem`

**Database errors?**

```bash
# Reseed the database
bash deploy.sh --seed

# Full reset (WARNING: deletes all data)
bash deploy.sh --reset
```

**Port already in use?**

```bash
# Check what's using a port
sudo lsof -i :80
sudo lsof -i :443

# Stop all Docker containers
docker compose -f docker-compose.prod.yml down
```

**Need to restore a backup?**

```bash
# Stop the web service
docker compose -f docker-compose.prod.yml stop web

# Copy backup into the Docker volume
docker compose -f docker-compose.prod.yml cp ./backups/masar_db_TIMESTAMP.sqlite.gz web:/app/db/
docker compose -f docker-compose.prod.yml exec web gunzip /app/db/masar_db_TIMESTAMP.sqlite.gz
docker compose -f docker-compose.prod.yml exec web mv /app/db/masar_db_TIMESTAMP.sqlite /app/db/production.db

# Restart
docker compose -f docker-compose.prod.yml start web
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
