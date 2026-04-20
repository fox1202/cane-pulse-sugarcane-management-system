import { supabase } from '@/lib/supabase'
import type { Profile } from '@/types/database.types'
import type { UserRole } from '@/types/auth.types'
import { isSuperuserEmail, resolveUserRole } from '@/utils/roleAccess'

const PROFILE_SELECT = 'id, first_name, last_name, email, role, status, created_at'
const REQUESTABLE_ROLES = new Set<UserRole>(['admin', 'supervisor', 'collector'])

type RequestableRole = UserRole
export type SignUpRequestResult = {
    profileProvisioned: boolean
}

function normalizeProfile(row: Record<string, unknown>): Profile {
    const email = String(row.email || '')

    return {
        id: String(row.id || ''),
        first_name: String(row.first_name || ''),
        last_name: String(row.last_name || ''),
        email,
        role: resolveUserRole((row.role as Profile['role']) || 'collector', email),
        status: (row.status as Profile['status']) || 'pending',
        created_at: String(row.created_at || ''),
    }
}

function getAuthRedirectTo(path: string) {
    return `${window.location.origin}${path}`
}

function normalizeProfileRole(role: string): UserRole {
    const normalizedRole = role.trim().toLowerCase().replace(/[\s-]+/g, '_')

    if (
        normalizedRole === 'admin' ||
        normalizedRole === 'administrator' ||
        normalizedRole === 'system_administrator'
    ) {
        return 'admin'
    }

    if (normalizedRole === 'supervisor' || normalizedRole === 'regional_supervisor') {
        return 'supervisor'
    }

    if (normalizedRole === 'collector' || normalizedRole === 'user' || normalizedRole === 'users') {
        return 'collector'
    }

    return 'collector'
}

function normalizeRequestedRole(role: string): RequestableRole {
    const normalizedRole = normalizeProfileRole(role)

    return REQUESTABLE_ROLES.has(normalizedRole) ? normalizedRole : 'supervisor'
}

function resolveRequestedRoleForEmail(role: string, email: string): RequestableRole {
    const requestedRole = normalizeRequestedRole(role)

    if (requestedRole === 'admin' && !isSuperuserEmail(email)) {
        return 'supervisor'
    }

    return requestedRole
}

function getProfileMutationError(action: string, error: unknown): Error {
    const message = error instanceof Error ? error.message : String(error)

    if (/row-level security|permission denied|not allowed|policy/i.test(message)) {
        return new Error(
            `Unable to ${action} from the web app because the current Supabase RLS policy blocked the profiles update. ` +
            'Use the admin script or add an admin update policy in Supabase.'
        )
    }

    return new Error(message)
}

async function canReadPendingProfile(userId: string): Promise<boolean> {
    const { data, error } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', userId)
        .maybeSingle()

    if (error) {
        return false
    }

    return Boolean(data?.id)
}

export async function fetchStaff(): Promise<Profile[]> {
    const { data, error } = await supabase
        .from('profiles')
        .select(PROFILE_SELECT)
        .order('created_at', { ascending: false })

    if (error) {
        throw error
    }

    return (data ?? []).map((row) => normalizeProfile(row as Record<string, unknown>))
}

export async function fetchStaffByRole(role: string): Promise<Profile[]> {
    const { data, error } = await supabase
        .from('profiles')
        .select(PROFILE_SELECT)
        .eq('role', role)
        .order('created_at', { ascending: false })

    if (error) {
        throw error
    }

    return (data ?? []).map((row) => normalizeProfile(row as Record<string, unknown>))
}

export async function requestSignUp(data: {
    email: string
    password: string
    first_name: string
    last_name: string
    role: RequestableRole
}): Promise<SignUpRequestResult> {
    const email = data.email.trim().toLowerCase()
    const password = data.password
    const firstName = data.first_name.trim()
    const lastName = data.last_name.trim()
    const fullName = `${firstName} ${lastName}`.trim()
    const requestedRole = resolveRequestedRoleForEmail(data.role, email)

    if (!email || !password || !firstName || !lastName) {
        throw new Error('Complete all required sign-up fields first.')
    }

    if (!REQUESTABLE_ROLES.has(requestedRole)) {
        throw new Error('Choose a valid requested role.')
    }

    const { data: existingProfile } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', email)
        .maybeSingle()

    if (existingProfile?.id) {
        throw new Error('A profile with this email already exists.')
    }

    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
            emailRedirectTo: getAuthRedirectTo('/login'),
            data: {
                first_name: firstName,
                last_name: lastName,
                full_name: fullName,
                role: requestedRole,
                status: 'pending',
            },
        },
    })

    if (signUpError) {
        throw signUpError
    }

    const userId = signUpData.user?.id
    let profileProvisioned = false

    if (userId) {
        const profilePayload = {
            id: userId,
            email,
            first_name: firstName,
            last_name: lastName,
            role: requestedRole,
            status: 'pending',
            is_active: false,
        }

        const { error: profileInsertError } = await supabase
            .from('profiles')
            .upsert(profilePayload, { onConflict: 'id' })

        if (!profileInsertError) {
            profileProvisioned = true
        } else {
            const { error: rpcError } = await supabase.rpc('create_pending_profile_for_auth_signup', {
                new_user_id: userId,
                user_email: email,
                profile_first_name: firstName,
                profile_last_name: lastName,
                user_role: requestedRole,
            })

            if (!rpcError) {
                profileProvisioned = true
            } else {
                profileProvisioned = await canReadPendingProfile(userId)

                if (!profileProvisioned) {
                    console.warn('Auth signup succeeded, but profile provisioning needs admin follow-up.', {
                        profileInsertError,
                        rpcError,
                    })
                }
            }
        }
    }

    await supabase.auth.signOut().catch(() => undefined)
    return { profileProvisioned }
}

export async function fetchPendingUsers(): Promise<Profile[]> {
    const { data, error } = await supabase
        .from('profiles')
        .select(PROFILE_SELECT)
        .eq('status', 'pending')
        .order('created_at', { ascending: false })

    if (error) {
        throw error
    }

    return (data ?? []).map((row) => normalizeProfile(row as Record<string, unknown>))
}

export async function updateUserStatus(
    userId: string,
    _email: string,
    role: string,
    status: 'approved' | 'rejected'
) {
    const approvedRole = resolveRequestedRoleForEmail(role, _email)
    const { data, error } = await supabase
        .from('profiles')
        .update({
            status,
            role: approvedRole,
            is_active: status === 'approved',
        })
        .eq('id', userId)
        .select(PROFILE_SELECT)
        .maybeSingle()

    if (error) {
        throw getProfileMutationError(`set the user status to ${status}`, error)
    }

    if (!data) {
        throw new Error('No profile row was updated. Check that the user exists and your admin update policy is enabled.')
    }

    return { success: true, profile: normalizeProfile(data as Record<string, unknown>) }
}

export async function updateUserRoleByEmail(email: string, newRole: string) {
    const normalizedEmail = email.trim().toLowerCase()
    const resolvedRole = resolveRequestedRoleForEmail(newRole, normalizedEmail)

    const { data, error } = await supabase
        .from('profiles')
        .update({ role: resolvedRole })
        .eq('email', normalizedEmail)
        .select(PROFILE_SELECT)
        .maybeSingle()

    if (error) {
        throw getProfileMutationError(`change the role for ${normalizedEmail}`, error)
    }

    if (!data) {
        throw new Error(`No profile row was updated for ${normalizedEmail}.`)
    }

    return normalizeProfile(data as Record<string, unknown>)
}
