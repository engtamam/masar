// Seed API Route — runs seed.ts logic inside Next.js context
// Called by deploy.sh with: curl -X POST http://localhost:3000/api/admin/seed

import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { hashPassword } from '@/lib/auth'
import { getDefaultConfigs } from '@/lib/config'

export async function POST() {
  try {
    const logs: string[] = []

    const log = (msg: string) => {
      console.log(msg)
      logs.push(msg)
    }

    log('Seeding database...')

    // 1. Seed Platform Configs
    log('  -> Seeding platform configs...')
    const defaultConfigs = getDefaultConfigs()
    for (const config of defaultConfigs) {
      await db.platformConfig.upsert({
        where: { key: config.key },
        update: { value: config.value },
        create: config,
      })
    }
    log(`  OK ${defaultConfigs.length} platform configs seeded`)

    // 2. Seed Specialties
    log('  -> Seeding specialties...')
    const specialties = [
      { nameAr: 'تطوير الأعمال', nameEn: 'Business Development', description: 'Business development and strategic growth', icon: 'briefcase', color: '#e74c3c', sortOrder: 0 },
      { nameAr: 'التخصص التقني', nameEn: 'Technical', description: 'Technical development and engineering', icon: 'code', color: '#3498db', sortOrder: 1 },
      { nameAr: 'الشؤون القانونية', nameEn: 'Legal', description: 'Legal affairs and regulatory compliance', icon: 'scale', color: '#2ecc71', sortOrder: 2 },
      { nameAr: 'التخطيط المالي', nameEn: 'Financial Planning', description: 'Financial planning and analysis', icon: 'calculator', color: '#f39c12', sortOrder: 3 },
      { nameAr: 'التسويق والاستثمار', nameEn: 'Marketing & Investment', description: 'Marketing strategy and investment readiness', icon: 'trending-up', color: '#9b59b6', sortOrder: 4 },
    ]

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
    log(`  OK ${createdSpecialties.length} specialties seeded`)

    // 3. Seed Milestone Defaults
    log('  -> Seeding milestone defaults...')
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
    log(`  OK ${createdMilestones.length} milestones seeded`)

    // 4. Seed Admin User
    log('  -> Seeding admin user...')
    const adminPasswordHash = await hashPassword('admin123')
    await db.user.upsert({
      where: { email: 'admin@platform.sa' },
      update: {},
      create: {
        email: 'admin@platform.sa',
        name: 'Platform Admin',
        passwordHash: adminPasswordHash,
        role: 'ADMIN',
        isActive: true,
      },
    })
    log('  OK Admin user: admin@platform.sa')

    // 5. Seed Sample Consultant
    log('  -> Seeding sample consultant...')
    const consultantPasswordHash = await hashPassword('consultant123')
    const consultantUser = await db.user.upsert({
      where: { email: 'consultant@platform.sa' },
      update: {},
      create: {
        email: 'consultant@platform.sa',
        name: 'Ahmed Consultant',
        passwordHash: consultantPasswordHash,
        role: 'CONSULTANT',
        phone: '+966501234567',
        isActive: true,
      },
    })

    const consultantProfile = await db.consultantProfile.upsert({
      where: { userId: consultantUser.id },
      update: {},
      create: {
        userId: consultantUser.id,
        specialtyId: createdSpecialties[0].id,
        bio: 'Experienced business development consultant with 10+ years of experience',
        experience: '10+ years in business consulting',
        rating: 4.8,
        isActive: true,
      },
    })

    for (const ms of createdMilestones.filter((_, i) => i < 4)) {
      await db.milestoneDefault.update({
        where: { id: ms.id },
        data: { consultantId: consultantProfile.id },
      })
    }
    log('  OK Consultant user: consultant@platform.sa')

    // 6. Seed Sample Entrepreneur
    log('  -> Seeding sample entrepreneur...')
    const entrepreneurPasswordHash = await hashPassword('entrepreneur123')
    const entrepreneurUser = await db.user.upsert({
      where: { email: 'entrepreneur@platform.sa' },
      update: {},
      create: {
        email: 'entrepreneur@platform.sa',
        name: 'Sara Entrepreneur',
        passwordHash: entrepreneurPasswordHash,
        role: 'ENTREPRENEUR',
        phone: '+966509876543',
        isActive: true,
      },
    })

    const entrepreneurProfile = await db.entrepreneurProfile.upsert({
      where: { userId: entrepreneurUser.id },
      update: {},
      create: {
        userId: entrepreneurUser.id,
        projectName: 'TechVenture',
        projectDesc: 'An innovative technology startup',
        industry: 'Technology',
        stage: 'IDEA',
      },
    })

    const currentMonth = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`
    for (let i = 0; i < createdMilestones.length; i++) {
      await db.milestoneProgress.upsert({
        where: {
          entrepreneurId_milestoneDefaultId: {
            entrepreneurId: entrepreneurProfile.id,
            milestoneDefaultId: createdMilestones[i].id,
          },
        },
        update: {},
        create: {
          entrepreneurId: entrepreneurProfile.id,
          milestoneDefaultId: createdMilestones[i].id,
          status: i === 0 ? 'IN_PROGRESS' : 'LOCKED',
          startedAt: i === 0 ? new Date() : null,
        },
      })
    }

    await db.quota.upsert({
      where: { entrepreneurId: entrepreneurProfile.id },
      update: {},
      create: {
        entrepreneurId: entrepreneurProfile.id,
        monthlyBookingLimit: 4,
        bookingsUsedThisMonth: 0,
        currentMonth,
        isExempted: false,
      },
    })

    // Create chat room
    const chatRoom = await db.chatRoom.create({
      data: {
        name: 'Sara - Ahmed: Business Development',
        type: 'DIRECT',
        members: {
          create: [
            { userId: entrepreneurUser.id, role: 'member' },
            { userId: consultantUser.id, role: 'member' },
          ],
        },
      },
    })

    await db.chatMessage.create({
      data: {
        chatRoomId: chatRoom.id,
        senderId: consultantUser.id,
        content: 'Welcome to the incubator program! I am your business development consultant. Feel free to ask any questions.',
      },
    })
    log('  OK Entrepreneur user: entrepreneur@platform.sa')

    // 7. Seed second consultant
    log('  -> Seeding second consultant...')
    const consultant2PasswordHash = await hashPassword('consultant123')
    const consultant2User = await db.user.upsert({
      where: { email: 'consultant2@platform.sa' },
      update: {},
      create: {
        email: 'consultant2@platform.sa',
        name: 'Fatima Legal',
        passwordHash: consultant2PasswordHash,
        role: 'CONSULTANT',
        phone: '+966507654321',
        isActive: true,
      },
    })

    const consultant2Profile = await db.consultantProfile.upsert({
      where: { userId: consultant2User.id },
      update: {},
      create: {
        userId: consultant2User.id,
        specialtyId: createdSpecialties[2].id,
        bio: 'Legal expert specializing in startup law and compliance',
        experience: '8+ years in legal consulting',
        rating: 4.6,
        isActive: true,
      },
    })

    for (const ms of createdMilestones.filter((_, i) => i >= 4)) {
      await db.milestoneDefault.update({
        where: { id: ms.id },
        data: { consultantId: consultant2Profile.id },
      })
    }
    log('  OK Second consultant: consultant2@platform.sa')

    log('Seeding complete!')

    return NextResponse.json({ success: true, logs })
  } catch (error: any) {
    console.error('Seed failed:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Unknown error' },
      { status: 500 }
    )
  }
}
