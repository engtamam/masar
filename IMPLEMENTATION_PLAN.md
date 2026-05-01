# خطة تنفيذ: Onboarding + Multi-Project + Gated Start

## نظرة عامة

تحويل تجربة رائد الأعمال من "تسجيل مباشر → داشبورد فارغ" إلى "تسجيل → استقبال تفاعلي → مشاريع متعددة → رحلة مُهيكلة لكل مشروع".

---

## المرحلة 1: تغيير قاعدة البيانات (Prisma Schema)

### 1.1 إضافة Model جديد: `Project`

```prisma
model Project {
  id               String         @id @default(cuid())
  entrepreneurId   String         // FK → EntrepreneurProfile
  name             String         // اسم المشروع/الفكرة
  description      String?        // وصف مختصر
  industry         String?        // الصناعة (قائمة منسدلة)
  stage            ProjectStage   @default(IDEA) // المرحلة الحالية
  status           ProjectStatus  @default(NOT_STARTED) // NOT_STARTED → ACTIVE بعد Onboarding
  onboardingCompleted Boolean     @default(false)
  createdAt        DateTime       @default(now())
  updatedAt        DateTime       @updatedAt

  entrepreneur     EntrepreneurProfile @relation(fields: [entrepreneurId], references: [id], onDelete: Cascade)
  
  // Relations
  milestoneProgress MilestoneProgress[]
  bookings          Booking[]
  files             UploadedFile[]

  @@map("projects")
}

enum ProjectStage {
  IDEA          // فكرة
  PROTOTYPE     // نموذج أولي
  MVP           // MVP
  OPERATING     // تشغيل
  SCALING       // توسع
}

enum ProjectStatus {
  NOT_STARTED   // ما كمل الاستقبال
  ACTIVE        // جاهز ويعمل
  PAUSED        // متوقف مؤقتاً
  COMPLETED     // خلص كل المراحل
  ARCHIVED      // مؤرشف
}
```

### 1.2 تعديل `EntrepreneurProfile`

```diff
  model EntrepreneurProfile {
    id        String  @id @default(cuid())
    userId    String  @unique
-   projectName String?
-   projectDesc String?
-   industry    String?
-   stage       String?
    createdAt DateTime @default(now())
    updatedAt DateTime @updatedAt

    user User @relation(fields: [userId], references: [id], onDelete: Cascade)

    // Relations
-   milestoneProgress MilestoneProgress[]
-   bookings          Booking[]           @relation("EntrepreneurBookings")
    quota             Quota?
-   uploadedFiles     UploadedFile[]      @relation("EntrepreneurFiles")
+   projects          Project[]

    @@map("entrepreneur_profiles")
  }
```

### 1.3 تعديل `MilestoneProgress`

```diff
  model MilestoneProgress {
    id                 String          @id @default(cuid())
-   entrepreneurId     String
+   projectId          String          // FK → Project بدل entrepreneurId
    milestoneDefaultId String
    status             MilestoneStatus @default(LOCKED)
    ...
    
-   entrepreneur     EntrepreneurProfile @relation(fields: [entrepreneurId], references: [id], onDelete: Cascade)
+   project          Project            @relation(fields: [projectId], references: [id], onDelete: Cascade)
    milestoneDefault MilestoneDefault   @relation(...)

-   @@unique([entrepreneurId, milestoneDefaultId])
+   @@unique([projectId, milestoneDefaultId])
    @@map("milestone_progress")
  }
```

### 1.4 تعديل `Booking`

```diff
  model Booking {
    id                  String        @id @default(cuid())
    consultantId        String
-   entrepreneurId      String
+   projectId           String?       // FK → Project (اختياري)
    milestoneProgressId String?
    ...

-   entrepreneur      EntrepreneurProfile @relation("EntrepreneurBookings", fields: [entrepreneurId], references: [id], onDelete: Cascade)
+   project           Project?           @relation(fields: [projectId], references: [id])
    ...
  }
```

### 1.5 تعديل `UploadedFile`

