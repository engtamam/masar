// Email Service
// Sends emails via Resend API or falls back to console logging
// Configure RESEND_API_KEY in .env for production email delivery

import { getConfig } from './config'

interface EmailPayload {
  to: string
  subject: string
  html: string
  text?: string
}

/**
 * Send an email using Resend API
 * Falls back to console logging if no API key is configured
 */
export async function sendEmail({ to, subject, html, text }: EmailPayload): Promise<boolean> {
  const resendApiKey = process.env.RESEND_API_KEY

  // If Resend API key is configured, send real email
  if (resendApiKey) {
    try {
      const platformName = await getConfig('PLATFORM_NAME') || 'Masar'
      const fromEmail = process.env.EMAIL_FROM || `noreply@${process.env.DOMAIN || 'masar.platform'}`

      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${resendApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: `${platformName} <${fromEmail}>`,
          to: [to],
          subject,
          html,
          text: text || undefined,
        }),
      })

      if (response.ok) {
        console.log(`[Email] Sent to ${to}: ${subject}`)
        return true
      }

      const error = await response.text()
      console.error(`[Email] Resend API error: ${error}`)
      return false
    } catch (error) {
      console.error('[Email] Failed to send via Resend:', error)
      return false
    }
  }

  // Fallback: log to console (development mode)
  console.log(`\n${'═'.repeat(60)}`)
  console.log(`📧 EMAIL (Console Mode - configure RESEND_API_KEY for real delivery)`)
  console.log(`${'═'.repeat(60)}`)
  console.log(`  To: ${to}`)
  console.log(`  Subject: ${subject}`)
  console.log(`  HTML: ${html.substring(0, 200)}...`)
  if (text) console.log(`  Text: ${text.substring(0, 200)}...`)
  console.log(`${'═'.repeat(60)}\n`)
  return true
}

/**
 * Generate email verification HTML template
 */
export function emailVerificationTemplate(name: string, verificationUrl: string): { html: string; text: string } {
  const html = `
    <div dir="rtl" style="font-family: 'Segoe UI', Tahoma, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; border: 1px solid #e5e7eb;">
      <div style="background: linear-gradient(135deg, #047857 0%, #0d9488 100%); padding: 32px; text-align: center;">
        <h1 style="color: #ffffff; margin: 0; font-size: 28px;">مَسَار</h1>
        <p style="color: #d1fae5; margin: 8px 0 0; font-size: 16px;">طريقك من الفكرة إلى القبول</p>
      </div>
      <div style="padding: 32px;">
        <h2 style="color: #1f2937; margin: 0 0 16px; font-size: 20px;">مرحباً ${name}! 👋</h2>
        <p style="color: #4b5563; font-size: 16px; line-height: 1.6; margin: 0 0 24px;">
          شكراً لتسجيلك في منصة مَسَار! لتأكيد حسابك والبدء في رحلتك الريادية، يرجى الضغط على الزر أدناه:
        </p>
        <div style="text-align: center; margin: 32px 0;">
          <a href="${verificationUrl}" style="background: linear-gradient(135deg, #047857 0%, #0d9488 100%); color: #ffffff; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-size: 16px; font-weight: 600; display: inline-block;">
            تأكيد البريد الإلكتروني
          </a>
        </div>
        <p style="color: #6b7280; font-size: 14px; margin: 24px 0 0;">
          أو انسخ الرابط التالي في المتصفح:<br>
          <a href="${verificationUrl}" style="color: #047857; word-break: break-all;">${verificationUrl}</a>
        </p>
        <div style="margin-top: 24px; padding: 16px; background: #f0fdf4; border-radius: 8px; border-right: 4px solid #047857;">
          <p style="color: #065f46; font-size: 13px; margin: 0;">
            ⏰ هذا الرابط صالح لمدة 24 ساعة فقط. إذا لم تطلب هذا التأكيد، يمكنك تجاهل هذه الرسالة.
          </p>
        </div>
      </div>
      <div style="background: #f9fafb; padding: 20px; text-align: center; border-top: 1px solid #e5e7eb;">
        <p style="color: #9ca3af; font-size: 12px; margin: 0;">
          © 2025 مَسَار - مبادرة مجانية لدعم رواد الأعمال الناشئين
        </p>
      </div>
    </div>
  `

  const textContent = `
مرحباً ${name}!

شكراً لتسجيلك في منصة مَسَار! لتأكيد حسابك، يرجى زيارة الرابط التالي:

${verificationUrl}

هذا الرابط صالح لمدة 24 ساعة فقط. إذا لم تطلب هذا التأكيد، يمكنك تجاهل هذه الرسالة.

- منصة مَسَار
  `

  return { html, text: textContent }
}

