// Middleware - Authentication and Authorization helpers
// Extracts user from JWT and provides role-based access control

import { verifyToken } from './auth'
import { db } from './db'
import { NextRequest } from 'next/server'

interface AuthUser {
  userId: string
  email: string
  role: string
  name: string
  isActive: boolean
}

/**
 * Extract the current user from the Authorization header
 * Returns null if not authenticated
 */
export async function getCurrentUser(request: NextRequest): Promise<AuthUser | null> {
  try {
    const authHeader = request.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return null
    }

    const token = authHeader.substring(7)
    const decoded = verifyToken(token)
    if (!decoded) {
      return null
    }

    // Fetch fresh user data from database
    const user = await db.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
      },
    })

    if (!user || !user.isActive) {
      return null
    }

    return {
      userId: user.id,
      email: user.email,
      role: user.role,
      name: user.name,
      isActive: user.isActive,
    }
  } catch {
    return null
  }
}

/**
 * Role-based access control wrapper
 * Returns the user if they have one of the required roles
 * Throws an error if unauthorized
 */
export function requireRole(...roles: string[]) {
  return (user: AuthUser | null): AuthUser => {
    if (!user) {
      throw new Error('AUTH_REQUIRED')
    }
    if (!roles.includes(user.role)) {
      throw new Error('INSUFFICIENT_PERMISSIONS')
    }
    return user
  }
}

/**
 * Create a standardized error response
 */
export function createErrorResponse(error: string, status: number = 400) {
  const messages: Record<string, { message: string; status: number }> = {
    AUTH_REQUIRED: { message: 'Authentication required', status: 401 },
    INSUFFICIENT_PERMISSIONS: { message: 'Insufficient permissions', status: 403 },
    INVALID_INPUT: { message: 'Invalid input data', status: 400 },
    NOT_FOUND: { message: 'Resource not found', status: 404 },
    QUOTA_EXCEEDED: { message: 'Monthly booking quota exceeded', status: 429 },
    DUPLICATE_EMAIL: { message: 'Email already registered', status: 409 },
    FILE_TOO_LARGE: { message: 'File size exceeds maximum allowed', status: 413 },
    INVALID_FILE_TYPE: { message: 'File type not allowed', status: 415 },
  }

  const errorInfo = messages[error] || { message: error, status }
  return Response.json({ success: false, error: errorInfo.message }, { status: errorInfo.status })
}

/**
 * Create a standardized success response
 */
export function createSuccessResponse(data: unknown, status: number = 200) {
  return Response.json({ success: true, data }, { status })
}
