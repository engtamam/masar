// GET /api/milestones
// Get milestones with progress for the current user
// Now requires projectId for entrepreneurs

import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser, requireRole, createSuccessResponse, createErrorResponse } from '@/lib/middleware'

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser(request)
    if (!user) {
      return createErrorResponse('AUTH_REQUIRED')
    }

    const url = new URL(request.url)
    const projectId = url.searchParams.get('projectId')

    // Get all active milestone defaults
    const milestoneDefaults = await db.milestoneDefault.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' },
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
    })

    if (user.role === 'ENTREPRENEUR') {
      // Get entrepreneur's profile
      const profile = await db.entrepreneurProfile.findUnique({
        where: { userId: user.userId },
      })

      if (!profile) {
        return createErrorResponse('NOT_FOUND')
      }

      // If projectId is provided, get milestones for that project
      if (projectId) {
        // Verify project ownership
        const project = await db.project.findFirst({
          where: { id: projectId, entrepreneurId: profile.id },
        })
        if (!project) {
          return createErrorResponse('NOT_FOUND')
        }

        const progress = await db.milestoneProgress.findMany({
          where: { projectId: project.id },
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
        })

        return createSuccessResponse({
          milestones: milestoneDefaults,
          progress,
          project,
        })
      }

      // No projectId — return all projects with their milestones
      const projects = await db.project.findMany({
        where: { entrepreneurId: profile.id },
        include: {
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
        },
        orderBy: { createdAt: 'desc' },
      })

      return createSuccessResponse({
        milestones: milestoneDefaults,
        projects,
      })
    }

    if (user.role === 'CONSULTANT') {
      // Get consultant profile
      const profile = await db.consultantProfile.findUnique({
        where: { userId: user.userId },
      })

      if (!profile) {
        return createErrorResponse('NOT_FOUND')
      }

      // Get milestones this consultant can approve
      const assignedMilestones = milestoneDefaults.filter(
        (m) => m.consultantId === profile.id
      )

      // Get all progress entries for these milestones that are SUBMITTED
      const pendingApprovals = await db.milestoneProgress.findMany({
        where: {
          milestoneDefaultId: { in: assignedMilestones.map((m) => m.id) },
          status: 'SUBMITTED',
        },
        include: {
          milestoneDefault: {
            include: {
              specialty: true,
            },
          },
          project: {
            include: {
              entrepreneur: {
                include: {
                  user: {
                    select: { id: true, name: true, email: true, avatarUrl: true },
                  },
                },
              },
            },
          },
          approvals: {
            orderBy: { createdAt: 'desc' },
          },
          files: true,
        },
      })

      // Get all progress for assigned milestones
      const allProgress = await db.milestoneProgress.findMany({
        where: {
          milestoneDefaultId: { in: assignedMilestones.map((m) => m.id) },
        },
        include: {
          milestoneDefault: {
            include: {
              specialty: true,
            },
          },
          project: {
            include: {
              entrepreneur: {
                include: {
                  user: {
                    select: { id: true, name: true, email: true, avatarUrl: true },
                  },
                },
              },
            },
          },
          approvals: {
            orderBy: { createdAt: 'desc' },
          },
        },
        orderBy: {
          milestoneDefault: { sortOrder: 'asc' },
        },
      })

      return createSuccessResponse({
        assignedMilestones,
        pendingApprovals,
        allProgress,
      })
    }

    // Admin gets all milestones with all progress
    if (user.role === 'ADMIN') {
      const allProgress = await db.milestoneProgress.findMany({
        include: {
          milestoneDefault: {
            include: {
              specialty: true,
              consultant: {
                include: {
                  user: {
                    select: { id: true, name: true },
                  },
                },
              },
            },
          },
          project: {
            include: {
              entrepreneur: {
                include: {
                  user: {
                    select: { id: true, name: true, email: true },
                  },
                },
              },
            },
          },
          approvals: {
            orderBy: { createdAt: 'desc' },
          },
        },
        orderBy: {
          milestoneDefault: { sortOrder: 'asc' },
        },
      })

      return createSuccessResponse({
        milestones: milestoneDefaults,
        allProgress,
      })
    }

    return createErrorResponse('INSUFFICIENT_PERMISSIONS')
  } catch (error) {
    console.error('Get milestones error:', error)
    return createErrorResponse('Internal server error', 500)
  }
}
