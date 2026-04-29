# Worklog - Digital Incubator Platform

## Task 3 - Backend API Routes & Seed Update (Agent: backend-api)

### Completed: 2025-04-29

### Summary
Updated the seed file with exact milestones and specialties from requirements, created 7 missing admin/notification API routes, verified typo fix in chat messages route, and re-ran the seed successfully.

### Changes Made

#### 1. Seed File Update (`src/lib/seed.ts`)
- **Specialties** (changed from 8 to 5 per requirements):
  - تطوير الأعمال / Business Development
  - التخصص التقني / Technical
  - الشؤون القانونية / Legal
  - التخطيط المالي / Financial Planning
  - التسويق والاستثمار / Marketing & Investment

- **Milestones** (changed to exact 8 from requirements):
  - نموذج العمل / Business Model Canvas
  - النموذج الأولي / MVP
  - غرفة البيانات / Data Room
  - خارطة الطريق / Roadmap
  - البيانات المالية التقديرية / Financials
  - العرض الاستثماري / Pitch Deck
  - استراتيجية الخروج / Exit Strategy
  - تحديد قيمة التمويل / The Ask

- Updated milestone-to-specialty mappings:
  - Business Model Canvas → Business Development
  - MVP → Technical
  - Data Room → Legal
  - Roadmap → Business Development
  - Financials → Financial Planning
  - Pitch Deck → Marketing & Investment
  - Exit Strategy → Financial Planning
  - The Ask → Marketing & Investment

- Updated sample consultant specialty assignments to match new specialties

#### 2. Admin API Routes Created

| Route | Methods | Description |
|-------|---------|-------------|
| `/api/admin/specialties` | GET, POST, PATCH, DELETE | Full CRUD for specialties (soft delete) |
| `/api/admin/milestones` | GET, POST, PATCH, DELETE | Full CRUD for milestone defaults (soft delete) |
| `/api/admin/configs` | GET, PATCH | List and update platform configs (with cache invalidation) |
| `/api/admin/quotas` | GET, PATCH | List quotas with entrepreneur info, update limits/exempt status |
| `/api/admin/reports` | GET | Dashboard stats: users by role, bookings, milestones, consultant performance |
| `/api/admin/chat` | GET | Monitor all chat rooms with messages (supports roomId param for details) |
| `/api/notifications` | GET, PATCH, DELETE | User notifications: list, mark read, clear all |

All routes use:
- `getCurrentUser` + `requireRole('ADMIN')` for admin routes
- `getCurrentUser` for user-scoped routes (notifications)
- `createSuccessResponse` / `createErrorResponse` for consistent responses
- `db` from `@/lib/db` for database access
- Proper error handling with appropriate HTTP status codes

#### 3. Typo Check
- Checked `src/app/api/chat/rooms/[id]/messages/route.ts` - the line `const [messages, total]` is already correct (typo `const essages, total]` was not found; may have been fixed by a previous agent)

#### 4. Seed Verification
- Ran `bun run src/lib/seed.ts` successfully
- 9 platform configs, 5 specialties, 8 milestones seeded
- All test accounts verified working
- Lint passes with no errors
- Dev server running normally

---

## Task 4-a - Frontend API Client & Zustand Store (Agent: frontend-core)

### Completed: 2025-04-29

### Summary
Created two foundational frontend files: a comprehensive API client (`src/lib/api.ts`) and a Zustand global state store (`src/lib/store.ts`). Both are fully typed TypeScript, align with all existing backend API routes, and support RTL Arabic UI architecture.

### Changes Made

#### 1. API Client (`src/lib/api.ts`)

A clean, typed API client that communicates with all backend routes:

- **Token Management**: `getToken()`, `setToken()`, `clearToken()`, `isAuthenticated()` — stores JWT in localStorage under `auth_token` key
- **Generic request helper**: Auto-attaches `Bearer` token to all requests, parses `{ success, data, error }` responses, handles 401 by clearing token and dispatching a `auth:unauthorized` custom event
- **File upload helper**: Separate `uploadRequest()` using FormData (lets browser set multipart boundary)
- **Query builder**: `buildQuery()` utility for constructing URL search params from optional params

API method groups (all matching actual backend routes):

