// GET /api/files/[id] - Download file (with decryption for encrypted files)
// DELETE /api/files/[id] - Delete file

import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser, createSuccessResponse, createErrorResponse } from '@/lib/middleware'
import { decryptFile } from '@/lib/encryption'
import { readFileSync, unlinkSync, existsSync } from 'fs'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser(request)
    if (!user) {
      return createErrorResponse('AUTH_REQUIRED')
    }

    const { id } = await params

    const file = await db.uploadedFile.findUnique({
      where: { id },
      include: {
        milestoneProgress: {
          include: {
            entrepreneur: {
              include: { user: { select: { id: true } } },
            },
          },
        },
        entrepreneur: true,
      },
    })

    if (!file) {
      return createErrorResponse('NOT_FOUND')
    }

    // Verify access: admin, uploader, or the entrepreneur who owns the file
    const isOwner = user.role === 'ENTREPRENEUR' && file.entrepreneur?.userId === user.userId
    const isConsultantAssigned = user.role === 'CONSULTANT' && file.milestoneProgress
    const isAdmin = user.role === 'ADMIN'
    const isUploader = file.uploadedBy === user.userId

    if (!isOwner && !isConsultantAssigned && !isAdmin && !isUploader) {
      return createErrorResponse('INSUFFICIENT_PERMISSIONS')
    }

    // Read file from disk
    if (!existsSync(file.filePath)) {
      return createErrorResponse('NOT_FOUND')
    }

    let fileBuffer = readFileSync(file.filePath)

    // Decrypt if encrypted
    if (file.isEncrypted && file.encryptionKeyRef) {
      fileBuffer = await decryptFile(fileBuffer, file.encryptionKeyRef)
    }

    // Return file as download
    return new Response(fileBuffer, {
      headers: {
        'Content-Type': file.mimeType,
        'Content-Disposition': `attachment; filename="${file.originalName}"`,
        'Content-Length': fileBuffer.length.toString(),
      },
    })
  } catch (error) {
    console.error('Download file error:', error)
    return createErrorResponse('Internal server error', 500)
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser(request)
    if (!user) {
      return createErrorResponse('AUTH_REQUIRED')
    }

    const { id } = await params

    const file = await db.uploadedFile.findUnique({
      where: { id },
    })

    if (!file) {
      return createErrorResponse('NOT_FOUND')
    }

    // Only admin or the uploader can delete files
    const isAdmin = user.role === 'ADMIN'
    const isUploader = file.uploadedBy === user.userId

    if (!isAdmin && !isUploader) {
      return createErrorResponse('INSUFFICIENT_PERMISSIONS')
    }

    // Delete file from disk
    if (existsSync(file.filePath)) {
      unlinkSync(file.filePath)
    }

    // Delete file record from database
    await db.uploadedFile.delete({
      where: { id },
    })

    return createSuccessResponse({ message: 'File deleted successfully' })
  } catch (error) {
    console.error('Delete file error:', error)
    return createErrorResponse('Internal server error', 500)
  }
}
