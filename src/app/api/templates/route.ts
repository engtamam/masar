// GET /api/templates - List active templates (for authenticated users)
// Supports filtering by category and specialty

import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser, createSuccessResponse, createErrorResponse } from '@/lib/middleware'

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser(request)
    if (!user) return createErrorResponse('AUTH_REQUIRED')

    const url = new URL(request.url)
    const category = url.searchParams.get('category')
    const specialtyId = url.searchParams.get('specialtyId')

    const where: Record<string, unknown> = { isActive: true }
    if (category) where.category = category
    if (specialtyId) where.specialtyId = specialtyId

    const templates = await db.template.findMany({
      where,
      include: {
        specialty: { select: { id: true, nameAr: true, nameEn: true } },
      },
      orderBy: { sortOrder: 'asc' },
    })

    return createSuccessResponse(templates)
  } catch (error) {
    console.error('List templates error:', error)
    return createErrorResponse('Internal server error', 500)
  }
}
