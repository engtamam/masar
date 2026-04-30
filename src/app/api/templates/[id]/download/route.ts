// GET /api/templates/[id]/download - Download a template file
// Increments download count and streams the file

import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser, createErrorResponse } from '@/lib/middleware'
import { readFileSync, existsSync } from 'fs'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser(request)
    if (!user) return createErrorResponse('AUTH_REQUIRED')

    const { id } = await params
    const template = await db.template.findUnique({ where: { id } })

    if (!template || !template.isActive) {
      return createErrorResponse('NOT_FOUND')
    }

    // Check file exists on disk
    if (!existsSync(template.filePath)) {
      return createErrorResponse('NOT_FOUND')
    }

    // Increment download count
    await db.template.update({
      where: { id },
      data: { downloadCount: { increment: 1 } },
    })

    // Read and return the file
    const buffer = readFileSync(template.filePath)

    return new Response(buffer, {
      status: 200,
      headers: {
        'Content-Type': template.fileType || 'application/octet-stream',
        'Content-Disposition': `attachment; filename="${encodeURIComponent(template.fileName)}"`,
        'Content-Length': buffer.length.toString(),
      },
    })
  } catch (error) {
    console.error('Download template error:', error)
    return createErrorResponse('Internal server error', 500)
  }
}