| Group | Methods | Backend Routes Covered |
|-------|---------|----------------------|
| `authApi` | `login`, `register`, `me` | `/api/auth/login`, `/api/auth/register`, `/api/auth/me` |
| `milestonesApi` | `getMyMilestones`, `submitMilestone`, `approveMilestone` | `/api/milestones`, `/api/milestones/[id]/submit`, `/api/milestones/[id]/approve` |
| `bookingsApi` | `getBookings`, `createBooking`, `updateBooking`, `getAvailability`, `setAvailability`, `cloneAvailability` | `/api/bookings`, `/api/bookings/[id]`, `/api/bookings/availability`, `/api/bookings/availability/clone` |
| `chatApi` | `getRooms`, `createRoom`, `getMessages`, `sendMessage` | `/api/chat/rooms`, `/api/chat/rooms/[id]/messages` |
| `filesApi` | `uploadFile`, `getFiles`, `deleteFile`, `getFileUrl` | `/api/files`, `/api/files/[id]` |
| `adminApi` | `getUsers`, `createUser`, `updateUser`, `getSpecialties`, `createSpecialty`, `updateSpecialty`, `deleteSpecialty`, `getMilestoneDefaults`, `createMilestoneDefault`, `updateMilestoneDefault`, `deleteMilestoneDefault`, `getConfigs`, `updateConfig`, `getQuotas`, `updateQuota`, `getReports`, `getChatRooms` | All `/api/admin/*` routes |
| `notificationsApi` | `getNotifications`, `markAsRead`, `markAllAsRead`, `clearAll` | `/api/notifications` |

#### 2. Zustand Store (`src/lib/store.ts`)

Global application state using Zustand:

- **Auth state**: `user`, `token` with `setUser()`, `setToken()`, `logout()`
- **Client hydration**: `hydrate()` reads `auth_token`, `auth_user`, `app_view` from localStorage and restores session on page refresh
- **Navigation**: `currentView` (typed as `AppView` union of 18 view names) with `setCurrentView()`, persisted to localStorage
- **Chat**: `activeChatRoomId` for tracking which room is open
- **Loading**: `isLoading` global loading flag
- **Helper**: `getDefaultView(role)` derives the correct dashboard view per role after login
- **View types**: Full `AppView` type covering login/register + 5 entrepreneur views + 4 consultant views + 8 admin views

#### 3. Verification
- Lint passes with no new errors (only pre-existing font warning in layout.tsx)
- Dev server compiles and runs normally
- No circular dependencies — store and API are independent modules

---

## Task 4-b - Authentication Components (Agent: auth-ui)

### Completed: 2025-04-29

### Summary
Created the `LoginPage` and `RegisterPage` components in a single file (`src/components/auth/AuthPages.tsx`) with full Arabic RTL layout, emerald/teal gradient theme, and integration with the existing Zustand store and API client.

### Changes Made

#### 1. AuthPages.tsx (`src/components/auth/AuthPages.tsx`)

**Exports:**
- `LoginPage` — email + password form with login action
- `RegisterPage` — name, email, password, confirm password, project name form with register action

**Shared components:**
- `AuthShell` — full-viewport gradient background (emerald/teal) with decorative radial circles and centered card slot
- `AuthLogo` — rocket icon badge (lucide-react `Rocket`), platform name "الحاضنة الرقمية", and tagline "من رحلة الفكرة إلى جاهزية الاستثمار"

**LoginPage features:**
- Email input with `Mail` icon (LTR direction for email)
- Password input with `Lock` icon and show/hide toggle (`Eye`/`EyeOff`)
- "تسجيل الدخول" submit button with loading spinner (`Loader2`)
- Link "ليس لديك حساب؟ سجل الآن" → switches to register view
- Client-side validation (empty checks) with Arabic toast messages
- On success: `setToken()`, `setUser()`, `setCurrentView(getDefaultView(role))`

**RegisterPage features:**
- Name, email, password, confirm password, project name (optional) inputs
- Each input has an appropriate icon (`User`, `Mail`, `Lock`, `Briefcase`)
- Both password fields have show/hide toggles
- "إنشاء حساب" submit button with loading spinner
- Link "لديك حساب بالفعل؟ سجل دخولك" → switches to login view
- Client-side validation: required fields, min 6 chars password, password match
- On success: same auth flow as login

