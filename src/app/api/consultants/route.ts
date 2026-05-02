// GET /api/consultants - List active consultants (for entrepreneurs to book sessions)

import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser, createSuccessResponse, createErrorResponse } from '@/lib/middleware'

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser(request)
    if (!user) {
      return createErrorResponse('AUTH_REQUIRED')
    }

    const url = new URL(request.url)
    const specialtyId = url.searchParams.get('specialtyId')

    const where: Record<string, unknown> = {
      isActive: true,
      user: { isActive: true },
    }

    if (specialtyId) {
      where.specialtyId = specialtyId
    }

    const consultants = await db.consultantProfile.findMany({
      where,
      include: {
        user: {
          select: { id: true, name: true, email: true, avatarUrl: true },
        },
        specialty: {
          select: { id: true, nameAr: true, nameEn: true, icon: true, color: true },
        },
      },
      orderBy: { rating: 'desc' },
    })

    return createSuccessResponse(consultants)
  } catch (error) {
    console.error('Get consultants error:', error)
    return createErrorResponse('Internal server error', 500)
  }
}
