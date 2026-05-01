// GET /api/projects - List projects for current entrepreneur
// POST /api/projects - Create a new project (onboarding completion)

import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser, createSuccessResponse, createErrorResponse } from '@/lib/middleware'

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser(request)
    if (!user) {
      return createErrorResponse('AUTH_REQUIRED')
    }

    if (user.role === 'ENTREPRENEUR') {
      const profile = await db.entrepreneurProfile.findUnique({
        where: { userId: user.userId },
      })
      if (!profile) {
        return createErrorResponse('NOT_FOUND')
      }

      const projects = await db.project.findMany({
        where: { entrepreneurId: profile.id },
        include: {
          _count: {
            select: {
              milestoneProgress: true,
              bookings: true,
              files: true,
            },
          },
          milestoneProgress: {
            where: { status: 'APPROVED' },
            select: { id: true },
          },
        },
        orderBy: { createdAt: 'desc' },
      })

      // Calculate progress for each project
      const projectsWithProgress = projects.map((project) => {
        const { _count, milestoneProgress: approvedMilestones, ...rest } = project
        const totalMilestones = _count.milestoneProgress
        const completedMilestones = approvedMilestones.length
        const progress = totalMilestones > 0
          ? Math.round((completedMilestones / totalMilestones) * 100)
          : 0

        return {
          ...rest,
          milestonesTotal: totalMilestones,
          milestonesCompleted: completedMilestones,
          progress,
          bookingsCount: _count.bookings,
          filesCount: _count.files,
        }
      })

      return createSuccessResponse(projectsWithProgress)
    }

    if (user.role === 'CONSULTANT') {
      // Consultants see projects they have bookings with
      const consultantProfile = await db.consultantProfile.findUnique({
        where: { userId: user.userId },
      })
      if (!consultantProfile) {
        return createErrorResponse('NOT_FOUND')
      }

      const bookings = await db.booking.findMany({
        where: { consultantId: consultantProfile.id },
        include: {
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
        },
        orderBy: { createdAt: 'desc' },
      })

      // Unique projects
      const projectMap = new Map<string, unknown>()
      for (const booking of bookings) {
        if (booking.project && !projectMap.has(booking.project.id)) {
          projectMap.set(booking.project.id, booking.project)
        }
      }

      return createSuccessResponse(Array.from(projectMap.values()))
    }

    // Admin sees all projects
    if (user.role === 'ADMIN') {
      const projects = await db.project.findMany({
        include: {
          entrepreneur: {
            include: {
              user: {
                select: { id: true, name: true, email: true, avatarUrl: true },
              },
            },
          },
          _count: {
            select: {
              milestoneProgress: true,
              bookings: true,
              files: true,
            },
          },
          milestoneProgress: {
            where: { status: 'APPROVED' },
            select: { id: true },
          },
        },
        orderBy: { createdAt: 'desc' },
      })

      const projectsWithProgress = projects.map((project) => {
        const { _count, milestoneProgress: approvedMilestones, ...rest } = project
        const totalMilestones = _count.milestoneProgress
        const completedMilestones = approvedMilestones.length
        const progress = totalMilestones > 0
          ? Math.round((completedMilestones / totalMilestones) * 100)
          : 0

        return {
          ...rest,
          milestonesTotal: totalMilestones,
          milestonesCompleted: completedMilestones,
          progress,
          bookingsCount: _count.bookings,
          filesCount: _count.files,
        }
      })

      return createSuccessResponse(projectsWithProgress)
    }

    return createErrorResponse('INSUFFICIENT_PERMISSIONS')
  } catch (error) {
    console.error('Get projects error:', error)
    return createErrorResponse('Internal server error', 500)
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser(request)
    if (!user) {
      return createErrorResponse('AUTH_REQUIRED')
    }

    if (user.role !== 'ENTREPRENEUR') {
      return createErrorResponse('INSUFFICIENT_PERMISSIONS')
    }

    const body = await request.json()
    const { name, industry, description, stage } = body

    // Validate required fields
    if (!name || !industry || !stage) {
      return Response.json(
        { success: false, error: 'اسم المشروع والصناعة والمرحلة مطلوبة' },
        { status: 400 }
      )
    }

    // Validate stage
    const validStages = ['IDEA', 'PROTOTYPE', 'MVP', 'OPERATING', 'SCALING']
    if (!validStages.includes(stage)) {
      return Response.json(
        { success: false, error: 'مرحلة المشروع غير صالحة' },
        { status: 400 }
      )
    }

    // Get entrepreneur profile
    const profile = await db.entrepreneurProfile.findUnique({
      where: { userId: user.userId },
    })
    if (!profile) {
      return createErrorResponse('NOT_FOUND')
    }

    // Create project with milestones in a transaction
    const result = await db.$transaction(async (tx) => {
      // Create project
      const project = await tx.project.create({
        data: {
          entrepreneurId: profile.id,
          name,
          industry,
          description: description || null,
          stage,
          status: 'ACTIVE',
          onboardingCompleted: true,
        },
      })

      // Create milestone progress for this project (all LOCKED, then unlock first)
      const milestoneDefaults = await tx.milestoneDefault.findMany({
        where: { isActive: true },
        orderBy: { sortOrder: 'asc' },
      })

      for (let i = 0; i < milestoneDefaults.length; i++) {
        await tx.milestoneProgress.create({
          data: {
            projectId: project.id,
            milestoneDefaultId: milestoneDefaults[i].id,
            status: i === 0 ? 'IN_PROGRESS' : 'LOCKED',
            startedAt: i === 0 ? new Date() : null,
          },
        })
      }

      // Find a consultant for the first milestone specialty and create chat room
      if (milestoneDefaults.length > 0) {
        const firstMilestone = milestoneDefaults[0]
        const assignedConsultant = await tx.consultantProfile.findFirst({
          where: {
            specialtyId: firstMilestone.specialtyId,
            isActive: true,
            user: { isActive: true },
          },
          include: { user: true },
        })

        if (assignedConsultant) {
          // Check if a direct chat room already exists between these two users
          const existingRoom = await tx.chatRoom.findFirst({
            where: {
              type: 'DIRECT',
              members: {
                every: {
                  userId: { in: [user.userId, assignedConsultant.userId] },
                },
              },
            },
          })

          if (!existingRoom) {
            const chatRoom = await tx.chatRoom.create({
              data: {
                name: `${user.name} - ${assignedConsultant.user?.name || 'Consultant'}: ${firstMilestone.titleEn}`,
                type: 'DIRECT',
                members: {
                  create: [
                    { userId: user.userId, role: 'member' },
                    { userId: assignedConsultant.userId, role: 'member' },
                  ],
                },
              },
            })

            // Send welcome message from consultant
            await tx.chatMessage.create({
              data: {
                chatRoomId: chatRoom.id,
                senderId: assignedConsultant.userId,
                content: `مرحباً ${user.name}! أنا مستشارك لمرحلة "${firstMilestone.titleAr}". لا تتردد في التواصل معي بأي استفسار.`,
              },
            })
          }
        }
      }

      return { project, milestonesCreated: milestoneDefaults.length }
    })

    return createSuccessResponse(result, 201)
  } catch (error) {
    console.error('Create project error:', error)
    return createErrorResponse('Internal server error', 500)
  }
}
