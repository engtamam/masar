// POST /api/auth/forgot-password
// Sends a password reset email to the user

import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { createSuccessResponse, createErrorResponse } from '@/lib/middleware'
import { sendEmail, passwordResetTemplate, generateSecureToken } from '@/lib/email'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email } = body

    if (!email || typeof email !== 'string') {
      return createErrorResponse('INVALID_INPUT')
    }

    // Always return success to prevent email enumeration
    const genericSuccess = createSuccessResponse({
      message: 'If an account with this email exists, a password reset link has been sent.',
    })

    const user = await db.user.findUnique({ where: { email: email.trim().toLowerCase() } })

    // Don't reveal whether the email exists
    if (!user || !user.isActive) {
      return genericSuccess
    }

    // Generate reset token (expires in 1 hour)
    const resetToken = generateSecureToken()
    const resetExpires = new Date(Date.now() + 60 * 60 * 1000) // 1 hour

    await db.user.update({
      where: { id: user.id },
      data: {
        passwordResetToken: resetToken,
        passwordResetExpires: resetExpires,
      },
    })

    // Build reset URL
    const baseUrl = process.env.NEXTAUTH_URL || process.env.DOMAIN
      ? `https://${process.env.DOMAIN}`
      : 'http://localhost:3000'
    const resetUrl = `${baseUrl}/reset-password?token=${resetToken}`

    // Send email
    const { html, text } = passwordResetTemplate(user.name, resetUrl)
    await sendEmail({
      to: user.email,
      subject: 'إعادة تعيين كلمة المرور - مَسَار',
      html,
      text,
    })

    return genericSuccess
  } catch (error) {
    console.error('Forgot password error:', error)
    // Still return generic success to prevent info leakage
    return createSuccessResponse({
      message: 'If an account with this email exists, a password reset link has been sent.',
    })
  }
}