/**
 * Generate password reset HTML template
 */
export function passwordResetTemplate(name: string, resetUrl: string): { html: string; text: string } {
  const html = `
    <div dir="rtl" style="font-family: 'Segoe UI', Tahoma, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; border: 1px solid #e5e7eb;">
      <div style="background: linear-gradient(135deg, #047857 0%, #0d9488 100%); padding: 32px; text-align: center;">
        <h1 style="color: #ffffff; margin: 0; font-size: 28px;">مَسَار</h1>
        <p style="color: #d1fae5; margin: 8px 0 0; font-size: 16px;">طريقك من الفكرة إلى القبول</p>
      </div>
      <div style="padding: 32px;">
        <h2 style="color: #1f2937; margin: 0 0 16px; font-size: 20px;">مرحباً ${name}</h2>
        <p style="color: #4b5563; font-size: 16px; line-height: 1.6; margin: 0 0 24px;">
          تلقينا طلباً لإعادة تعيين كلمة المرور الخاصة بك. اضغط على الزر أدناه لإنشاء كلمة مرور جديدة:
        </p>
        <div style="text-align: center; margin: 32px 0;">
          <a href="${resetUrl}" style="background: linear-gradient(135deg, #047857 0%, #0d9488 100%); color: #ffffff; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-size: 16px; font-weight: 600; display: inline-block;">
            إعادة تعيين كلمة المرور
          </a>
        </div>
        <p style="color: #6b7280; font-size: 14px; margin: 24px 0 0;">
          أو انسخ الرابط التالي في المتصفح:<br>
          <a href="${resetUrl}" style="color: #047857; word-break: break-all;">${resetUrl}</a>
        </p>
        <div style="margin-top: 24px; padding: 16px; background: #fef2f2; border-radius: 8px; border-right: 4px solid #ef4444;">
          <p style="color: #991b1b; font-size: 13px; margin: 0;">
            ⚠️ إذا لم تطلب إعادة تعيين كلمة المرور، يرجى تجاهل هذه الرسالة. كلمة المرور الحالية ستظل كما هي.
          </p>
        </div>
      </div>
      <div style="background: #f9fafb; padding: 20px; text-align: center; border-top: 1px solid #e5e7eb;">
        <p style="color: #9ca3af; font-size: 12px; margin: 0;">
          © 2025 مَسَار - مبادرة مجانية لدعم رواد الأعمال الناشئين
        </p>
      </div>
    </div>
  `

  const textContent = `
مرحباً ${name}

تلقينا طلباً لإعادة تعيين كلمة المرور الخاصة بك. يرجى زيارة الرابط التالي لإنشاء كلمة مرور جديدة:

${resetUrl}

هذا الرابط صالح لمدة ساعة واحدة فقط. إذا لم تطلب إعادة تعيين كلمة المرور، يمكنك تجاهل هذه الرسالة بأمان.

- منصة مَسَار
  `

  return { html, text: textContent }
}

/**
 * Generate a secure random token for email verification or password reset
 */
export function generateSecureToken(): string {
  const { randomBytes } = require('crypto')
  return randomBytes(32).toString('hex')
}
