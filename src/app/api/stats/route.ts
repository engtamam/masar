// GET /api/stats - Public platform statistics for landing page
// No authentication required — returns only safe, public-facing counts

import { db } from '@/lib/db'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    // Count active entrepreneurs only
    const entrepreneurCount = await db.user.count({
      where: {
        role: 'ENTREPRENEUR',
        isActive: true,
      },
    })

    // Get active milestones (ordered)
    const milestones = await db.milestoneDefault.findMany({
      where: { isActive: true },
      select: {
        id: true,
        titleAr: true,
        titleEn: true,
        descriptionAr: true,
        descriptionEn: true,
        icon: true,
        sortOrder: true,
      },
      orderBy: { sortOrder: 'asc' },
    })

    return NextResponse.json({
      success: true,
      data: {
        entrepreneurs: entrepreneurCount,
        milestones: milestones.length,
        milestonesList: milestones,
      },
    })
  } catch (error) {
    console.error('Get public stats error:', error)
    return NextResponse.json({
      success: true,
      data: {
        entrepreneurs: 0,
        milestones: 0,
        milestonesList: [],
      },
    })
  }
}
