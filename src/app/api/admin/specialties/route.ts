// GET /api/admin/specialties - List all specialties
// POST /api/admin/specialties - Create a new specialty
// PATCH /api/admin/specialties - Update a specialty
// DELETE /api/admin/specialties - Soft delete a specialty (set isActive=false)

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

    const specialties = await db.specialty.findMany({
      where,
      include: {
        _count: {
          select: {
            consultants: { where: { isActive: true } },
            milestoneDefaults: { where: { isActive: true } },
          },
        },
      },
      orderBy: { sortOrder: 'asc' },
    })

    return createSuccessResponse(specialties)
  } catch (error) {
    if (error instanceof Error && error.message === 'INSUFFICIENT_PERMISSIONS') {
      return createErrorResponse(error.message)
    }
    console.error('List specialties error:', error)
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
    const { nameAr, nameEn, description, icon, color, sortOrder } = body

    // Validate required fields
    if (!nameAr || !nameEn) {
      return createErrorResponse('INVALID_INPUT')
    }

    // Check for duplicate names
    const existing = await db.specialty.findFirst({
      where: {
        OR: [{ nameAr }, { nameEn }],
      },
    })
    if (existing) {
      return Response.json(
        { success: false, error: 'Specialty with this name already exists' },
        { status: 409 }
      )
    }

    const specialty = await db.specialty.create({
      data: {
        nameAr,
        nameEn,
        description: description || null,
        icon: icon || null,
        color: color || null,
        sortOrder: sortOrder ?? 0,
        isActive: true,
      },
    })

    return createSuccessResponse(specialty, 201)
  } catch (error) {
    if (error instanceof Error && error.message === 'INSUFFICIENT_PERMISSIONS') {
      return createErrorResponse(error.message)
    }
    console.error('Create specialty error:', error)
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
    const { id, nameAr, nameEn, description, icon, color, sortOrder, isActive } = body

    if (!id) {
      return createErrorResponse('INVALID_INPUT')
    }

    const existing = await db.specialty.findUnique({ where: { id } })
    if (!existing) {
      return createErrorResponse('NOT_FOUND')
    }

    const updateData: Record<string, unknown> = {}
    if (nameAr !== undefined) updateData.nameAr = nameAr
    if (nameEn !== undefined) updateData.nameEn = nameEn
    if (description !== undefined) updateData.description = description
    if (icon !== undefined) updateData.icon = icon
    if (color !== undefined) updateData.color = color
    if (sortOrder !== undefined) updateData.sortOrder = sortOrder
    if (isActive !== undefined) updateData.isActive = isActive

    const updated = await db.specialty.update({
      where: { id },
      data: updateData,
    })

    return createSuccessResponse(updated)
  } catch (error) {
    if (error instanceof Error && error.message === 'INSUFFICIENT_PERMISSIONS') {
      return createErrorResponse(error.message)
    }
    console.error('Update specialty error:', error)
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

    const existing = await db.specialty.findUnique({ where: { id } })
    if (!existing) {
      return createErrorResponse('NOT_FOUND')
    }

    // Soft delete by setting isActive to false
    const updated = await db.specialty.update({
      where: { id },
      data: { isActive: false },
    })

    return createSuccessResponse({ message: 'Specialty deactivated successfully', specialty: updated })
  } catch (error) {
    if (error instanceof Error && error.message === 'INSUFFICIENT_PERMISSIONS') {
      return createErrorResponse(error.message)
    }
    console.error('Delete specialty error:', error)
    return createErrorResponse('Internal server error', 500)
  }
}
