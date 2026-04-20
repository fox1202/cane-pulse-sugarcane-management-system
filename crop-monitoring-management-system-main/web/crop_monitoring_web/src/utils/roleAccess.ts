import type { UserRole } from '@/types/auth.types'

export const SUPERUSER_EMAIL = 'silentabrahamganda02@gmail.com'

export type AppPermission =
  | 'accessBackend'
  | 'approveUsers'
  | 'manageFields'
  | 'backupData'
  | 'viewSupervisorInputs'
  | 'addData'
  | 'uploadFiles'
  | 'viewData'
  | 'downloadCsv'
  | 'downloadFieldData'
  | 'downloadSoilResults'

const ADMIN_PERMISSIONS = [
  'accessBackend',
  'approveUsers',
  'manageFields',
  'backupData',
  'viewSupervisorInputs',
  'addData',
  'uploadFiles',
  'viewData',
  'downloadCsv',
  'downloadFieldData',
  'downloadSoilResults',
] as const satisfies readonly AppPermission[]

const SUPERVISOR_PERMISSIONS = [
  'addData',
  'uploadFiles',
  'viewData',
  'downloadCsv',
  'downloadFieldData',
  'downloadSoilResults',
] as const satisfies readonly AppPermission[]

const COLLECTOR_PERMISSIONS = [
  'viewData',
  'downloadCsv',
  'downloadFieldData',
  'downloadSoilResults',
] as const satisfies readonly AppPermission[]

const ROLE_PERMISSIONS: Record<UserRole, readonly AppPermission[]> = {
  admin: ADMIN_PERMISSIONS,
  supervisor: SUPERVISOR_PERMISSIONS,
  collector: COLLECTOR_PERMISSIONS,
}

export const ROLE_LABELS: Record<UserRole, string> = {
  admin: 'Superuser',
  supervisor: 'Supervisor',
  collector: 'User',
}

export function normalizeEmail(value?: string | null): string {
  return String(value ?? '').trim().toLowerCase()
}

export function isSuperuserEmail(email?: string | null): boolean {
  return normalizeEmail(email) === SUPERUSER_EMAIL
}

export function resolveUserRole(role?: UserRole | null, email?: string | null): UserRole {
  if (isSuperuserEmail(email)) {
    return 'admin'
  }

  if (role === 'admin') {
    return 'supervisor'
  }

  return role ?? 'collector'
}

export function hasAdminLevelAccess(role?: UserRole | null, email?: string | null): boolean {
  return resolveUserRole(role, email) === 'admin'
}

export function hasPermission(
  role: UserRole | null | undefined,
  permission: AppPermission
): boolean {
  if (!role) return false
  return ROLE_PERMISSIONS[role].includes(permission)
}

export function canAccessRoles(
  role: UserRole | null | undefined,
  allowedRoles?: readonly UserRole[],
  email?: string | null
): boolean {
  if (!allowedRoles) return true
  if (!role) return false

  return allowedRoles.includes(resolveUserRole(role, email))
}

export function getRoleLabel(role?: UserRole | string | null): string {
  if (role === 'admin' || role === 'supervisor' || role === 'collector') {
    return ROLE_LABELS[role]
  }

  return 'User'
}
