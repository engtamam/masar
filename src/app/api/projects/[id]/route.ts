// GET /api/projects/[id] - Get project details
// PATCH /api/projects/[id] - Update project

import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser, createSuccessResponse, createErrorResponse } from '@/lib/middleware'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser(request)
    if (!user) {
      return createErrorResponse('AUTH_REQUIRED')
    }

    const { id } = await params

    const project = await db.project.findUnique({
      where: { id },
      include: {
        entrepreneur: {
          include: {
            user: {
              select: { id: true, name: true, email: true, avatarUrl: true },
            },
          },
        },
        milestoneProgress: {
          include: {
            milestoneDefault: {
              include: {
                specialty: true,
                consultant: {
                  include: {
                    user: {
                      select: { id: true, name: true, avatarUrl: true },
                    },
                  },
                },
              },
            },
            approvals: {
              include: {
                consultant: {
                  include: {
                    user: {
                      select: { id: true, name: true },
                    },
                  },
                },
              },
              orderBy: { createdAt: 'desc' },
            },
            files: true,
          },
          orderBy: {
            milestoneDefault: { sortOrder: 'asc' },
          },
        },
        bookings: {
          include: {
            consultant: {
              include: {
                user: { select: { id: true, name: true, avatarUrl: true } },
                specialty: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
        },
        files: {
          include: {
            uploader: {
              select: { id: true, name: true, avatarUrl: true },
            },
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    })

    if (!project) {
      return createErrorResponse('NOT_FOUND')
    }

    // Authorization check
    if (user.role === 'ENTREPRENEUR') {
      const profile = await db.entrepreneurProfile.findUnique({
        where: { userId: user.userId },
      })
      if (!profile || project.entrepreneurId !== profile.id) {
        return createErrorResponse('INSUFFICIENT_PERMISSIONS')
      }
    } else if (user.role === 'CONSULTANT') {
      // Consultants can view if they have a booking with this project
      const hasBooking = await db.booking.findFirst({
        where: {
          projectId: id,
          consultant: { userId: user.userId },
        },
      })
      if (!hasBooking) {
        return createErrorResponse('INSUFFICIENT_PERMISSIONS')
      }
    }
    // Admin can see everything

    return createSuccessResponse(project)
  } catch (error) {
    console.error('Get project error:', error)
    return createErrorResponse('Internal server error', 500)
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser(request)
    if (!user) {
      return createErrorResponse('AUTH_REQUIRED')
    }

    if (user.role !== 'ENTREPRENEUR') {
      return createErrorResponse('INSUFFICIENT_PERMISSIONS')
    }

    const { id } = await params
    const body = await request.json()
    const { name, description, industry, stage, status } = body

    // Verify ownership
    const profile = await db.entrepreneurProfile.findUnique({
      where: { userId: user.userId },
    })
    if (!profile) {
      return createErrorResponse('NOT_FOUND')
    }

    const project = await db.project.findFirst({
      where: { id, entrepreneurId: profile.id },
    })
    if (!project) {
      return createErrorResponse('NOT_FOUND')
    }

    // Build update data
    const updateData: Record<string, unknown> = {}
    if (name !== undefined) updateData.name = name
    if (description !== undefined) updateData.description = description
    if (industry !== undefined) updateData.industry = industry
    if (stage !== undefined) {
      const validStages = ['IDEA', 'PROTOTYPE', 'MVP', 'OPERATING', 'SCALING']
      if (!validStages.includes(stage)) {
        return Response.json(
          { success: false, error: 'مرحلة المشروع غير صالحة' },
          { status: 400 }
        )
      }
      updateData.stage = stage
    }
    if (status !== undefined) {
      const validStatuses = ['ACTIVE', 'PAUSED', 'COMPLETED', 'ARCHIVED']
      if (!validStatuses.includes(status)) {
        return Response.json(
          { success: false, error: 'حالة المشروع غير صالحة' },
          { status: 400 }
        )
      }
      updateData.status = status
    }

    const updated = await db.project.update({
      where: { id },
      data: updateData,
    })

    return createSuccessResponse(updated)
  } catch (error) {
    console.error('Update project error:', error)
    return createErrorResponse('Internal server error', 500)
  }
}
