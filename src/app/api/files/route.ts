// POST /api/files - Upload file (with encryption for Data Room milestone)
// GET /api/files - List files for project/milestone

import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser, createSuccessResponse, createErrorResponse } from '@/lib/middleware'
import { getConfigNumber, getConfigJSON } from '@/lib/config'
import { encryptFile, generateKeyRef } from '@/lib/encryption'
import { writeFileSync, mkdirSync, existsSync } from 'fs'
import { join } from 'path'
import { v4 as uuidv4 } from 'uuid'

const UPLOAD_DIR = '/home/z/my-project/upload'

function ensureUploadDir() {
  if (!existsSync(UPLOAD_DIR)) {
    mkdirSync(UPLOAD_DIR, { recursive: true })
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser(request)
    if (!user) {
      return createErrorResponse('AUTH_REQUIRED')
    }

    const formData = await request.formData()
    const file = formData.get('file') as File | null
    const milestoneProgressId = formData.get('milestoneProgressId') as string | null
    const projectId = formData.get('projectId') as string | null
    const shouldEncrypt = formData.get('encrypt') as string | null

    if (!file) {
      return createErrorResponse('INVALID_INPUT')
    }

    // Check file size
    const maxSizeMB = await getConfigNumber('UPLOAD_MAX_SIZE_MB')
    const maxSizeBytes = maxSizeMB * 1024 * 1024
    if (file.size > maxSizeBytes) {
      return createErrorResponse('FILE_TOO_LARGE')
    }

    // Check file type
    const allowedTypes = await getConfigJSON<string[]>('ALLOWED_FILE_TYPES')
    const fileExt = file.name.split('.').pop()?.toLowerCase()
    if (allowedTypes && fileExt && !allowedTypes.includes(fileExt)) {
      return createErrorResponse('INVALID_FILE_TYPE')
    }

    // Read file buffer
    const buffer = Buffer.from(await file.arrayBuffer())

    // Determine if file should be encrypted
    // Data Room milestone files should always be encrypted
    let isEncrypted = false
    let encryptionKeyRef: string | null = null
    let fileBuffer: Buffer = buffer

    if (shouldEncrypt === 'true') {
      isEncrypted = true
      const keyRef = generateKeyRef(uuidv4())
      encryptionKeyRef = keyRef
      fileBuffer = await encryptFile(buffer, keyRef)
    }

    // Also encrypt if it's a Data Room milestone
    if (milestoneProgressId) {
      const progress = await db.milestoneProgress.findUnique({
        where: { id: milestoneProgressId },
        include: { milestoneDefault: true },
      })
      if (progress?.milestoneDefault.titleEn === 'Data Room' && !isEncrypted) {
        isEncrypted = true
        const keyRef = generateKeyRef(uuidv4())
        encryptionKeyRef = keyRef
        fileBuffer = await encryptFile(buffer, keyRef)
      }
    }

    // Generate unique filename
    const uniqueName = `${uuidv4()}.${fileExt}`
    const filePath = join(UPLOAD_DIR, uniqueName)

    // Save file to disk
    ensureUploadDir()
    writeFileSync(filePath, fileBuffer)

    // Create file record in database
    const uploadedFile = await db.uploadedFile.create({
      data: {
        milestoneProgressId: milestoneProgressId || null,
        projectId: projectId || null,
        uploadedBy: user.userId,
        fileName: uniqueName,
        originalName: file.name,
        filePath,
        fileSize: file.size,
        mimeType: file.type || 'application/octet-stream',
        isEncrypted,
        encryptionKeyRef,
      },
    })

    return createSuccessResponse(uploadedFile, 201)
  } catch (error) {
    console.error('Upload file error:', error)
    return createErrorResponse('Internal server error', 500)
  }
}

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser(request)
    if (!user) {
      return createErrorResponse('AUTH_REQUIRED')
    }

    const url = new URL(request.url)
    const milestoneProgressId = url.searchParams.get('milestoneProgressId')
    const projectId = url.searchParams.get('projectId')

    let where: Record<string, unknown> = {}

    if (milestoneProgressId) {
      where.milestoneProgressId = milestoneProgressId
    }

    if (projectId) {
      where.projectId = projectId
    }

    // Entrepreneurs can only see files from their own projects
    if (user.role === 'ENTREPRENEUR') {
      const profile = await db.entrepreneurProfile.findUnique({
        where: { userId: user.userId },
      })
      if (profile) {
        const projectIds = await db.project.findMany({
          where: { entrepreneurId: profile.id },
          select: { id: true },
        })
        where.projectId = { in: projectIds.map((p) => p.id) }
      }
    }

    const files = await db.uploadedFile.findMany({
      where,
      include: {
        uploader: {
          select: { id: true, name: true, avatarUrl: true },
        },
        milestoneProgress: {
          include: {
            milestoneDefault: {
              select: { id: true, titleEn: true, titleAr: true },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    return createSuccessResponse(files)
  } catch (error) {
    console.error('List files error:', error)
    return createErrorResponse('Internal server error', 500)
  }
}
