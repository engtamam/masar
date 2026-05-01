// POST /api/milestones/[id]/approve
// Consultant approves a milestone for an entrepreneur

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

    const checkRole = requireRole('CONSULTANT', 'ADMIN')
    checkRole(user)

    const { id } = await params
    const body = await request.json()
    const { projectId, comment, status: approvalStatus } = body

    if (!projectId) {
      return createErrorResponse('INVALID_INPUT')
    }

    // Find the milestone progress
    const progress = await db.milestoneProgress.findFirst({
      where: {
        id,
        projectId,
      },
      include: {
        milestoneDefault: true,
        project: {
          include: {
            entrepreneur: {
              include: { user: true },
            },
          },
        },
      },
    })

    if (!progress) {
      return createErrorResponse('NOT_FOUND')
    }

    if (progress.status !== 'SUBMITTED') {
      return Response.json(
        { success: false, error: 'Milestone must be in SUBMITTED status to approve' },
        { status: 400 }
      )
    }

    // Get consultant profile
    let consultantId: string | null = null
    if (user.role === 'CONSULTANT') {
      const consultantProfile = await db.consultantProfile.findUnique({
        where: { userId: user.userId },
      })
      if (!consultantProfile) {
        return createErrorResponse('NOT_FOUND')
      }
      consultantId = consultantProfile.id
    }

    // Process approval in transaction
    const result = await db.$transaction(async (tx) => {
      // Create approval record
      const approval = await tx.milestoneApproval.create({
        data: {
          milestoneProgressId: progress.id,
          consultantId: consultantId || '',
          status: approvalStatus === 'REJECTED' ? 'REJECTED' : 'APPROVED',
          comment: comment || null,
        },
      })

      if (approval.status === 'APPROVED') {
        // Update milestone progress to APPROVED
        await tx.milestoneProgress.update({
          where: { id: progress.id },
          data: {
            status: 'APPROVED',
            approvedAt: new Date(),
          },
        })

        // Unlock the next milestone in the same project
        const nextMilestone = await tx.milestoneDefault.findFirst({
          where: {
            sortOrder: progress.milestoneDefault.sortOrder + 1,
            isActive: true,
          },
        })

        if (nextMilestone) {
          await tx.milestoneProgress.upsert({
            where: {
              projectId_milestoneDefaultId: {
                projectId,
                milestoneDefaultId: nextMilestone.id,
              },
            },
            update: {
              status: 'IN_PROGRESS',
              startedAt: new Date(),
            },
            create: {
              projectId,
              milestoneDefaultId: nextMilestone.id,
              status: 'IN_PROGRESS',
              startedAt: new Date(),
            },
          })
        }

        // Check if all milestones are approved — update project status
        const totalMilestones = await tx.milestoneProgress.count({
          where: { projectId },
        })
        const approvedMilestones = await tx.milestoneProgress.count({
          where: { projectId, status: 'APPROVED' },
        })

        if (totalMilestones > 0 && approvedMilestones === totalMilestones) {
          await tx.project.update({
            where: { id: projectId },
            data: { status: 'COMPLETED' },
          })
        }

        // Create notification for entrepreneur
        await tx.notification.create({
          data: {
            userId: progress.project.entrepreneur.userId,
            title: 'Milestone Approved',
            message: `Your milestone "${progress.milestoneDefault.titleEn}" has been approved!${nextMilestone ? ` The next milestone "${nextMilestone.titleEn}" is now unlocked.` : ' Congratulations, you have completed all milestones!'}`,
            type: 'success',
            link: '/milestones',
          },
        })
      } else {
        // Rejected - set back to IN_PROGRESS
        await tx.milestoneProgress.update({
          where: { id: progress.id },
          data: {
            status: 'IN_PROGRESS',
          },
        })

        // Create notification for entrepreneur
        await tx.notification.create({
          data: {
            userId: progress.project.entrepreneur.userId,
            title: 'Milestone Rejected',
            message: `Your milestone "${progress.milestoneDefault.titleEn}" has been rejected. ${comment || 'Please review and resubmit.'}`,
            type: 'warning',
            link: '/milestones',
          },
        })
      }

      return approval
    })

    return createSuccessResponse(result)
  } catch (error) {
    if (error instanceof Error && (error.message === 'AUTH_REQUIRED' || error.message === 'INSUFFICIENT_PERMISSIONS')) {
      return createErrorResponse(error.message)
    }
    console.error('Approve milestone error:', error)
    return createErrorResponse('Internal server error', 500)
  }
}
