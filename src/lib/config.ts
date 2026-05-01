// Platform Configuration System
// Loads from PlatformConfig table with fallback to env vars and defaults

import { db } from '@/lib/db'

// Default configuration values
const DEFAULTS: Record<string, { value: string; type: 'STRING' | 'NUMBER' | 'BOOLEAN' | 'JSON'; description: string }> = {
  PLATFORM_NAME: { value: 'Digital Incubator', type: 'STRING', description: 'Platform display name' },
  DEFAULT_MONTHLY_QUOTA: { value: '4', type: 'NUMBER', description: 'Default monthly booking limit for entrepreneurs' },
  DEFAULT_SLOT_DURATION: { value: '30', type: 'NUMBER', description: 'Default consultation slot duration in minutes' },
  JITSI_DOMAIN: { value: '', type: 'STRING', description: 'DEPRECATED - No longer used. Video calls are now local via WebRTC' },
  ENCRYPTION_KEY: { value: 'default-encryption-key-change-me', type: 'STRING', description: 'AES encryption key for file encryption' },
  UPLOAD_MAX_SIZE_MB: { value: '10', type: 'NUMBER', description: 'Maximum file upload size in MB' },
  ALLOWED_FILE_TYPES: { value: '["pdf","doc","docx","xls","xlsx","ppt","pptx","jpg","jpeg","png","zip"]', type: 'JSON', description: 'Allowed file type extensions' },
  DEFAULT_LANGUAGE: { value: 'ar', type: 'STRING', description: 'Default platform language' },
  JWT_EXPIRY: { value: '7d', type: 'STRING', description: 'JWT token expiry duration' },
}

// In-memory cache for config values
const configCache: Map<string, { value: string; timestamp: number }> = new Map()
const CACHE_TTL = 5 * 60 * 1000 // 5 minutes

function isCacheValid(timestamp: number): boolean {
  return Date.now() - timestamp < CACHE_TTL
}

/**
 * Get a single config value by key
 * Priority: DB value > Env var > Default value
 */
export async function getConfig(key: string): Promise<string | null> {
  // Check cache first
  const cached = configCache.get(key)
  if (cached && isCacheValid(cached.timestamp)) {
    return cached.value
  }

  try {
    // Try to get from database
    const config = await db.platformConfig.findUnique({ where: { key } })
    if (config) {
      configCache.set(key, { value: config.value, timestamp: Date.now() })
      return config.value
    }
  } catch {
    // Database not available, fall through
  }

  // Try environment variable
  const envKey = key
  const envValue = process.env[envKey]
  if (envValue) {
    configCache.set(key, { value: envValue, timestamp: Date.now() })
    return envValue
  }

  // Fall back to default
  const defaultConfig = DEFAULTS[key]
  if (defaultConfig) {
    configCache.set(key, { value: defaultConfig.value, timestamp: Date.now() })
    return defaultConfig.value
  }

  return null
}

/**
 * Get a config value as a number
 */
export async function getConfigNumber(key: string): Promise<number> {
  const value = await getConfig(key)
  return value ? parseInt(value, 10) : 0
}

/**
 * Get a config value as a boolean
 */
export async function getConfigBoolean(key: string): Promise<boolean> {
  const value = await getConfig(key)
  return value === 'true' || value === '1'
}

/**
 * Get a config value as parsed JSON
 */
export async function getConfigJSON<T = unknown>(key: string): Promise<T | null> {
  const value = await getConfig(key)
  if (!value) return null
  try {
    return JSON.parse(value) as T
  } catch {
    return null
  }
}

/**
 * Get all config values from database
 */
export async function getAllConfigs() {
  try {
    return await db.platformConfig.findMany({ orderBy: { key: 'asc' } })
  } catch {
    return []
  }
}

/**
 * Set a config value in database and update cache
 */
export async function setConfig(key: string, value: string) {
  const config = await db.platformConfig.upsert({
    where: { key },
    update: { value },
    create: {
      key,
      value,
      type: DEFAULTS[key]?.type || 'STRING',
      description: DEFAULTS[key]?.description || null,
    },
  })
  // Update cache
  configCache.set(key, { value, timestamp: Date.now() })
  return config
}

/**
 * Invalidate the entire config cache
 */
export function invalidateConfigCache() {
  configCache.clear()
}

/**
 * Get the default configs for seeding
 */
export function getDefaultConfigs() {
  return Object.entries(DEFAULTS).map(([key, config]) => ({
    key,
    value: config.value,
    type: config.type as 'STRING' | 'NUMBER' | 'BOOLEAN' | 'JSON',
    description: config.description,
  }))
}
