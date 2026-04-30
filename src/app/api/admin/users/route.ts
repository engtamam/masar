// GET /api/admin/users - List all users (with pagination, filtering)
// POST /api/admin/users - Create user (admin can create consultants)
// PATCH /api/admin/users - Update user (activate/deactivate)

import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser, requireRole, createSuccessResponse, createErrorResponse } from '@/lib/middleware'
import { hashPassword } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser(request)
    if (!user) {
      return createErrorResponse('AUTH_REQUIRED')
    }

    const checkRole = requireRole('ADMIN')
    checkRole(user)

    const url = new URL(request.url)
    const page = parseInt(url.searchParams.get('page') || '1')
    const limit = parseInt(url.searchParams.get('limit') || '20')
    const role = url.searchParams.get('role')
    const search = url.searchParams.get('search')
    const isActive = url.searchParams.get('isActive')
    const skip = (page - 1) * limit

    // Build where clause
    let where: Record<string, unknown> = {}

    if (role) {
      where.role = role
    }

    if (search) {
      where.OR = [
        { name: { contains: search } },
        { email: { contains: search } },
        { phone: { contains: search } },
      ]
    }

    if (isActive !== null && isActive !== undefined) {
      where.isActive = isActive === 'true'
    }

    const [users, total] = await Promise.all([
      db.user.findMany({
        where,
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          avatarUrl: true,
          phone: true,
          isActive: true,
          createdAt: true,
          consultantProfile: {
            include: {
              specialty: true,
            },
          },
          entrepreneurProfile: {
            include: {
              quota: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      db.user.count({ where }),
    ])

    return createSuccessResponse({
      users,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    if (error instanceof Error && error.message === 'INSUFFICIENT_PERMISSIONS') {
      return createErrorResponse(error.message)
    }
    console.error('List users error:', error)
    return createErrorResponse('Internal server error', 500)
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser(request)
    if (!user) {
      return createErrorResponse('AUTH_REQUIRED')
    }

    const checkRole = requireRole('ADMIN')
    checkRole(user)

    const body = await request.json()
    const { name, email, password, role, phone, specialtyId, bio, experience } = body

    // Validate required fields
    if (!name || !email || !password || !role) {
      return createErrorResponse('INVALID_INPUT')
    }

    // Validate role
    if (!['CONSULTANT', 'ENTREPRENEUR'].includes(role)) {
      return Response.json(
        { success: false, error: 'Role must be CONSULTANT or ENTREPRENEUR' },
        { status: 400 }
      )
    }

    // Check for duplicate email
    const existingUser = await db.user.findUnique({ where: { email } })
    if (existingUser) {
      return createErrorResponse('DUPLICATE_EMAIL')
    }

    // Hash password
    const passwordHash = await hashPassword(password)

    // Create user with profile in transaction
    const result = await db.$transaction(async (tx) => {
      const newUser = await tx.user.create({
        data: {
          email,
          name,
          passwordHash,
          role,
          phone: phone || null,
          isActive: true,
        },
      })

      if (role === 'CONSULTANT') {
        if (!specialtyId) {
          throw new Error('Specialty is required for consultants')
        }

        await tx.consultantProfile.create({
          data: {
            userId: newUser.id,
            specialtyId,
            bio: bio || null,
            experience: experience || null,
            isActive: true,
          },
        })
      } else if (role === 'ENTREPRENEUR') {
        const currentMonth = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`
        const profile = await tx.entrepreneurProfile.create({
          data: {
            userId: newUser.id,
          },
        })

        // Create quota
        await tx.quota.create({
          data: {
            entrepreneurId: profile.id,
            monthlyBookingLimit: 4,
            bookingsUsedThisMonth: 0,
            currentMonth,
            isExempted: false,
          },
        })

        // Create milestone progress
        const milestoneDefaults = await tx.milestoneDefault.findMany({
          where: { isActive: true },
          orderBy: { sortOrder: 'asc' },
        })

        for (let i = 0; i < milestoneDefaults.length; i++) {
          await tx.milestoneProgress.create({
            data: {
              entrepreneurId: profile.id,
              milestoneDefaultId: milestoneDefaults[i].id,
              status: i === 0 ? 'IN_PROGRESS' : 'LOCKED',
              startedAt: i === 0 ? new Date() : null,
            },
          })
        }
      }

      return tx.user.findUnique({
        where: { id: newUser.id },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          phone: true,
          isActive: true,
          createdAt: true,
          consultantProfile: { include: { specialty: true } },
          entrepreneurProfile: true,
        },
      })
    })

    return createSuccessResponse(result, 201)
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === 'INSUFFICIENT_PERMISSIONS') {
        return createErrorResponse(error.message)
      }
      if (error.message === 'Specialty is required for consultants') {
        return Response.json(
          { success: false, error: error.message },
          { status: 400 }
        )
      }
    }
    console.error('Create user error:', error)
    return createErrorResponse('Internal server error', 500)
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const user = await getCurrentUser(request)
    if (!user) {
      return createErrorResponse('AUTH_REQUIRED')
    }

    const checkRole = requireRole('ADMIN')
    checkRole(user)

    const body = await request.json()
    const { userId, isActive, name, phone, specialtyId, bio } = body

    if (!userId) {
      return createErrorResponse('INVALID_INPUT')
    }

    const targetUser = await db.user.findUnique({ where: { id: userId } })
    if (!targetUser) {
      return createErrorResponse('NOT_FOUND')
    }

    // Update user
    const updateData: Record<string, unknown> = {}
    if (isActive !== undefined) updateData.isActive = isActive
    if (name) updateData.name = name
    if (phone !== undefined) updateData.phone = phone

    const updated = await db.user.update({
      where: { id: userId },
      data: updateData,
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        phone: true,
        isActive: true,
        updatedAt: true,
      },
    })

    // Update consultant profile if applicable
    if (targetUser.role === 'CONSULTANT' && (specialtyId || bio)) {
      const consultantUpdate: Record<string, unknown> = {}
      if (specialtyId) consultantUpdate.specialtyId = specialtyId
      if (bio) consultantUpdate.bio = bio

      await db.consultantProfile.update({
        where: { userId },
        data: consultantUpdate,
      })
    }

    return createSuccessResponse(updated)
  } catch (error) {
    if (error instanceof Error && error.message === 'INSUFFICIENT_PERMISSIONS') {
      return createErrorResponse(error.message)
    }
    console.error('Update user error:', error)
    return createErrorResponse('Internal server error', 500)
  }
}
