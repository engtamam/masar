// POST /api/auth/login
// Authenticate user and return JWT token

import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { verifyPassword, generateToken } from '@/lib/auth'
import { createSuccessResponse, createErrorResponse } from '@/lib/middleware'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, password } = body

    // Validate required fields
    if (!email || !password) {
      return createErrorResponse('INVALID_INPUT')
    }

    // Find user by email
    const user = await db.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        name: true,
        passwordHash: true,
        role: true,
        isActive: true,
        avatarUrl: true,
        phone: true,
        consultantProfile: true,
        entrepreneurProfile: true,
      },
    })

    if (!user) {
      return Response.json(
        { success: false, error: 'Invalid email or password' },
        { status: 401 }
      )
    }

    if (!user.isActive) {
      return Response.json(
        { success: false, error: 'Account is deactivated' },
        { status: 403 }
      )
    }

    // Verify password
    const isValid = await verifyPassword(password, user.passwordHash)
    if (!isValid) {
      return Response.json(
        { success: false, error: 'Invalid email or password' },
        { status: 401 }
      )
    }

    // Generate JWT token
    const token = await generateToken({
      userId: user.id,
      email: user.email,
      role: user.role,
    })

    // Log the login session (non-blocking, don't fail login if this fails)
    db.loginSession.create({
      data: {
        userId: user.id,
        userAgent: request.headers.get('user-agent') || null,
        ipAddress: request.headers.get('x-forwarded-for') || null,
      },
    }).catch(() => {
      // Ignore session logging failures - they shouldn't block login
    })

    // Build user response
    const userResponse: Record<string, unknown> = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      avatarUrl: user.avatarUrl,
      phone: user.phone,
    }

    if (user.consultantProfile) {
      userResponse.consultantProfile = user.consultantProfile
    }

    if (user.entrepreneurProfile) {
      userResponse.entrepreneurProfile = user.entrepreneurProfile
    }

    return createSuccessResponse({
      token,
      user: userResponse,
    })
  } catch (error) {
    console.error('Login error:', error)
    return createErrorResponse('Internal server error', 500)
  }
}
