// POST /api/auth/resend-verification
// Resends the email verification link to the user

import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { createSuccessResponse, createErrorResponse } from '@/lib/middleware'
import { sendEmail, emailVerificationTemplate, generateSecureToken } from '@/lib/email'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email } = body

    if (!email || typeof email !== 'string') {
      return createErrorResponse('INVALID_INPUT')
    }

    // Always return generic success to prevent email enumeration
    const genericSuccess = createSuccessResponse({
      message: 'If an unverified account with this email exists, a verification link has been sent.',
    })

    const user = await db.user.findUnique({
      where: { email: email.trim().toLowerCase() },
    })

    // Don't reveal whether the email exists or is already verified
    if (!user || !user.isActive || user.emailVerified) {
      return genericSuccess
    }

    // Generate new verification token (expires in 24 hours)
    const verifyToken = generateSecureToken()
    const verifyExpires = new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours

    await db.user.update({
      where: { id: user.id },
      data: {
        emailVerifyToken: verifyToken,
        emailVerifyExpires: verifyExpires,
      },
    })

    // Build verification URL
    const baseUrl = process.env.NEXTAUTH_URL || process.env.DOMAIN
      ? `https://${process.env.DOMAIN}`
      : 'http://localhost:3000'
    const verificationUrl = `${baseUrl}/verify-email?token=${verifyToken}`

    // Send verification email
    const { html, text } = emailVerificationTemplate(user.name, verificationUrl)
    await sendEmail({
      to: user.email,
      subject: 'تأكيد البريد الإلكتروني - مَسَار',
      html,
      text,
    })

    return genericSuccess
  } catch (error) {
    console.error('Resend verification error:', error)
    return createSuccessResponse({
      message: 'If an unverified account with this email exists, a verification link has been sent.',
    })
  }
}
