// Seed Script
// Seeds the database with default platform data
// Admin account is read from .env (ADMIN_EMAIL, ADMIN_PASSWORD, ADMIN_NAME)
// Consultants are created by admin from the platform
// Entrepreneurs register themselves from the landing page

import { db } from './db'
import { hashPassword } from './auth'
import { getDefaultConfigs } from './config'

async function main() {
  console.log('🌱 Seeding database...')

  // 1. Seed Platform Configs
  console.log('  → Seeding platform configs...')
  const defaultConfigs = getDefaultConfigs()
  for (const config of defaultConfigs) {
    await db.platformConfig.upsert({
      where: { key: config.key },
      update: { value: config.value },
      create: config,
    })
  }
  console.log(`  ✓ ${defaultConfigs.length} platform configs seeded`)

  // 2. Seed Specialties (5 matching the requirements)
  console.log('  → Seeding specialties...')
  const specialties = [
    { nameAr: 'تطوير الأعمال', nameEn: 'Business Development', description: 'Business development and strategic growth', icon: 'briefcase', color: '#e74c3c', sortOrder: 0 },
    { nameAr: 'التخصص التقني', nameEn: 'Technical', description: 'Technical development and engineering', icon: 'code', color: '#3498db', sortOrder: 1 },
    { nameAr: 'الشؤون القانونية', nameEn: 'Legal', description: 'Legal affairs and regulatory compliance', icon: 'scale', color: '#2ecc71', sortOrder: 2 },
    { nameAr: 'التخطيط المالي', nameEn: 'Financial Planning', description: 'Financial planning and analysis', icon: 'calculator', color: '#f39c12', sortOrder: 3 },
    { nameAr: 'التسويق والاستثمار', nameEn: 'Marketing & Investment', description: 'Marketing strategy and investment readiness', icon: 'trending-up', color: '#9b59b6', sortOrder: 4 },
  ]

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const createdSpecialties: any[] = []
  for (const spec of specialties) {
    const specialty = await db.specialty.upsert({
      where: { id: spec.nameEn.toLowerCase().replace(/\s+/g, '-') + '-spec' },
      update: spec,
      create: {
        id: spec.nameEn.toLowerCase().replace(/\s+/g, '-') + '-spec',
        ...spec,
      },
    })
    createdSpecialties.push(specialty)
  }
  console.log(`  ✓ ${createdSpecialties.length} specialties seeded`)

  // 3. Seed Milestone Defaults (8 matching the requirements)
  console.log('  → Seeding milestone defaults...')
  const milestones = [
    { titleAr: 'الاستقبال والتقييم', titleEn: 'Intake & Assessment', descriptionAr: 'جلسة تعريفية مع المستشار لتقييم الفكرة وفهم الاحتياجات', descriptionEn: 'Introductory session with consultant to assess the idea and understand needs', icon: 'handshake', sortOrder: 0, specialtyId: createdSpecialties[0].id },
    { titleAr: 'نموذج العمل', titleEn: 'Business Model Canvas', descriptionAr: 'تصميم نموذج العمل والتخطيط الاستراتيجي', descriptionEn: 'Design the business model canvas and strategic planning', icon: 'layout', sortOrder: 1, specialtyId: createdSpecialties[0].id },
    { titleAr: 'النموذج الأولي', titleEn: 'MVP', descriptionAr: 'بناء النموذج الأولي للمنتج أو الخدمة', descriptionEn: 'Build the minimum viable product or service', icon: 'rocket', sortOrder: 2, specialtyId: createdSpecialties[1].id },
    { titleAr: 'غرفة البيانات', titleEn: 'Data Room', descriptionAr: 'إعداد غرفة البيانات والوثائق المطلوبة', descriptionEn: 'Prepare data room and required documents', icon: 'folder-lock', sortOrder: 3, specialtyId: createdSpecialties[2].id },
    { titleAr: 'خارطة الطريق', titleEn: 'Roadmap', descriptionAr: 'وضع خارطة الطريق وخطة التنفيذ', descriptionEn: 'Develop the roadmap and execution plan', icon: 'map', sortOrder: 4, specialtyId: createdSpecialties[0].id },
    { titleAr: 'البيانات المالية التقديرية', titleEn: 'Financials', descriptionAr: 'إعداد البيانات المالية التقديرية والتوقعات', descriptionEn: 'Prepare financial projections and forecasts', icon: 'calculator', sortOrder: 5, specialtyId: createdSpecialties[3].id },
    { titleAr: 'العرض الاستثماري', titleEn: 'Pitch Deck', descriptionAr: 'إعداد العرض الاستثماري والمواد التسويقية', descriptionEn: 'Prepare the investment pitch deck and marketing materials', icon: 'presentation', sortOrder: 6, specialtyId: createdSpecialties[4].id },
    { titleAr: 'استراتيجية الخروج', titleEn: 'Exit Strategy', descriptionAr: 'وضع استراتيجية الخروج للمستثمرين', descriptionEn: 'Develop the exit strategy for investors', icon: 'log-out', sortOrder: 7, specialtyId: createdSpecialties[3].id },
    { titleAr: 'تحديد قيمة التمويل', titleEn: 'The Ask', descriptionAr: 'تحديد قيمة التمويل المطلوب وشروط الاستثمار', descriptionEn: 'Determine the funding amount and investment terms', icon: 'dollar-sign', sortOrder: 8, specialtyId: createdSpecialties[4].id },
  ]

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const createdMilestones: any[] = []
  for (const ms of milestones) {
    const milestone = await db.milestoneDefault.upsert({
      where: { id: ms.titleEn.toLowerCase().replace(/\s+/g, '-') + '-ms' },
      update: ms,
      create: {
        id: ms.titleEn.toLowerCase().replace(/\s+/g, '-') + '-ms',
        ...ms,
      },
    })
    createdMilestones.push(milestone)
  }
  console.log(`  ✓ ${createdMilestones.length} milestones seeded`)

  // 4. Seed Admin User (reads from env vars, skips if any admin already exists)
  console.log('  → Seeding admin user...')
  const existingAdmin = await db.user.findFirst({ where: { role: 'ADMIN' } })
  
  if (existingAdmin) {
    // Admin exists — just make sure it's active, never touch anything else
    await db.user.update({
      where: { id: existingAdmin.id },
      data: { isActive: true },
    })
    console.log(`  ✓ Admin user already exists: ${existingAdmin.email} (unchanged)`)
  } else {
    // No admin — create one from .env defaults
    const adminEmail = process.env.ADMIN_EMAIL || 'admin@platform.sa'
    const adminPassword = process.env.ADMIN_PASSWORD || 'admin123'
    const adminName = process.env.ADMIN_NAME || 'Platform Admin'
    const adminPasswordHash = await hashPassword(adminPassword)
    await db.user.create({
      data: {
        email: adminEmail,
        name: adminName,
        passwordHash: adminPasswordHash,
        role: 'ADMIN',
        isActive: true,
      },
    })
    console.log(`  ✓ Admin user created: ${adminEmail}`)
  }

  console.log('\n✅ Seeding complete!')
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await db.$disconnect()
  })
