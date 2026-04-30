// Seed Script
// Seeds the database with platform defaults and a single admin user
// Admin credentials are read from environment variables so you can customize them
// Entrepreneurs register themselves via the UI, consultants are created by admin

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

  const createdSpecialties = []
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
    { titleAr: 'نموذج العمل', titleEn: 'Business Model Canvas', descriptionAr: 'تصميم نموذج العمل والتخطيط الاستراتيجي', descriptionEn: 'Design the business model canvas and strategic planning', icon: 'layout', sortOrder: 0, specialtyId: createdSpecialties[0].id },
    { titleAr: 'النموذج الأولي', titleEn: 'MVP', descriptionAr: 'بناء النموذج الأولي للمنتج أو الخدمة', descriptionEn: 'Build the minimum viable product or service', icon: 'rocket', sortOrder: 1, specialtyId: createdSpecialties[1].id },
    { titleAr: 'غرفة البيانات', titleEn: 'Data Room', descriptionAr: 'إعداد غرفة البيانات والوثائق المطلوبة', descriptionEn: 'Prepare data room and required documents', icon: 'folder-lock', sortOrder: 2, specialtyId: createdSpecialties[2].id },
    { titleAr: 'خارطة الطريق', titleEn: 'Roadmap', descriptionAr: 'وضع خارطة الطريق وخطة التنفيذ', descriptionEn: 'Develop the roadmap and execution plan', icon: 'map', sortOrder: 3, specialtyId: createdSpecialties[0].id },
    { titleAr: 'البيانات المالية التقديرية', titleEn: 'Financials', descriptionAr: 'إعداد البيانات المالية التقديرية والتوقعات', descriptionEn: 'Prepare financial projections and forecasts', icon: 'calculator', sortOrder: 4, specialtyId: createdSpecialties[3].id },
    { titleAr: 'العرض الاستثماري', titleEn: 'Pitch Deck', descriptionAr: 'إعداد العرض الاستثماري والمواد التسويقية', descriptionEn: 'Prepare the investment pitch deck and marketing materials', icon: 'presentation', sortOrder: 5, specialtyId: createdSpecialties[4].id },
    { titleAr: 'استراتيجية الخروج', titleEn: 'Exit Strategy', descriptionAr: 'وضع استراتيجية الخروج للمستثمرين', descriptionEn: 'Develop the exit strategy for investors', icon: 'log-out', sortOrder: 6, specialtyId: createdSpecialties[3].id },
    { titleAr: 'تحديد قيمة التمويل', titleEn: 'The Ask', descriptionAr: 'تحديد قيمة التمويل المطلوب وشروط الاستثمار', descriptionEn: 'Determine the funding amount and investment terms', icon: 'dollar-sign', sortOrder: 7, specialtyId: createdSpecialties[4].id },
  ]

  const createdMilestones = []
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

  // 4. Seed Admin User (credentials from environment variables)
  console.log('  → Seeding admin user...')
  const adminEmail = process.env.ADMIN_EMAIL || 'admin@masar.sa'
  const adminPassword = process.env.ADMIN_PASSWORD || 'admin123'
  const adminName = process.env.ADMIN_NAME || 'مدير المنصة'

  const adminPasswordHash = await hashPassword(adminPassword)
  const admin = await db.user.upsert({
    where: { email: adminEmail },
    update: {
      // Update password and name on re-seed so changes in .env take effect
      passwordHash: adminPasswordHash,
      name: adminName,
    },
    create: {
      email: adminEmail,
      name: adminName,
      passwordHash: adminPasswordHash,
      role: 'ADMIN',
      isActive: true,
      emailVerified: true,
    },
  })
  console.log(`  ✓ Admin user: ${adminEmail} / ${adminPassword}`)

  console.log('\n✅ Seeding complete!')
  console.log('\n📋 Platform is ready!')
  console.log('  ┌──────────────────────────────────────────────────────┐')
  console.log('  │  Admin login:                                       │')
  console.log(`  │    Email:    ${adminEmail.padEnd(38)}│`)
  console.log(`  │    Password: ${adminPassword.padEnd(38)}│`)
  console.log('  │                                                      │')
  console.log('  │  Entrepreneurs: Register via the landing page        │')
  console.log('  │  Consultants:  Created by admin from the admin panel │')
  console.log('  └──────────────────────────────────────────────────────┘')
  console.log('\n💡 To change admin credentials, set these in .env:')
  console.log('   ADMIN_EMAIL=your-email@example.com')
  console.log('   ADMIN_PASSWORD=your-secure-password')
  console.log('   ADMIN_NAME=Your Name')
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await db.$disconnect()
  })
