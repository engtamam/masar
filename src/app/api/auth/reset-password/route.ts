// POST /api/auth/reset-password
// Resets user password using a valid reset token

import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { hashPassword } from '@/lib/auth'
import { createSuccessResponse, createErrorResponse } from '@/lib/middleware'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { token, password } = body

    if (!token || !password) {
      return createErrorResponse('INVALID_INPUT')
    }

    if (password.length < 6) {
      return Response.json(
        { success: false, error: 'Password must be at least 6 characters' },
        { status: 400 }
      )
    }

    // Find user with this reset token that hasn't expired
    const user = await db.user.findFirst({
      where: {
        passwordResetToken: token,
        passwordResetExpires: { gt: new Date() },
        isActive: true,
      },
    })

    if (!user) {
      return Response.json(
        { success: false, error: 'Invalid or expired reset token' },
        { status: 400 }
      )
    }

    // Hash new password and clear reset token
    const passwordHash = await hashPassword(password)

    await db.user.update({
      where: { id: user.id },
      data: {
        passwordHash,
        passwordResetToken: null,
        passwordResetExpires: null,
      },
    })

    return createSuccessResponse({
      message: 'Password has been reset successfully. You can now log in with your new password.',
    })
  } catch (error) {
    console.error('Reset password error:', error)
    return createErrorResponse('Internal server error', 500)
  }
}
