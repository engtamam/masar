// GET /api/admin/configs - List all platform configs
// PATCH /api/admin/configs - Update a config value

import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser, requireRole, createSuccessResponse, createErrorResponse } from '@/lib/middleware'
import { invalidateConfigCache } from '@/lib/config'

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser(request)
    if (!user) {
      return createErrorResponse('AUTH_REQUIRED')
    }

    const checkRole = requireRole('ADMIN')
    checkRole(user)

    const configs = await db.platformConfig.findMany({
      orderBy: { key: 'asc' },
    })

    return createSuccessResponse(configs)
  } catch (error) {
    if (error instanceof Error && error.message === 'INSUFFICIENT_PERMISSIONS') {
      return createErrorResponse(error.message)
    }
    console.error('List configs error:', error)
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
    const { key, value } = body

    if (!key || value === undefined) {
      return createErrorResponse('INVALID_INPUT')
    }

    const existing = await db.platformConfig.findUnique({ where: { key } })
    if (!existing) {
      return createErrorResponse('NOT_FOUND')
    }

    // Validate value based on config type
    if (existing.type === 'NUMBER' && isNaN(Number(value))) {
      return Response.json(
        { success: false, error: 'Value must be a valid number' },
        { status: 400 }
      )
    }

    if (existing.type === 'BOOLEAN' && !['true', 'false', '0', '1'].includes(String(value))) {
      return Response.json(
        { success: false, error: 'Value must be a boolean (true/false)' },
        { status: 400 }
      )
    }

    if (existing.type === 'JSON') {
      try {
        JSON.parse(String(value))
      } catch {
        return Response.json(
          { success: false, error: 'Value must be valid JSON' },
          { status: 400 }
        )
      }
    }

    const updated = await db.platformConfig.update({
      where: { key },
      data: { value: String(value) },
    })

    // Invalidate config cache so new value is picked up
    invalidateConfigCache()

    return createSuccessResponse(updated)
  } catch (error) {
    if (error instanceof Error && error.message === 'INSUFFICIENT_PERMISSIONS') {
      return createErrorResponse(error.message)
    }
    console.error('Update config error:', error)
    return createErrorResponse('Internal server error', 500)
  }
}
