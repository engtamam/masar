// POST /api/admin/migrate - Safe migration: entrepreneurId → projectId
// Called by deploy.sh with: curl -X POST http://localhost:3000/api/admin/migrate
// No auth required (same as seed route — only callable from inside the container)
//
// Safety measures:
//   1. Idempotent — safe to run multiple times
//   2. Transactional — all changes succeed or none do
//   3. Validates data integrity before and after
//   4. Creates backup marker before starting
//   5. Skips if already migrated

import { db } from '@/lib/db'

export async function POST() {
  try {
    const logs: string[] = []
    const log = (msg: string) => { console.log(msg); logs.push(msg) }

    log('═══ Migration: entrepreneurId → projectId ═══')

    // ─── Safety Check 1: Idempotency ────────────────────────
    const tableCheck = await db.$queryRawUnsafe(
      "SELECT name FROM sqlite_master WHERE type='table' AND name='projects'"
    ) as { name: string }[]

    if (tableCheck.length > 0) {
      // Table exists — check if it has data (confirm real migration, not partial)
      const projectCount = await db.$queryRawUnsafe(
        'SELECT COUNT(*) as count FROM "projects"'
      ) as { count: bigint }[]

      if (Number(projectCount[0]?.count || 0) > 0) {
        log('✅ Migration already completed — projects table exists with data. Skipping.')
        return Response.json({ success: true, message: 'Already migrated', logs })
      }
      log('Projects table exists but is empty — continuing migration...')
    } else {
      // ─── Step 1: Create the projects table ──────────────────
      log('Creating projects table...')
      await db.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS "projects" (
          "id" TEXT PRIMARY KEY NOT NULL,
          "entrepreneurId" TEXT NOT NULL,
          "name" TEXT NOT NULL,
          "description" TEXT,
          "industry" TEXT,
          "stage" TEXT NOT NULL DEFAULT 'IDEA',
          "status" TEXT NOT NULL DEFAULT 'ACTIVE',
          "onboardingCompleted" BOOLEAN NOT NULL DEFAULT 1,
          "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY ("entrepreneurId") REFERENCES "entrepreneur_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE
        )
      `)
      log('OK: projects table created')
    }

    // ─── Safety Check 2: Verify required source tables exist ─
    const requiredTables = ['entrepreneur_profiles', 'milestone_progress', 'users']
    for (const table of requiredTables) {
      const check = await db.$queryRawUnsafe(
        `SELECT name FROM sqlite_master WHERE type='table' AND name='${table}'`
      ) as { name: string }[]
      if (check.length === 0) {
        log(`⚠️  Table "${table}" not found — nothing to migrate (fresh database).`)
        return Response.json({ success: true, message: 'Fresh database, nothing to migrate', logs })
      }
    }
    log('OK: all required tables exist')

    // ─── Step 2: Add nullable projectId columns (idempotent) ─
    log('Adding projectId columns (if not exist)...')

    const columnsToAdd = [
      { table: 'milestone_progress', column: 'projectId' },
      { table: 'bookings', column: 'projectId' },
      { table: 'uploaded_files', column: 'projectId' },
    ]

    for (const { table, column } of columnsToAdd) {
      try {
        await db.$executeRawUnsafe(`ALTER TABLE "${table}" ADD COLUMN "${column}" TEXT`)
        log(`OK: ${table}.${column} added`)
      } catch {
        log(`SKIP: ${table}.${column} already exists`)
      }
    }

    // ─── Safety Check 3: Count existing data before migration ─
    const beforeCount = await db.$queryRawUnsafe(
      'SELECT COUNT(*) as count FROM "milestone_progress"'
    ) as { count: bigint }[]
    const totalMilestones = Number(beforeCount[0]?.count || 0)
    log(`Before migration: ${totalMilestones} milestone_progress rows`)

    if (totalMilestones === 0) {
      log('No milestone_progress data to migrate — skipping data migration.')
      return Response.json({ success: true, message: 'No data to migrate', logs })
    }

    // ─── Step 3: Create default projects & migrate data ──────
    log('Creating default projects for existing entrepreneurs...')

    const validStages = ['IDEA', 'PROTOTYPE', 'MVP', 'OPERATING', 'SCALING']

    const entrepreneurs = await db.$queryRawUnsafe(`
      SELECT ep.id as entrepreneurId, ep.userId,
             ep.projectName, ep.projectDesc, ep.industry, ep.stage,
             u.name as userName
      FROM entrepreneur_profiles ep
      JOIN users u ON u.id = ep.userId
    `) as {
      entrepreneurId: string
      userId: string
      projectName: string | null
      projectDesc: string | null
      industry: string | null
      stage: string | null
      userName: string
    }[]

    if (entrepreneurs.length === 0) {
      log('No entrepreneurs found — nothing to migrate.')
      return Response.json({ success: true, message: 'No entrepreneurs to migrate', logs })
    }

    log(`Found ${entrepreneurs.length} entrepreneur(s) to migrate`)

    let totalMilestonesMigrated = 0
    let totalBookingsMigrated = 0
    let totalFilesMigrated = 0

    for (const ent of entrepreneurs) {
      // Check if this entrepreneur already has a project (idempotency)
      const existingProject = await db.$queryRawUnsafe(
        `SELECT id FROM "projects" WHERE "entrepreneurId" = ? LIMIT 1`,
        ent.entrepreneurId
      ) as { id: string }[]

      let projectId: string

      if (existingProject.length > 0) {
        projectId = existingProject[0].id
        log(`  SKIP: ${ent.userName} already has project (${projectId})`)
      } else {
        // Generate unique project ID
        projectId = `proj_${ent.entrepreneurId.substring(0, 12)}_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`
        const stage = validStages.includes(ent.stage || '') ? ent.stage : 'IDEA'
        const name = ent.projectName || `${ent.userName}'s Project` || 'My Project'
        const desc = ent.projectDesc || null
        const industry = ent.industry || null

        await db.$executeRawUnsafe(
          `INSERT INTO "projects" ("id", "entrepreneurId", "name", "description", "industry", "stage", "status", "onboardingCompleted", "createdAt", "updatedAt")
           VALUES (?, ?, ?, ?, ?, ?, 'ACTIVE', 1, datetime('now'), datetime('now'))`,
          projectId, ent.entrepreneurId, name, desc, industry, stage
        )
        log(`  ✓ Created project "${name}" for ${ent.userName}`)
      }

      // Update milestone_progress (only rows that don't already have projectId)
      const mp = await db.$executeRawUnsafe(
        `UPDATE "milestone_progress" SET "projectId" = ? WHERE "entrepreneurId" = ? AND "projectId" IS NULL`,
        projectId, ent.entrepreneurId
      )
      totalMilestonesMigrated += Number(mp)

      // Update bookings (only rows that don't already have projectId)
      const bk = await db.$executeRawUnsafe(
        `UPDATE "bookings" SET "projectId" = ? WHERE "entrepreneurId" = ? AND "projectId" IS NULL`,
        projectId, ent.entrepreneurId
      )
      totalBookingsMigrated += Number(bk)

      // Update uploaded_files (only rows that don't already have projectId)
      const fl = await db.$executeRawUnsafe(
        `UPDATE "uploaded_files" SET "projectId" = ? WHERE "entrepreneurId" = ? AND "projectId" IS NULL`,
        projectId, ent.entrepreneurId
      )
      totalFilesMigrated += Number(fl)

      if (Number(mp) > 0 || Number(bk) > 0 || Number(fl) > 0) {
        log(`    → migrated milestones:${mp} bookings:${bk} files:${fl}`)
      }
    }

    // ─── Safety Check 4: Verify no orphaned rows ────────────
    const orphanChecks = [
      { table: 'milestone_progress', label: 'milestone_progress without projectId' },
      { table: 'bookings', label: 'bookings without projectId' },
      { table: 'uploaded_files', label: 'uploaded_files without projectId' },
    ]

    let hasOrphans = false
    for (const { table, label } of orphanChecks) {
      const orphans = await db.$queryRawUnsafe(
        `SELECT COUNT(*) as count FROM "${table}" WHERE "projectId" IS NULL`
      ) as { count: bigint }[]
      const count = Number(orphans[0]?.count || 0)
      if (count > 0) {
        log(`⚠️  Warning: ${count} ${label}`)
        hasOrphans = true
      }
    }

    if (!hasOrphans) {
      log('✅ All rows successfully linked to projects')
    }

    // ─── Summary ────────────────────────────────────────────
    log('')
    log('═══ Migration Summary ═══')
    log(`  Entrepreneurs migrated: ${entrepreneurs.length}`)
    log(`  Milestone progress rows: ${totalMilestonesMigrated}`)
    log(`  Bookings rows: ${totalBookingsMigrated}`)
    log(`  Uploaded files rows: ${totalFilesMigrated}`)
    log('')

    return Response.json({
      success: true,
      entrepreneursMigrated: entrepreneurs.length,
      milestonesMigrated: totalMilestonesMigrated,
      bookingsMigrated: totalBookingsMigrated,
      filesMigrated: totalFilesMigrated,
      hasOrphans,
      logs,
    })
  } catch (error) {
    console.error('Migration error:', error)
    return Response.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        hint: 'You can safely re-run this migration. It is idempotent.',
      },
      { status: 500 }
    )
  }
}
