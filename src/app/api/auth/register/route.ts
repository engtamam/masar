// POST /api/auth/register
// Register a new entrepreneur account
// No longer creates milestones — those are created when a project is created via onboarding

import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { hashPassword, generateToken } from '@/lib/auth'
import { createSuccessResponse, createErrorResponse } from '@/lib/middleware'
import { getConfigNumber } from '@/lib/config'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, email, password } = body

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

    // Create user with entrepreneur profile and quota (NO milestones — created with project)
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

      // Create entrepreneur profile (empty — no project data here)
      const profile = await tx.entrepreneurProfile.create({
        data: {
          userId: user.id,
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
