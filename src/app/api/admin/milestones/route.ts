// GET /api/admin/milestones - List all milestone defaults
// POST /api/admin/milestones - Create a new milestone default
// PATCH /api/admin/milestones - Update a milestone default
// DELETE /api/admin/milestones - Soft delete a milestone default (set isActive=false)

import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser, requireRole, createSuccessResponse, createErrorResponse } from '@/lib/middleware'

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser(request)
    if (!user) {
      return createErrorResponse('AUTH_REQUIRED')
    }

    const checkRole = requireRole('ADMIN')
    checkRole(user)

    const url = new URL(request.url)
    const includeInactive = url.searchParams.get('includeInactive') === 'true'

    const where: Record<string, unknown> = {}
    if (!includeInactive) {
      where.isActive = true
    }

    const milestones = await db.milestoneDefault.findMany({
      where,
      include: {
        specialty: {
          select: { id: true, nameAr: true, nameEn: true, icon: true, color: true },
        },
        consultant: {
          select: {
            id: true,
            user: { select: { id: true, name: true, email: true } },
            specialty: { select: { nameEn: true } },
          },
        },
        _count: {
          select: {
            milestoneProgress: true,
          },
        },
      },
      orderBy: { sortOrder: 'asc' },
    })

    return createSuccessResponse(milestones)
  } catch (error) {
    if (error instanceof Error && error.message === 'INSUFFICIENT_PERMISSIONS') {
      return createErrorResponse(error.message)
    }
    console.error('List milestones error:', error)
    return createErrorResponse('Internal server error', 500)
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser(request)
    if (!user) {
      return createErrorResponse('AUTH_REQUIRED')
    }

    const checkRole = requireRole('ADMIN')
    checkRole(user)

    const body = await request.json()
    const { titleAr, titleEn, descriptionAr, descriptionEn, icon, sortOrder, specialtyId, consultantId } = body

    // Validate required fields
    if (!titleAr || !titleEn || !specialtyId) {
      return createErrorResponse('INVALID_INPUT')
    }

    // Verify specialty exists
    const specialty = await db.specialty.findUnique({ where: { id: specialtyId } })
    if (!specialty) {
      return Response.json(
        { success: false, error: 'Specialty not found' },
        { status: 400 }
      )
    }

    // Verify consultant exists if provided
    if (consultantId) {
      const consultant = await db.consultantProfile.findUnique({ where: { id: consultantId } })
      if (!consultant) {
        return Response.json(
          { success: false, error: 'Consultant not found' },
          { status: 400 }
        )
      }
    }

    const milestone = await db.milestoneDefault.create({
      data: {
        titleAr,
        titleEn,
        descriptionAr: descriptionAr || null,
        descriptionEn: descriptionEn || null,
        icon: icon || null,
        sortOrder: sortOrder ?? 0,
        specialtyId,
        consultantId: consultantId || null,
        isActive: true,
      },
      include: {
        specialty: {
          select: { id: true, nameAr: true, nameEn: true },
        },
      },
    })

    return createSuccessResponse(milestone, 201)
  } catch (error) {
    if (error instanceof Error && error.message === 'INSUFFICIENT_PERMISSIONS') {
      return createErrorResponse(error.message)
    }
    console.error('Create milestone error:', error)
    return createErrorResponse('Internal server error', 500)
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const user = await getCurrentUser(request)
    if (!user) {
      return createErrorResponse('AUTH_REQUIRED')
    }

    const checkRole = requireRole('ADMIN')
    checkRole(user)

    const body = await request.json()
    const { id, titleAr, titleEn, descriptionAr, descriptionEn, icon, sortOrder, specialtyId, consultantId, isActive } = body

    if (!id) {
      return createErrorResponse('INVALID_INPUT')
    }

    const existing = await db.milestoneDefault.findUnique({ where: { id } })
    if (!existing) {
      return createErrorResponse('NOT_FOUND')
    }

    // Verify specialty exists if being updated
    if (specialtyId) {
      const specialty = await db.specialty.findUnique({ where: { id: specialtyId } })
      if (!specialty) {
        return Response.json(
          { success: false, error: 'Specialty not found' },
          { status: 400 }
        )
      }
    }

    const updateData: Record<string, unknown> = {}
    if (titleAr !== undefined) updateData.titleAr = titleAr
    if (titleEn !== undefined) updateData.titleEn = titleEn
    if (descriptionAr !== undefined) updateData.descriptionAr = descriptionAr
    if (descriptionEn !== undefined) updateData.descriptionEn = descriptionEn
    if (icon !== undefined) updateData.icon = icon
    if (sortOrder !== undefined) updateData.sortOrder = sortOrder
    if (specialtyId !== undefined) updateData.specialtyId = specialtyId
    if (consultantId !== undefined) updateData.consultantId = consultantId || null
    if (isActive !== undefined) updateData.isActive = isActive

    const updated = await db.milestoneDefault.update({
      where: { id },
      data: updateData,
      include: {
        specialty: {
          select: { id: true, nameAr: true, nameEn: true },
        },
      },
    })

    return createSuccessResponse(updated)
  } catch (error) {
    if (error instanceof Error && error.message === 'INSUFFICIENT_PERMISSIONS') {
      return createErrorResponse(error.message)
    }
    console.error('Update milestone error:', error)
    return createErrorResponse('Internal server error', 500)
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const user = await getCurrentUser(request)
    if (!user) {
      return createErrorResponse('AUTH_REQUIRED')
    }

    const checkRole = requireRole('ADMIN')
    checkRole(user)

    const url = new URL(request.url)
    const id = url.searchParams.get('id')

    if (!id) {
      return createErrorResponse('INVALID_INPUT')
    }

    const existing = await db.milestoneDefault.findUnique({ where: { id } })
    if (!existing) {
      return createErrorResponse('NOT_FOUND')
    }

    // Soft delete by setting isActive to false
    const updated = await db.milestoneDefault.update({
      where: { id },
      data: { isActive: false },
    })

    return createSuccessResponse({ message: 'Milestone deactivated successfully', milestone: updated })
  } catch (error) {
    if (error instanceof Error && error.message === 'INSUFFICIENT_PERMISSIONS') {
      return createErrorResponse(error.message)
    }
    console.error('Delete milestone error:', error)
    return createErrorResponse('Internal server error', 500)
  }
}