**Design details:**
- Emerald/teal gradient background (135deg: #047857 → #0d9488 → #115e59)
- White/95% transparent card with backdrop blur and shadow-2xl
- Rocket icon in a frosted-glass badge (white/15 + backdrop-blur)
- Emerald-600 buttons with hover:emerald-700
- Mobile responsive (p-4 on mobile, p-6 on sm+)
- All UI text in Arabic, all code/comments in English

**Dependencies used:**
- `useAppStore`, `getDefaultView` from `@/lib/store`
- `authApi` from `@/lib/api`
- `Button`, `Input`, `Label`, `Card*` from `@/components/ui/`
- `toast` from `sonner`
- Icons: `Rocket`, `Mail`, `Lock`, `User`, `Briefcase`, `Eye`, `EyeOff`, `Loader2` from `lucide-react`

#### 2. Verification
- Lint passes with no new errors (only pre-existing font warning in layout.tsx)
- Dev server compiles and runs normally
- Component file created at the exact requested path

---

## Task 4-c - Entrepreneur Dashboard Components (Agent: entrepreneur-ui)

### Completed: 2025-04-29

### Summary
Created the complete Entrepreneur Dashboard component suite in a single file (`src/components/entrepreneur/EntrepreneurDashboard.tsx`) with 7 exported components: sidebar, main view router, overview dashboard, milestone journey view, bookings list, chat interface, and file management. All UI text is in Arabic, code/comments in English, with RTL layout and emerald/teal color scheme.

### Changes Made

#### 1. EntrepreneurDashboard.tsx (`src/components/entrepreneur/EntrepreneurDashboard.tsx`)

**Exports:**
- `EntrepreneurSidebar` — Navigation sidebar with logo, 5 nav items (Arabic labels + lucide icons), user info with role "رائد أعمال", and logout button
- `EntrepreneurMainView` — Routes to the correct sub-view based on `currentView` from Zustand store
- `EntrepreneurOverview` — Dashboard overview with welcome message, 4 stat cards (current stage, completion %, remaining sessions, notifications), upcoming bookings preview, and milestone progress preview
- `JourneyView` — The core 8-milestone gated journey with vertical stepper/timeline, status badges, expand/collapse, notes textarea, drag-and-drop file upload, submit-for-review functionality, and approval history
- `EntrepreneurBookings` — Bookings list with consultant info, date/time, status badges (Arabic), cancel button with confirmation dialog, and Jitsi Meet link button
- `EntrepreneurChat` — Split-pane chat interface with rooms list (right/RTL) and messages area (left/RTL), message input, auto-scroll, unread indicators, and polling for new messages
- `EntrepreneurFiles` — File management with list view, milestone filter dropdown, upload button, download, and delete functionality

**Type definitions:**
- Full TypeScript interfaces for API response data: `MilestoneProgressItem`, `BookingItem`, `ChatRoomItem`, `ChatMessageItem`, `UploadedFileInfo`, `NotificationItem`, and nested types
- Status mapping constants for milestone (مقفل/قيد التنفيذ/مقدم/معتمد) and booking (مؤكد/مكتمل/ملغى/لم يحضر) statuses

**Component details:**

**EntrepreneurSidebar:**
- Emerald-800/900 gradient background
- Rocket icon + "الحاضنة الرقمية" branding
- 5 navigation buttons with active state highlighting (white/15 bg + shadow)
- Avatar with initials, name, role badge, and logout button at bottom

**EntrepreneurOverview:**
- Personalized welcome message with user name
- 4 gradient stat cards: emerald (current stage), blue (completion % with Progress bar), amber (remaining sessions), purple (notifications)
- Upcoming bookings preview (next 3 confirmed) with consultant avatars
- Milestone progress summary (first 5 milestones with status icons)

**JourneyView (MOST IMPORTANT):**
- Vertical timeline with connection lines (emerald for APPROVED, gray otherwise)
- Step circles with animated pulse for IN_PROGRESS, checkmark for APPROVED, clock for SUBMITTED, lock for LOCKED
- Expand/collapse with chevron icons
- Expanded IN_PROGRESS milestone shows: description, notes textarea, drag-and-drop file upload area, uploaded files list, submit button
- Expanded SUBMITTED milestone shows: notes, files, approval history with status badges
- File upload via `filesApi.uploadFile()` with loading state
- Milestone submission via `milestonesApi.submitMilestone()` with Arabic toast notifications
- Auto-expands current active milestone on load

**EntrepreneurBookings:**
- Card-based booking list with consultant avatar, name, specialty
- Date formatting with Arabic locale
- Status badges using variant mapping
- Cancel button opens confirmation Dialog with destructive action
- Jitsi Meet link opens in new tab

**EntrepreneurChat:**
- Two-pane layout: 72-width rooms panel + flex-1 messages area
- Room selection with unread count badges (red circle)
- Messages styled differently for own (emerald bg, left-aligned in RTL) vs other (gray bg, right-aligned)
- Polling for new rooms (10s) and messages (5s)
- Auto-scroll to bottom on new messages
- Enter key to send messages

**EntrepreneurFiles:**
- Milestone filter dropdown (native select)
- Upload button triggers file picker
- File cards with icon, name, size, date, milestone association
- Download opens file URL with token auth
- Delete with loading state per file

**Design patterns:**
- All components use `'use client'` directive
- Consistent emerald-600/700 button colors throughout
- Loading states with Skeleton components
- Error handling with `toast` from sonner (Arabic messages)
- API integration via `milestonesApi`, `bookingsApi`, `chatApi`, `filesApi`, `notificationsApi`
- State management via `useAppStore` (currentView, user, activeChatRoomId)
- Helper functions: `formatDate`, `formatDateShort`, `formatTime`, `formatFileSize`, `getInitials`
- Responsive design with mobile-first approach (flex-col → sm:flex-row)

**Dependencies used:**
- `useAppStore` from `@/lib/store`
- `milestonesApi`, `bookingsApi`, `chatApi`, `filesApi`, `notificationsApi` from `@/lib/api`
- `Button`, `Card`, `Badge`, `Progress`, `Input`, `Textarea`, `ScrollArea`, `Avatar`, `Separator`, `Skeleton`, `Dialog` from `@/components/ui/`
- `toast` from `sonner`
- Icons: `LayoutDashboard`, `Map`, `Calendar`, `MessageCircle`, `FolderOpen`, `LogOut`, `Rocket`, `Lock`, `CheckCircle2`, `Clock`, `Upload`, `FileText`, `Download`, `Trash2`, `Send`, `Video`, `X`, `Loader2`, `ChevronDown`, `ChevronUp`, `Bell`, `File`, `Plus`, `Paperclip`, `ExternalLink` from `lucide-react`

#### 2. Verification
- Lint passes with no new errors (only pre-existing font warning in layout.tsx)
- Dev server compiles and runs normally
- Component file created at the exact requested path

---

## Task 4-d - Consultant Dashboard Components (Agent: consultant-ui)

### Completed: 2025-04-29

### Summary
Created the complete Consultant Dashboard component suite in a single file (`src/components/consultant/ConsultantDashboard.tsx`) with 6 exported components: sidebar, main view router, overview dashboard, schedule management, entrepreneur management, and chat interface. All UI text is in Arabic, code/comments in English, with RTL layout and emerald/teal color scheme.

### Changes Made

#### 1. ConsultantDashboard.tsx (`src/components/consultant/ConsultantDashboard.tsx`)

**Exports:**
- `ConsultantSidebar` — Navigation sidebar with logo, 4 nav items (لوحة التحكم, المواعيد والجدولة, رواد الأعمال, المحادثات), user info with name, specialty name in Arabic, role "مستشار" badge, and logout button
- `ConsultantMainView` — Routes to the correct sub-view based on `currentView` from Zustand store
- `ConsultantOverview` — Dashboard overview with welcome message, 4 stat cards, and pending approvals list with quick approve/reject buttons
- `ConsultantSchedule` — Schedule management with two tabs: availability management and bookings
- `ConsultantEntrepreneurs` — Entrepreneur management with expandable milestone details and approve/reject functionality
- `ConsultantChat` — Split-pane chat interface from consultant perspective

**Type definitions:**
- Full TypeScript interfaces for API response data: `MilestoneProgressItem`, `BookingItem`, `AvailabilitySlot`, `ChatRoomItem`, `ChatMessageItem`, `UploadedFileInfo`, `EntrepreneurProfile`, and nested types
- Status mapping constants for milestone (مقفل/قيد التنفيذ/مقدم/معتمد) and booking (مؤكد/مكتمل/ملغى/لم يحضر) statuses
- Arabic day names constant: الأحد، الاثنين، الثلاثاء، الأربعاء، الخميس، الجمعة، السبت

**Component details:**

**ConsultantSidebar:**
- Emerald-800/900 gradient background with compact modern design
- Rocket icon + "الحاضنة الرقمية" branding with "منصة المستشارين" subtitle
- 4 navigation buttons with active state highlighting (white/15 bg + shadow)
- Avatar with initials, name, specialty name from consultantProfile, "مستشار" role badge, and logout button at bottom

**ConsultantOverview:**
- Personalized welcome message with consultant name
- 4 gradient stat cards:
  - طلبات بانتظار المراجعة (Pending Reviews) — count of SUBMITTED milestones, amber color
  - إجمالي الرواد (Total Entrepreneurs) — unique entrepreneur count, emerald color
  - الجلسات هذا الشهر (Sessions This Month) — count of CONFIRMED/COMPLETED bookings this month, teal color
  - معدل الاعتماد (Approval Rate) — percentage of approved vs reviewed, purple color
- Pending approvals list with quick approve/reject buttons per milestone
- Sorted by submission date (newest first)

**ConsultantSchedule:**
- Two tabs using shadcn/ui Tabs component:
- **Availability Management Tab:**
  - Weekly schedule grid (Sunday-Saturday) showing available time slots per day
  - Each day as a Card with Arabic day name header and slot details (time range + duration)
  - "إضافة فترة" (Add Slot) button opens Dialog with: day of week select (Arabic day names), start/end time inputs, slot duration select (15/30/45/60 minutes)
  - Delete button per slot
  - "تكرار جدول الشهر السابق" (Clone Previous Month) button calls cloneAvailability API
- **Bookings Tab:**
  - List of upcoming confirmed bookings with entrepreneur name, date, time, milestone name
  - "إتمام" (Complete) and "لم يحضر" (No-show) buttons for each booking
  - Jitsi Meet link button opens in new tab
  - Status badges in Arabic (مؤكد/مكتمل/ملغى/لم يحضر)

**ConsultantEntrepreneurs:**
- List of entrepreneurs grouped by ID from milestone progress data
- For each entrepreneur: name, email, project name, current milestone and status, all milestones mini-progress
- If SUBMITTED: expandable section with entrepreneur notes, uploaded files with download buttons, "اعتماد المرحلة" (Approve) green button, "رفض" (Reject) red button with comment dialog
- If IN_PROGRESS: shows "بانتظار التقديم" (Awaiting Submission) in blue
- If APPROVED: shows checkmark with date approved in emerald
- If LOCKED: shows "لم تبدأ بعد" (Not started) in gray

**ConsultantChat:**
- Same structure as entrepreneur chat but from consultant perspective
- Two-pane layout: 72-width rooms panel (right/RTL) + flex-1 messages area (left/RTL)
- Other member role shows "رائد أعمال" for ENTREPRENEUR, "مدير" for ADMIN
- Polling for new rooms (10s) and messages (5s), auto-scroll, Enter to send

**Design patterns:**
- All components use `'use client'` directive
- Consistent emerald-600/700 button colors throughout
- Loading states with Skeleton components
- Error handling with `toast` from sonner (Arabic messages)
- API integration via `milestonesApi`, `bookingsApi`, `chatApi`, `filesApi`
- State management via `useAppStore` (currentView, user, activeChatRoomId)
- Responsive design with mobile-first approach

**Dependencies used:**
- `useAppStore` from `@/lib/store`
- `milestonesApi`, `bookingsApi`, `chatApi`, `filesApi` from `@/lib/api`
- `Button`, `Card`, `Badge`, `Input`, `Textarea`, `ScrollArea`, `Avatar`, `Separator`, `Skeleton`, `Dialog`, `Tabs`, `Select`, `Label` from `@/components/ui/`
- `toast` from `sonner`
- Icons: `LayoutDashboard`, `Calendar`, `Users`, `MessageCircle`, `LogOut`, `Rocket`, `CheckCircle2`, `Clock`, `FileText`, `Download`, `Send`, `Video`, `X`, `Loader2`, `ChevronDown`, `ChevronUp`, `Plus`, `ExternalLink`, `Trash2`, `ClipboardCheck`, `Hourglass`, `UserCheck`, `Percent` from `lucide-react`

#### 2. Verification
- Lint passes with no new errors (only pre-existing font warning in layout.tsx)
- Dev server compiles and runs normally
- Component file created at the exact requested path

---

## Task 5 - WebSocket Chat Mini-Service (Agent: chat-service)

### Completed: 2025-04-29

### Summary
Created a Socket.IO WebSocket chat mini-service at `mini-services/chat-service/` that enables real-time chat between entrepreneurs and consultants. Runs on port 3003 with JWT authentication, room management, real-time messaging with persistence, typing indicators, read receipts, and presence tracking.

### Changes Made

#### 1. package.json (`mini-services/chat-service/package.json`)
- Dev script: `bun --hot index.ts`
- Dependencies: `socket.io@^4.8.3`

#### 2. index.ts (`mini-services/chat-service/index.ts`)
Complete Socket.IO server with:

| Feature | Events | Description |
|---------|--------|-------------|
| Authentication | `auth-result` | Validates JWT via `/api/auth/me`; unauthenticated users can connect but can't persist messages |
| Room Management | `join-room`, `leave-room` | Socket.IO rooms with userId→socketId and socketId→rooms tracking |
| Real-time Messaging | `send-message` → `new-message` | Broadcasts to room (except sender), persists via HTTP POST to Next.js API |
| Typing Indicators | `typing-start/stop` → `user-typing/stopped-typing` | Broadcasts typing status to room |
| Read Receipts | `mark-read` → `messages-read` | Broadcasts read status to room |
| Presence | `user-online` → `presence-update` | Online/offline tracking with full onlineUsers array |
| Disconnect | `disconnect` | Cleans up rooms, user mappings, broadcasts offline presence |

- Port: 3003, Path: `/`, CORS: all origins
- Message persistence: HTTP POST to `http://localhost:3000/api/chat/rooms/{roomId}/messages` with Bearer token
- Multi-device support: `Map<userId, Set<socketId>>` for tracking multiple connections
- Graceful shutdown on SIGTERM/SIGINT

#### 3. Service Running
- Dependencies installed via `bun install`
- Service running on port 3003 with PPID 1 (properly daemonized)
- Socket.IO polling endpoint verified working
- Lint passes (only pre-existing font warning)

---

### Completed: 2025-04-29

### Summary
Created the complete Admin Dashboard component suite in a single file (`src/components/admin/AdminDashboard.tsx`) with 10 exported components: sidebar, main view router, overview dashboard, user management, specialty management, milestone defaults management, platform configuration, quota management, reports and analytics, and chat monitoring. All UI text is in Arabic, code/comments in English, with RTL layout and emerald/teal color scheme.

### Changes Made

#### 1. AdminDashboard.tsx (`src/components/admin/AdminDashboard.tsx`)

**Exports:**
- `AdminSidebar` — Navigation sidebar with logo, 8 nav items (Arabic labels + lucide icons), user info with role "مدير النظام", and logout button
- `AdminMainView` — Routes to the correct sub-view based on `currentView` from Zustand store
- `AdminOverview` — Dashboard overview with 6 stat cards and recent activity section
- `AdminUsers` — User management with search, role filter tabs, table, add/edit dialogs, toggle active/inactive, pagination
- `AdminSpecialties` — Specialty management with card layout, add/edit dialog with color picker, soft delete/restore
- `AdminMilestones` — Milestone defaults management with reorder (up/down buttons), add/edit dialog, soft delete
- `AdminConfigs` — Platform configuration with inline editing per config, type-aware inputs (STRING/NUMBER/BOOLEAN/JSON)
- `AdminQuotas` — Quota management with table, edit dialog, quick exempt toggle, pagination
- `AdminReports` — Reports and analytics with consultant performance table, milestone stats, booking stats with progress bars
- `AdminChatMonitor` — Chat monitoring with expandable rooms, read-only message viewer with sender info

**Type definitions:**
- Full TypeScript interfaces: `Specialty`, `UserItem`, `UsersResponse`, `MilestoneDefaultItem`, `ConfigItem`, `QuotaItem`, `QuotasResponse`, `ConsultantPerformance`, `ReportsData`, `ChatRoomItem`, `ChatMessageItem`, and nested types
- Status mapping constants: `ROLE_MAP` (مدير/مستشار/رائد أعمال), `BOOKING_STATUS_MAP` (مؤكد/مكتمل/ملغى/لم يحضر)

**Component details:**

**AdminSidebar:**
- Emerald-800/900 gradient background
- Rocket icon + "الحاضنة الرقمية" branding with "لوحة الإدارة" subtitle
- 8 navigation buttons: نظرة عامة (LayoutDashboard), إدارة المستخدمين (Users), التخصصات (Award), المراحل (Flag), الإعدادات (Settings), الحصص (Gauge), التقارير (BarChart3), مراقبة المحادثات (MessageSquare)
- Avatar with initials, name, "مدير النظام" role badge, and logout button at bottom

**AdminOverview:**
- Personalized welcome message
- 6 gradient stat cards using data from `adminApi.getReports()`:
  - إجمالي رواد الأعمال — emerald
  - إجمالي المستشارين — teal
  - الجلسات المؤكدة — blue
  - المراحل المعتمدة — amber
  - المراحل قيد التنفيذ — purple
  - معدل الإنجاز % — rose
- Recent activity section showing last 8 bookings with status badges

**AdminUsers:**
- Search input for filtering by name/email
- Role filter tabs: الكل, رواد أعمال, مستشارون
- Table with columns: الاسم, البريد, الدور, الحالة, تاريخ التسجيل, إجراءات
- Toggle active/inactive button with icon
- Edit button opens dialog with name, specialty select, bio textarea
- "إضافة مستخدم" button opens dialog with: name, email, password, role select, specialty select (if consultant), bio
- Pagination controls

**AdminSpecialties:**
- Card grid with: Arabic name, English name, description, color indicator stripe, status badge, consultant/milestone counts
- "إضافة تخصص" button
- Edit/Delete actions on each card
- Add/Edit dialog: nameAr, nameEn, description, icon, color (native color picker + text input)
- Soft delete (deactivate) and restore functionality

**AdminMilestones:**
- List sorted by sortOrder with: step number, Arabic title, English title, assigned specialty, assigned consultant, status
- Up/down reorder buttons
- "إضافة مرحلة" button
- Edit dialog: titleAr, titleEn, descriptionAr, descriptionEn, sortOrder, specialtyId select, consultantId select
- Soft delete

**AdminConfigs:**
- List of all configs with: key (monospace code), type badge, description, current value display
- Inline editing per config value with type-aware input:
  - STRING → text Input
  - NUMBER → number Input
  - BOOLEAN → Switch component with مفعّل/معطّل label
  - JSON → Textarea with monospace font
- Save/Cancel buttons per config
- Read-only display for non-editing state

**AdminQuotas:**
- Table with columns: entrepreneur name, monthly limit, used this month, remaining, exempt status, custom limit
- Edit quota dialog: monthlyBookingLimit, isExempted Switch, customLimit number input
- Quick "إعفاء" (Exempt) toggle button per row
- Remaining shows "∞" for exempted users, red badge for 0 remaining
- Search input and pagination

**AdminReports:**
- Summary cards: total users (with role breakdown), total bookings, total chat rooms/messages
- Booking stats: completed vs cancelled vs no-show with progress bars
- Milestone stats: approved vs in progress vs submitted vs locked with progress bars
- Consultant performance table: name, specialty, sessions count, approved milestones count, rating

**AdminChatMonitor:**
- List of all chat rooms with: room name, type badge (مباشر/مجموعة), member names, message count, last message date
- Click to expand and see messages (read-only)
- Messages shown with: sender avatar + name, role badge (مدير/مستشار/رائد أعمال), timestamp, content
- Loading state for message fetching
- ScrollArea for long message lists

**Design patterns:**
- All components use `'use client'` directive
- Consistent emerald-600/700 button colors throughout
- Loading states with Skeleton components
- Error handling with `toast` from sonner (Arabic messages)
- API integration via `adminApi` from `@/lib/api`
- State management via `useAppStore` (currentView, user)
- Helper functions: `formatDate`, `formatDateShort`, `getInitials`
- Responsive design with mobile-first approach
- RTL layout with `dir="rtl"` on Dialogs
- Tables with horizontal scroll on mobile

**Dependencies used:**
- `useAppStore` from `@/lib/store`
- `adminApi` from `@/lib/api`
- `Button`, `Card`, `Badge`, `Progress`, `Input`, `Textarea`, `Label`, `ScrollArea`, `Avatar`, `Separator`, `Skeleton`, `Switch`, `Table`, `Dialog`, `Select`, `Tabs` from `@/components/ui/`
- `toast` from `sonner`
- Icons: `LayoutDashboard`, `Users`, `Award`, `Flag`, `Settings`, `Gauge`, `BarChart3`, `MessageSquare`, `LogOut`, `Rocket`, `Loader2`, `Plus`, `Search`, `Pencil`, `Trash2`, `ChevronUp`, `ChevronDown`, `CheckCircle2`, `XCircle`, `Eye`, `ShieldCheck`, `UserPlus`, `Palette`, `ToggleLeft`, `Save`, `RefreshCw` from `lucide-react`

#### 2. Verification
- Lint passes with no new errors (only pre-existing font warning in layout.tsx)
- Dev server compiles and runs normally
- Component file created at the exact requested path

---

## Task 6 - Docker & Makefile Configuration (Agent: docker-config)

### Completed: 2025-04-29

### Summary
Created production-ready Docker and Makefile configuration for the Digital Incubator Platform. Includes a multi-stage Dockerfile, docker-compose.yml for orchestration, a chat-service Dockerfile, a comprehensive Makefile with all development/deployment commands, .dockerignore for optimized builds, and .env.example for environment variable documentation.

### Changes Made

#### 1. Dockerfile (`/home/z/my-project/Dockerfile`)
Multi-stage production build with 3 stages:
- **Stage 1 (deps)**: Installs dependencies from `package.json`/`bun.lock`, copies Prisma schema, generates Prisma client
- **Stage 2 (builder)**: Copies node_modules from deps stage, generates Prisma client again, runs production build
- **Stage 3 (runner)**: Minimal production image with non-root user (nextjs:nodejs, uid/gid 1001), copies standalone output, static assets, prisma, db, mini-services, and upload directories. Sets proper permissions, exposes port 3000, runs `bun server.js`

#### 2. docker-compose.yml (`/home/z/my-project/docker-compose.yml`)
Two-service orchestration:
- **web**: Main Next.js app on port 3000, with DATABASE_URL, JWT_SECRET, NODE_ENV env vars. Named volumes for db-data and upload-data. Healthcheck via `curl -f http://localhost:3000/api` with 30s interval, 40s start period
- **chat**: Socket.IO chat service on port 3003, built from `mini-services/chat-service/Dockerfile`. Depends on web service health check. JWT_SECRET and API_BASE environment variables
- Named volumes: `db-data`, `upload-data` for persistent storage

#### 3. Chat Service Dockerfile (`/home/z/my-project/mini-services/chat-service/Dockerfile`)
Single-stage build: oven/bun:1 base, installs dependencies from package.json, copies index.ts, exposes port 3003, runs `bun index.ts`

#### 4. Makefile (`/home/z/my-project/Makefile`)
Comprehensive command targets:
- **Development**: `dev`, `dev-chat`, `dev-all` (parallel web + chat)
- **Database**: `db-push`, `db-generate`, `db-reset`, `seed`, `db-setup` (push + seed)
- **Build**: `build`, `start`
- **Code quality**: `lint`, `lint-fix`
- **Docker**: `docker-build`, `docker-up`, `docker-down`, `docker-logs`, `docker-restart`
- **Cleanup**: `clean` (artifacts/cache), `clean-all` (full including node_modules and db)
- **Help**: `help` target with auto-formatted target list

#### 5. .dockerignore (`/home/z/my-project/.dockerignore`)
Excludes: `node_modules`, `.next`, `.git`, `db/*.db`, `upload/*`, `*.log`, `.env.local`, `.env*.local`

#### 6. .env.example (`/home/z/my-project/.env.example`)
Documents all environment variables:
- `DATABASE_URL` — SQLite database path
- `JWT_SECRET` — Authentication secret (with production warning)
- Commented platform config overrides: PLATFORM_NAME, DEFAULT_MONTHLY_QUOTA, DEFAULT_SLOT_DURATION, JITSI_DOMAIN, ENCRYPTION_KEY, UPLOAD_MAX_SIZE_MB, ALLOWED_FILE_TYPES, DEFAULT_LANGUAGE, JWT_EXPIRY

#### 7. next.config.ts Verification
Confirmed `output: "standalone"` already present — required for Docker standalone deployment. No changes needed.

### Verification
- All 6 files created successfully at their specified paths
- Lint passes with no new errors (only pre-existing font warning in layout.tsx)
- `next.config.ts` already contains `output: "standalone"` — no update needed
- Makefile `help` target format verified
