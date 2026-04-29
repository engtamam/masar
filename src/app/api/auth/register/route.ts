// POST /api/auth/register
// Register a new entrepreneur account

import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { hashPassword, generateToken } from '@/lib/auth'
import { createSuccessResponse, createErrorResponse } from '@/lib/middleware'
import { getConfigNumber } from '@/lib/config'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, email, password, projectName } = body

    // Validate required fields
    if (!name || !email || !password) {
      return createErrorResponse('INVALID_INPUT')
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return createErrorResponse('INVALID_INPUT')
    }

    // Validate password length
    if (password.length < 6) {
      return Response.json(
        { success: false, error: 'Password must be at least 6 characters' },
        { status: 400 }
      )
    }

    // Check for duplicate email
    const existingUser = await db.user.findUnique({ where: { email } })
    if (existingUser) {
      return createErrorResponse('DUPLICATE_EMAIL')
    }

    // Hash password
    const passwordHash = await hashPassword(password)

    // Get default quota
    const defaultQuota = await getConfigNumber('DEFAULT_MONTHLY_QUOTA')
    const currentMonth = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`

    // Create user with entrepreneur profile, quota, and milestone progress in a transaction
    const result = await db.$transaction(async (tx) => {
      // Create user
      const user = await tx.user.create({
        data: {
          email,
          name,
          passwordHash,
          role: 'ENTREPRENEUR',
          isActive: true,
        },
      })

      // Create entrepreneur profile
      const profile = await tx.entrepreneurProfile.create({
        data: {
          userId: user.id,
          projectName: projectName || null,
        },
      })

      // Create quota
      await tx.quota.create({
        data: {
          entrepreneurId: profile.id,
          monthlyBookingLimit: defaultQuota,
          bookingsUsedThisMonth: 0,
          currentMonth,
          isExempted: false,
        },
      })

      // Create milestone progress (first UNLOCKED, rest LOCKED)
      const milestoneDefaults = await tx.milestoneDefault.findMany({
        where: { isActive: true },
        orderBy: { sortOrder: 'asc' },
      })

      for (let i = 0; i < milestoneDefaults.length; i++) {
        await tx.milestoneProgress.create({
          data: {
            entrepreneurId: profile.id,
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
        })

        if (assignedConsultant) {
          const chatRoom = await tx.chatRoom.create({
            data: {
              name: `${name} - ${assignedConsultant.user?.name || 'Consultant'}: ${firstMilestone.titleEn}`,
              type: 'DIRECT',
              members: {
                create: [
                  { userId: user.id, role: 'member' },
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
              content: `Welcome ${name}! I am your consultant for the "${firstMilestone.titleEn}" milestone. Feel free to reach out with any questions.`,
            },
          })
        }
      }

      return { user, profile }
    })

    // Generate JWT token
    const token = await generateToken({
      userId: result.user.id,
      email: result.user.email,
      role: result.user.role,
    })

    return createSuccessResponse({
      token,
      user: {
        id: result.user.id,
        name: result.user.name,
        email: result.user.email,
        role: result.user.role,
      },
    }, 201)
  } catch (error) {
    console.error('Registration error:', error)
    return createErrorResponse('Internal server error', 500)
  }
}
