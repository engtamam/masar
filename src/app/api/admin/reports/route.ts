// GET /api/admin/reports - Dashboard statistics for admin

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

    // Get total users by role
    const [adminCount, consultantCount, entrepreneurCount] = await Promise.all([
      db.user.count({ where: { role: 'ADMIN', isActive: true } }),
      db.user.count({ where: { role: 'CONSULTANT', isActive: true } }),
      db.user.count({ where: { role: 'ENTREPRENEUR', isActive: true } }),
    ])

    const totalUsers = adminCount + consultantCount + entrepreneurCount

    // Get total bookings
    const [totalBookings, completedBookings, cancelledBookings] = await Promise.all([
      db.booking.count(),
      db.booking.count({ where: { status: 'COMPLETED' } }),
      db.booking.count({ where: { status: 'CANCELLED' } }),
    ])

    // Get milestone progress statistics
    const [approvedMilestones, inProgressMilestones, lockedMilestones, submittedMilestones] = await Promise.all([
      db.milestoneProgress.count({ where: { status: 'APPROVED' } }),
      db.milestoneProgress.count({ where: { status: 'IN_PROGRESS' } }),
      db.milestoneProgress.count({ where: { status: 'LOCKED' } }),
      db.milestoneProgress.count({ where: { status: 'SUBMITTED' } }),
    ])

    // Get consultant performance - sessions count and approval count
    const consultants = await db.consultantProfile.findMany({
      where: { isActive: true },
      include: {
        user: {
          select: { id: true, name: true, email: true, avatarUrl: true },
        },
        specialty: {
          select: { id: true, nameAr: true, nameEn: true },
        },
        _count: {
          select: {
            bookings: true,
            milestoneApprovals: true,
            assignedMilestones: true,
          },
        },
      },
    })

    // Get detailed performance per consultant
    const consultantPerformance = await Promise.all(
      consultants.map(async (consultant) => {
        // Count completed bookings (sessions delivered)
        const completedSessions = await db.booking.count({
          where: {
            consultantId: consultant.id,
            status: 'COMPLETED',
          },
        })

        // Count approved milestone approvals
        const approvedCount = await db.milestoneApproval.count({
          where: {
            consultantId: consultant.id,
            status: 'APPROVED',
          },
        })

        // Count pending approvals
        const pendingApprovals = await db.milestoneApproval.count({
          where: {
            consultantId: consultant.id,
            status: 'PENDING',
          },
        })

        return {
          id: consultant.id,
          user: consultant.user,
          specialty: consultant.specialty,
          rating: consultant.rating,
          totalBookings: consultant._count.bookings,
          completedSessions,
          totalApprovals: consultant._count.milestoneApprovals,
          approvedCount,
          pendingApprovals,
          assignedMilestones: consultant._count.assignedMilestones,
        }
      })
    )

    // Get recent activity - last 10 bookings
    const recentBookings = await db.booking.findMany({
      take: 10,
      orderBy: { createdAt: 'desc' },
      include: {
        consultant: {
          include: {
            user: { select: { name: true, email: true } },
          },
        },
        entrepreneur: {
          include: {
            user: { select: { name: true, email: true } },
          },
        },
      },
    })

    // Chat room statistics
    const totalChatRooms = await db.chatRoom.count()
    const totalMessages = await db.chatMessage.count()

    return createSuccessResponse({
      users: {
        total: totalUsers,
        admins: adminCount,
        consultants: consultantCount,
        entrepreneurs: entrepreneurCount,
      },
      bookings: {
        total: totalBookings,
        completed: completedBookings,
        cancelled: cancelledBookings,
      },
      milestones: {
        approved: approvedMilestones,
        inProgress: inProgressMilestones,
        locked: lockedMilestones,
        submitted: submittedMilestones,
      },
      consultantPerformance,
      recentBookings,
      chat: {
        totalRooms: totalChatRooms,
        totalMessages,
      },
    })
  } catch (error) {
    if (error instanceof Error && error.message === 'INSUFFICIENT_PERMISSIONS') {
      return createErrorResponse(error.message)
    }
    console.error('Get reports error:', error)
    return createErrorResponse('Internal server error', 500)
  }
}
