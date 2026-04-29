// POST /api/milestones/[id]/submit
// Entrepreneur submits a milestone for review

import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser, requireRole, createSuccessResponse, createErrorResponse } from '@/lib/middleware'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser(request)
    if (!user) {
      return createErrorResponse('AUTH_REQUIRED')
    }

    const checkRole = requireRole('ENTREPRENEUR')
    checkRole(user)

    const { id } = await params
    const body = await request.json()
    const { notes } = body

    // Get entrepreneur profile
    const profile = await db.entrepreneurProfile.findUnique({
      where: { userId: user.userId },
    })

    if (!profile) {
      return createErrorResponse('NOT_FOUND')
    }

    // Find the milestone progress
    const progress = await db.milestoneProgress.findFirst({
      where: {
        id,
        entrepreneurId: profile.id,
      },
      include: {
        milestoneDefault: {
          include: {
            consultant: {
              include: {
                user: true,
              },
            },
          },
        },
      },
    })

    if (!progress) {
      return createErrorResponse('NOT_FOUND')
    }

    if (progress.status !== 'IN_PROGRESS') {
      return Response.json(
        { success: false, error: 'Milestone must be in IN_PROGRESS status to submit' },
        { status: 400 }
      )
    }

    // Update milestone progress to SUBMITTED
    const updated = await db.milestoneProgress.update({
      where: { id: progress.id },
      data: {
        status: 'SUBMITTED',
        submittedAt: new Date(),
        notes: notes || progress.notes,
      },
    })

    // Notify the assigned consultant
    if (progress.milestoneDefault.consultant) {
      await db.notification.create({
        data: {
          userId: progress.milestoneDefault.consultant.userId,
          title: 'Milestone Submitted for Review',
          message: `${user.name} has submitted the milestone "${progress.milestoneDefault.titleEn}" for your review.`,
          type: 'info',
          link: '/milestones',
        },
      })
    }

    return createSuccessResponse(updated)
  } catch (error) {
    if (error instanceof Error && (error.message === 'AUTH_REQUIRED' || error.message === 'INSUFFICIENT_PERMISSIONS')) {
      return createErrorResponse(error.message)
    }
    console.error('Submit milestone error:', error)
    return createErrorResponse('Internal server error', 500)
  }
}
