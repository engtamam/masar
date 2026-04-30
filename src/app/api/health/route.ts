// GET /api/health
// Health check endpoint for monitoring, uptime checks, and load balancers
// Returns system status, database connectivity, and basic metrics

import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { createSuccessResponse } from '@/lib/middleware'

// Track startup time for uptime calculation
const startTime = Date.now()

export async function GET(request: NextRequest) {
  const health: Record<string, unknown> = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: Math.floor((Date.now() - startTime) / 1000),
    version: process.env.npm_package_version || '1.0.0',
    environment: process.env.NODE_ENV || 'development',
  }

  // Check database connectivity
  try {
    const dbStart = Date.now()
    await db.$queryRaw`SELECT 1`
    const dbLatency = Date.now() - dbStart

    health.database = {
      status: 'connected',
      latency: `${dbLatency}ms`,
    }
  } catch (error) {
    health.database = {
      status: 'disconnected',
      error: error instanceof Error ? error.message : 'Unknown error',
    }
    health.status = 'degraded'
  }

  // Collect basic metrics
  try {
    const [userCount, milestoneCount, bookingCount] = await Promise.all([
      db.user.count(),
      db.milestoneDefault.count(),
      db.booking.count(),
    ])

    health.metrics = {
      totalUsers: userCount,
      totalMilestones: milestoneCount,
      totalBookings: bookingCount,
    }
  } catch {
    health.metrics = { error: 'Could not collect metrics' }
  }

  // System info
  health.system = {
    nodeVersion: process.version,
    platform: process.platform,
    memoryUsage: `${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)}MB / ${Math.round(process.memoryUsage().heapTotal / 1024 / 1024)}MB`,
    cpuUsage: process.cpuUsage(),
  }

  const statusCode = health.status === 'healthy' ? 200 : 503

  return Response.json(
    { success: true, data: health },
    { status: statusCode }
  )
}