```diff
  model UploadedFile {
    id                  String  @id @default(cuid())
    milestoneProgressId String?
-   entrepreneurId      String?
+   projectId           String?  // FK → Project
    uploadedBy          String
    ...

-   entrepreneur      EntrepreneurProfile? @relation("EntrepreneurFiles", fields: [entrepreneurId], references: [id], onDelete: Cascade)
+   project           Project?            @relation(fields: [projectId], references: [id])
    ...
  }
```

### 1.6 تعديل `Quota`

```diff
  model Quota {
    id                    String  @id @default(cuid())
-   entrepreneurId        String  @unique
+   entrepreneurId        String  // بدون @unique — يمكن أن يكون لكل مشروع حصة
+   projectId             String? // اختياري: حصة خاصة بمشروع
    monthlyBookingLimit   Int     @default(4)
    bookingsUsedThisMonth Int     @default(0)
    currentMonth          String
    isExempted            Boolean @default(false)
    customLimit           Int?
    ...

-   entrepreneur EntrepreneurProfile @relation(fields: [entrepreneurId], references: [id], onDelete: Cascade)
+   entrepreneur EntrepreneurProfile @relation(fields: [entrepreneurId], references: [id], onDelete: Cascade)

-   @@map("quotas")
+   @@unique([entrepreneurId, projectId]) // حصة فريدة لكل مشروع
+   @@map("quotas")
  }
```

> **Quota** يبقى مربوط بـ entrepreneurId لأن الحصة للمستخدم، لكن يمكن تخصيصها لكل مشروع.

---

## المرحلة 2: API Changes

### 2.1 تعديل `POST /api/auth/register`

**السلوك الجديد:**
- ينشئ `User` + `EntrepreneurProfile` فقط (بدون projectName)
- **لا ينشئ** MilestoneProgress
- يرجع token + user مع `onboardingCompleted: false`

### 2.2 إضافة `POST /api/projects` — إنشاء مشروع (Onboarding)

```typescript
// Request:
{
  name: string          // اسم المشروع
  industry: string      // الصناعة
  description?: string  // وصف مختصر
  stage: ProjectStage   // المرحلة الحالية
}

// Response:
{
  success: true,
  data: {
    project: { id, name, industry, ... },
    milestonesCreated: number
  }
}
```

**المنطق:**
1. يتحقق إن المستخدم ENTREPRENEUR
2. ينشئ `Project` بـ `status: ACTIVE`
3. ينشئ كل الـ `MilestoneProgress` (الكل LOCKED)
4. يفتح أول مرحلة: `status: IN_PROGRESS`
5. يحدّث `onboardingCompleted = true` في EntrepreneurProfile

### 2.3 إضافة `GET /api/projects` — قائمة مشاريع المستخدم

```typescript
// Response:
{
  success: true,
  data: [
    {
      id, name, industry, stage, status,
      milestonesCompleted: 3,
      milestonesTotal: 8,
      progress: 37.5
    }
  ]
}
```

### 2.4 إضافة `GET /api/projects/[id]` — تفاصيل مشروع

```typescript
// Response:
{
  success: true,
  data: {
    project: { ... },
    milestones: [ ... ],
    bookings: [ ... ],
    files: [ ... ]
  }
}
```

### 2.5 تعديل `GET /api/milestones`

- يضيف `projectId` parameter (required)
- يرجع milestones الخاصة بالمشروع المحدد

### 2.6 تعديل `POST /api/bookings`

- يضيف `projectId` field
- يربط الحجز بالمشروع

### 2.7 تعديل `GET /api/bookings`

- يفلتر حسب `projectId` إذا أُرسل

### 2.8 إضافة `PATCH /api/projects/[id]` — تحديث مشروع

```typescript
// Request:
{
  name?: string
  description?: string
  industry?: string
  stage?: ProjectStage
  status?: ProjectStatus  // PAUSED, ARCHIVED
}
```

---

## المرحلة 3: Frontend Changes

### 3.1 مكون جديد: `OnboardingWizard`

```
src/components/entrepreneur/OnboardingWizard.tsx
```

**4 خطوات:**

