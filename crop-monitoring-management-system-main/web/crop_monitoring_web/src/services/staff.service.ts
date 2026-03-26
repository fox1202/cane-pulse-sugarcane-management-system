import { supabase } from '@/lib/supabase'
import type { Profile } from '@/types/database.types'

const PROFILE_SELECT = 'id, first_name, last_name, email, role, status, created_at'

function normalizeProfile(row: Record<string, unknown>): Profile {
    return {
        id: String(row.id || ''),
        first_name: String(row.first_name || ''),
        last_name: String(row.last_name || ''),
        email: String(row.email || ''),
        role: (row.role as Profile['role']) || 'collector',
        status: (row.status as Profile['status']) || 'pending',
        created_at: String(row.created_at || ''),
    }
}

function getAuthRedirectTo(path: string) {
    return `${window.location.origin}${path}`
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
    role: 'admin' | 'supervisor'
}) {
    const email = data.email.trim().toLowerCase()
    const password = data.password
    const firstName = data.first_name.trim()
    const lastName = data.last_name.trim()
    const fullName = `${firstName} ${lastName}`.trim()

    if (!email || !password || !firstName || !lastName) {
        throw new Error('Complete all required sign-up fields first.')
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
                role: data.role,
                status: 'pending',
            },
        },
    })

    if (signUpError) {
        throw signUpError
    }

    const userId = signUpData.user?.id

    if (userId) {
        const profilePayload = {
            id: userId,
            email,
            first_name: firstName,
            last_name: lastName,
            role: data.role,
            status: 'pending',
        }

        const { error: profileInsertError } = await supabase
            .from('profiles')
            .upsert(profilePayload, { onConflict: 'id' })

        if (profileInsertError) {
            const { error: rpcError } = await supabase.rpc('create_user_with_profile', {
                user_email: email,
                user_password: password,
                first_name: firstName,
                last_name: lastName,
                user_role: data.role,
                user_status: 'pending',
            })

            if (rpcError) {
                await supabase.auth.signOut().catch(() => undefined)
                throw new Error(
                    'The auth account was created, but the matching profile row could not be created automatically. ' +
                    'Run the Supabase profile setup SQL or approve the user with the admin script.'
                )
            }
        }
    }

    await supabase.auth.signOut().catch(() => undefined)
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
    const { data, error } = await supabase
        .from('profiles')
        .update({
            status,
            role,
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

    const { data, error } = await supabase
        .from('profiles')
        .update({ role: newRole })
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
