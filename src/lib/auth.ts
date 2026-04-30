// Authentication System
// JWT-based auth using bcryptjs and jsonwebtoken

import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { getConfig } from './config'

const JWT_SECRET = process.env.JWT_SECRET || 'default-jwt-secret-change-me'

/**
 * Hash a plain text password
 */
export async function hashPassword(password: string): Promise<string> {
  const salt = await bcrypt.genSalt(12)
  return bcrypt.hash(password, salt)
}

/**
 * Verify a plain text password against a hash
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash)
}

/**
 * Generate a JWT token for a user
 */
export async function generateToken(payload: {
  userId: string
  email: string
  role: string
}): Promise<string> {
  const expiry = await getConfig('JWT_EXPIRY') || '7d'
  return jwt.sign(payload, JWT_SECRET, { expiresIn: expiry as string })
}

/**
 * Verify and decode a JWT token
 * Returns the decoded payload or null if invalid
 */
export function verifyToken(token: string): {
  userId: string
  email: string
  role: string
} | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as {
      userId: string
      email: string
      role: string
    }
    return decoded
  } catch {
    return null
  }
}
