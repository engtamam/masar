// GET  /api/admin/templates - List all templates (admin)
// POST /api/admin/templates - Create a template (with file upload)
// PATCH /api/admin/templates - Update template metadata
// DELETE /api/admin/templates?id=... - Soft-delete a template

import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser, requireRole, createSuccessResponse, createErrorResponse } from '@/lib/middleware'
import { writeFileSync, mkdirSync, existsSync, unlinkSync } from 'fs'
import { join } from 'path'
import { v4 as uuidv4 } from 'uuid'

const TEMPLATE_DIR = '/home/z/my-project/upload/templates'

function ensureTemplateDir() {
  if (!existsSync(TEMPLATE_DIR)) {
    mkdirSync(TEMPLATE_DIR, { recursive: true })
  }
}

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser(request)
    if (!user) return createErrorResponse('AUTH_REQUIRED')
    requireRole('ADMIN')(user)

    const url = new URL(request.url)
    const includeInactive = url.searchParams.get('includeInactive') === 'true'

    const where: Record<string, unknown> = {}
    if (!includeInactive) where.isActive = true

    const templates = await db.template.findMany({
      where,
      include: {
        specialty: { select: { id: true, nameAr: true, nameEn: true } },
      },
      orderBy: { sortOrder: 'asc' },
    })

    return createSuccessResponse(templates)
  } catch (error) {
    if (error instanceof Error && error.message === 'INSUFFICIENT_PERMISSIONS') {
      return createErrorResponse(error.message)
    }
    console.error('List templates error:', error)
    return createErrorResponse('Internal server error', 500)
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser(request)
    if (!user) return createErrorResponse('AUTH_REQUIRED')
    requireRole('ADMIN')(user)

    const formData = await request.formData()
    const file = formData.get('file') as File | null
    const nameAr = formData.get('nameAr') as string
    const nameEn = formData.get('nameEn') as string
    const descriptionAr = formData.get('descriptionAr') as string | null
    const descriptionEn = formData.get('descriptionEn') as string | null
    const category = formData.get('category') as string | null
    const specialtyId = formData.get('specialtyId') as string | null
    const sortOrder = formData.get('sortOrder') as string | null

    if (!file || !nameAr || !nameEn) {
      return createErrorResponse('INVALID_INPUT')
    }

    // Validate specialty if provided
    if (specialtyId) {
      const specialty = await db.specialty.findUnique({ where: { id: specialtyId } })
      if (!specialty) return createErrorResponse('NOT_FOUND')
    }

    // Read file buffer
    const buffer = Buffer.from(await file.arrayBuffer())
    const fileExt = file.name.split('.').pop()?.toLowerCase() || 'bin'
    const uniqueName = `${uuidv4()}.${fileExt}`

    // Save file to disk
    ensureTemplateDir()
    const filePath = join(TEMPLATE_DIR, uniqueName)
    writeFileSync(filePath, buffer)

    // Create template record
    const template = await db.template.create({
      data: {
        nameAr,
        nameEn,
        descriptionAr: descriptionAr || null,
        descriptionEn: descriptionEn || null,
        category: category || null,
        specialtyId: specialtyId || null,
        fileName: file.name,
        filePath,
        fileType: file.type || 'application/octet-stream',
        fileSize: file.size,
        sortOrder: sortOrder ? parseInt(sortOrder) : 0,
      },
      include: {
        specialty: { select: { id: true, nameAr: true, nameEn: true } },
      },
    })

    return createSuccessResponse(template, 201)
  } catch (error) {
    if (error instanceof Error && error.message === 'INSUFFICIENT_PERMISSIONS') {
      return createErrorResponse(error.message)
    }
    console.error('Create template error:', error)
    return createErrorResponse('Internal server error', 500)
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const user = await getCurrentUser(request)
    if (!user) return createErrorResponse('AUTH_REQUIRED')
    requireRole('ADMIN')(user)

    const body = await request.json()
    const { id, nameAr, nameEn, descriptionAr, descriptionEn, category, specialtyId, sortOrder, isActive } = body

    if (!id) return createErrorResponse('INVALID_INPUT')

    const existing = await db.template.findUnique({ where: { id } })
    if (!existing) return createErrorResponse('NOT_FOUND')

    // Validate specialty if being changed
    if (specialtyId !== undefined && specialtyId !== null) {
      const specialty = await db.specialty.findUnique({ where: { id: specialtyId } })
      if (!specialty) return createErrorResponse('NOT_FOUND')
    }

    const updateData: Record<string, unknown> = {}
    if (nameAr !== undefined) updateData.nameAr = nameAr
    if (nameEn !== undefined) updateData.nameEn = nameEn
    if (descriptionAr !== undefined) updateData.descriptionAr = descriptionAr
    if (descriptionEn !== undefined) updateData.descriptionEn = descriptionEn
    if (category !== undefined) updateData.category = category
    if (specialtyId !== undefined) updateData.specialtyId = specialtyId || null
    if (sortOrder !== undefined) updateData.sortOrder = sortOrder
    if (isActive !== undefined) updateData.isActive = isActive

    const updated = await db.template.update({
      where: { id },
      data: updateData,
      include: {
        specialty: { select: { id: true, nameAr: true, nameEn: true } },
      },
    })

    return createSuccessResponse(updated)
  } catch (error) {
    if (error instanceof Error && error.message === 'INSUFFICIENT_PERMISSIONS') {
      return createErrorResponse(error.message)
    }
    console.error('Update template error:', error)
    return createErrorResponse('Internal server error', 500)
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const user = await getCurrentUser(request)
    if (!user) return createErrorResponse('AUTH_REQUIRED')
    requireRole('ADMIN')(user)

    const url = new URL(request.url)
    const id = url.searchParams.get('id')

    if (!id) return createErrorResponse('INVALID_INPUT')

    const existing = await db.template.findUnique({ where: { id } })
    if (!existing) return createErrorResponse('NOT_FOUND')

    // Soft delete (deactivate) — keep the file on disk
    const updated = await db.template.update({
      where: { id },
      data: { isActive: false },
    })

    return createSuccessResponse({ message: 'Template deactivated successfully', template: updated })
  } catch (error) {
    if (error instanceof Error && error.message === 'INSUFFICIENT_PERMISSIONS') {
      return createErrorResponse(error.message)
    }
    console.error('Delete template error:', error)
    return createErrorResponse('Internal server error', 500)
  }
}
