import type { UserRole } from '@/types/auth.types'

export function hasAdminLevelAccess(role?: UserRole | null): boolean {
  return role === 'admin' || role === 'supervisor'
}

export function canAccessRoles(
  role: UserRole | null | undefined,
  allowedRoles?: UserRole[]
): boolean {
  if (!allowedRoles) return true
  if (!role) return false

  if (allowedRoles.includes(role)) return true

  // Temporary elevation: supervisor can access all admin-only sections.
  if (role === 'supervisor' && allowedRoles.includes('admin')) {
    return true
  }

  return false
}