| الخطوة | العنوان | الحقل | النوع |
|--------|---------|-------|-------|
| 1 | "شنو اسم فكرتك؟" | `name` | Input text |
| 2 | "ايش الصناعة؟" | `industry` | Select dropdown |
| 3 | "وصف مختصر" | `description` | Textarea |
| 4 | "ايش مرحلتك؟" | `stage` | Radio cards |

**التصميم:**
- شاشة كاملة (full-screen) بتصميم جميل
- Progress bar في الأعلى
- أزرار "التالي" / "السابق" / "يلا نبدأ!"
- أنيميشن انتقال بين الخطوات
- لا يمكن تخطي الخطوات (كلها required إلا description)

**بعد الإكمال:**
- ينادي `POST /api/projects`
- ينتقل للداشبورد
- المشروع الأول جاهز مع أول مرحلة مفتوحة

### 3.2 تعديل `Zustand Store`

```diff
  interface AppState {
    // ... existing
+   currentProjectId: string | null;
+   setCurrentProjectId: (id: string | null) => void;
+   onboardingCompleted: boolean;
+   setOnboardingCompleted: (completed: boolean) => void;
  }
```

### 3.3 تعديل `EntrepreneurDashboard`

**التغييرات:**

1. **Project Selector** — dropdown في الـ sidebar لاختيار المشروع النشط
2. **"مشروع جديد" زر** — يفتح الـ OnboardingWizard لمشروع إضافي
3. **كل الـ views** ترتبط بـ `currentProjectId`
4. **لو ما عنده مشاريع** → يعرض شاشة "ابدأ مشروعك الأول"

### 3.4 تعديل `src/app/page.tsx`

```diff
  // في منطق التوجيه:
  if (user.role === 'ENTREPRENEUR' && !onboardingCompleted) {
    // عرض OnboardingWizard بدل الداشبورد
    return <OnboardingWizard onComplete={handleOnboardingComplete} />
  }
```

### 3.5 إضافة View جديدة في Store

```diff
  export type AppView =
    | 'landing'
    | ...
    | 'entrepreneur-dashboard'
+   | 'entrepreneur-onboarding'
+   | 'entrepreneur-project-select'
    | ...
```

---

## المرحلة 4: Seed & Migration

### 4.1 Migration Script

```sql
-- 1. إنشاء جدول projects
-- 2. نقل البيانات من entrepreneur_profiles إلى projects
-- 3. تحديث milestone_progress لربطها بـ projectId
-- 4. تحديث bookings
-- 5. تحديث uploaded_files
-- 6. حذف الأعمدة القديمة من entrepreneur_profiles
```

### 4.2 تعديل Seed Script

- لا تغيير في seed الخاص بـ Admin/Specialties/Milestones
- إضافة صناعات افتراضية في PlatformConfig أو كـ enum

### 4.3 قائمة الصناعات (Industries)

```typescript
const INDUSTRIES = [
  { value: 'technology', labelAr: 'التقنية' },
  { value: 'healthcare', labelAr: 'الرعاية الصحية' },
  { value: 'education', labelAr: 'التعليم' },
  { value: 'fintech', labelAr: 'التقنية المالية' },
  { value: 'ecommerce', labelAr: 'التجارة الإلكترونية' },
  { value: 'food', labelAr: 'الأغذية والمطاعم' },
  { value: 'real-estate', labelAr: 'العقارات' },
  { value: 'tourism', labelAr: 'السياحة والسفر' },
  { value: 'logistics', labelAr: 'اللوجستيات والنقل' },
  { value: 'energy', labelAr: 'الطاقة' },
  { value: 'media', labelAr: 'الإعلام والترفيه' },
  { value: 'manufacturing', labelAr: 'التصنيع' },
  { value: 'agriculture', labelAr: 'الزراعة' },
  { value: 'social-impact', labelAr: 'التأثير الاجتماعي' },
  { value: 'other', labelAr: 'أخرى' },
]
```

---

## المرحلة 5: ترتيب التنفيذ (Step-by-Step)

