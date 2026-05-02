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

    // Count active milestones
    const milestoneCount = await db.milestoneDefault.count({
      where: { isActive: true },
    })

    return NextResponse.json({
      success: true,
      data: {
        entrepreneurs: entrepreneurCount,
        milestones: milestoneCount,
      },
    })
  } catch (error) {
    console.error('Get public stats error:', error)
    return NextResponse.json({
      success: true,
      data: {
        entrepreneurs: 0,
        milestones: 0,
      },
    })
  }
}
