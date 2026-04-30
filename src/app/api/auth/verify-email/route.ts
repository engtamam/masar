// POST /api/auth/verify-email
// Verifies a user's email address using a verification token

import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { createSuccessResponse, createErrorResponse } from '@/lib/middleware'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { token } = body

    if (!token) {
      return createErrorResponse('INVALID_INPUT')
    }

    // Find user with this verification token that hasn't expired
    const user = await db.user.findFirst({
      where: {
        emailVerifyToken: token,
        emailVerifyExpires: { gt: new Date() },
      },
    })

    if (!user) {
      return Response.json(
        { success: false, error: 'Invalid or expired verification token' },
        { status: 400 }
      )
    }

    // Mark email as verified and clear token
    await db.user.update({
      where: { id: user.id },
      data: {
        emailVerified: true,
        emailVerifyToken: null,
        emailVerifyExpires: null,
      },
    })

    return createSuccessResponse({
      message: 'Email verified successfully!',
      email: user.email,
    })
  } catch (error) {
    console.error('Email verification error:', error)
    return createErrorResponse('Internal server error', 500)
  }
}