### Step 1: Prisma Schema Changes
- [ ] إضافة `Project` model + `ProjectStage` + `ProjectStatus` enums
- [ ] تعديل `EntrepreneurProfile` (إزالة حقول المشروع)
- [ ] تعديل `MilestoneProgress` (entrepreneurId → projectId)
- [ ] تعديل `Booking` (entrepreneurId → projectId)
- [ ] تعديل `UploadedFile` (entrepreneurId → projectId)
- [ ] تعديل `Quota` (إضافة projectId)
- [ ] تشغيل `npx prisma db push`

### Step 2: API — Projects CRUD
- [ ] `POST /api/projects` — إنشاء مشروع + milestones
- [ ] `GET /api/projects` — قائمة مشاريع المستخدم
- [ ] `GET /api/projects/[id]` — تفاصيل مشروع
- [ ] `PATCH /api/projects/[id]` — تحديث مشروع

### Step 3: API — تعديل APIs الموجودة
- [ ] تعديل `POST /api/auth/register` — إزالة إنشاء milestones
- [ ] تعديل `GET /api/milestones` — إضافة projectId filter
- [ ] تعديل `POST /api/bookings` — إضافة projectId
- [ ] تعديل `GET /api/bookings` — فلتر حسب projectId
- [ ] تعديل `GET /api/files` — فلتر حسب projectId
- [ ] تعديل `POST /api/files` — ربط بـ projectId

### Step 4: Frontend — OnboardingWizard
- [ ] إنشاء `OnboardingWizard.tsx` (4 خطوات)
- [ ] إضافة `entrepreneur-onboarding` view في Store
- [ ] تعديل `page.tsx` لتوجيه المستخدم الجديد

### Step 5: Frontend — Project Selector
- [ ] إضافة `currentProjectId` في Store
- [ ] إنشاء `ProjectSelector` component
- [ ] تعديل `EntrepreneurSidebar` لإضافة Project Selector
- [ ] تعديل كل sub-views لربطها بـ currentProjectId

### Step 6: Frontend — تعديل الداشبورد
- [ ] تعديل `EntrepreneurMainView` لدعم المشاريع المتعددة
- [ ] شاشة "ابدأ مشروعك الأول" للي ما عنده مشاريع
- [ ] زر "مشروع جديد" في الـ sidebar

### Step 7: Seed & Migration
- [ ] تعديل seed script
- [ ] إنشاء migration script للبيانات الموجودة
- [ ] اختبار الترقية من النظام القديم

### Step 8: Testing
- [ ] اختبار تسجيل مستخدم جديد → onboarding → مشروع
- [ ] اختبار إنشاء مشروع ثاني
- [ ] اختبار التبديل بين المشاريع
- [ ] اختبار الحجز مع projectId
- [ ] اختبار رفع ملفات مع projectId
- [ ] اختبار migration من بيانات قديمة

---

## 📊 رسم توضيحي للعلاقات الجديدة

```
Before:
  User ─── 1:1 ─── EntrepreneurProfile ─── 1:N ─── MilestoneProgress
                                    ├── 1:N ─── Booking
                                    ├── 1:N ─── UploadedFile
                                    └── 1:1 ─── Quota

After:
  User ─── 1:1 ─── EntrepreneurProfile ─── 1:N ─── Project
                                              ├── 1:N ─── MilestoneProgress
                                              ├── 1:N ─── Booking
                                              ├── 1:N ─── UploadedFile
                                              └── (quota stays on entrepreneur level)
```

---

## ⚠️ ملاحظات مهمة

1. **الـ Chat ما يتأثر** — المحادثات مربوطة بـ User مباشرة، ما تحتاج تغيير
2. **الـ Quota يبقى على مستوى المستخدم** — الحصة الشهرية لرواد الأعمال بشكل عام
3. **الـ Consultant ما يتأثر** — المستشار يتعامل مع milestones بغض النظر عن المشروع
4. **الـ Admin يقدر يشوف كل المشاريع** — نضيف مشاريع في لوحة تحكم الأدمن
5. **Migration آمن** — البيانات القديمة تنتقل تلقائياً (مشروع واحد لكل رائد أعمال حالي)
