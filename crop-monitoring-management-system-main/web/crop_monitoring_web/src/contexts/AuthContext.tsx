import React, { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { AuthUser, AuthState, LoginCredentials } from '@/types/auth.types'
import { User } from '@supabase/supabase-js'
import { resolveUserRole } from '@/utils/roleAccess'

interface AuthContextType extends AuthState {
    signIn: (credentials: LoginCredentials) => Promise<void>
    signOut: () => Promise<void>
    resendConfirmationEmail: (email: string) => Promise<void>
    resetPassword: (email: string) => Promise<void>
    updatePassword: (password: string) => Promise<void>
    uploadProfilePhoto: (file: File) => Promise<string>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

function getUserRole(user: User): AuthUser['role'] {
    // Check user_metadata for role
    const role = user.user_metadata?.role || user.app_metadata?.role

    if (role === 'admin' || role === 'supervisor' || role === 'collector') {
        return role as AuthUser['role']
    }

    // Default to collector if no role specified
    return 'collector'
}

function getUserStatus(user: User): AuthUser['status'] {
    const status = user.user_metadata?.status || user.app_metadata?.status
    if (status === 'approved' || status === 'pending' || status === 'rejected') {
        return status
    }
    return 'pending'
}

function getMustChangePassword(user: User): boolean {
    return user.user_metadata?.must_change_password === true || user.user_metadata?.default_password === true
}

function mapSupabaseUser(user: User): AuthUser {
    const email = user.email || ''

    return {
        id: user.id,
        email,
        role: resolveUserRole(getUserRole(user), email),
        profile_role: undefined,
        status: getUserStatus(user),
        full_name: user.user_metadata?.full_name,
        must_change_password: getMustChangePassword(user),
        user_metadata: user.user_metadata,
    }
}

function normalizeProfileStatus(status?: string | null): AuthUser['status'] {
    const normalizedStatus = String(status ?? '').trim().toLowerCase()

    if (normalizedStatus === 'approved' || normalizedStatus === 'pending' || normalizedStatus === 'rejected') {
        return normalizedStatus
    }

    return 'pending'
}

type ProfileRecord = {
    id: string
    email?: string | null
    first_name?: string | null
    last_name?: string | null
    role?: string | null
    status?: string | null
    avatar_url?: string | null
    picture?: string | null
    image_url?: string | null
    photo_url?: string | null
}

function mapProfileUser(user: User, profile: ProfileRecord): AuthUser {
    const email = profile.email || user.email || ''
    const status = normalizeProfileStatus(profile.status)
    const firstName = profile.first_name?.trim() ?? ''
    const lastName = profile.last_name?.trim() ?? ''

    return {
        id: user.id,
        email,
        role: resolveUserRole(profile.role, email),
        profile_role: profile.role?.trim() || undefined,
        status,
        full_name: `${firstName} ${lastName}`.trim(),
        avatar_url: profile.avatar_url?.trim() || undefined,
        picture: profile.picture?.trim() || undefined,
        image_url: profile.image_url?.trim() || undefined,
        photo_url: profile.photo_url?.trim() || undefined,
        must_change_password: getMustChangePassword(user),
        user_metadata: {
            ...user.user_metadata,
            avatar_url: profile.avatar_url?.trim() || user.user_metadata?.avatar_url,
            picture: profile.picture?.trim() || user.user_metadata?.picture,
            image_url: profile.image_url?.trim() || user.user_metadata?.image_url,
            photo_url: profile.photo_url?.trim() || user.user_metadata?.photo_url,
        },
    }
}

function isMissingProfileError(error: unknown) {
    const message = error instanceof Error ? error.message : String(error)
    return /0 rows|no rows|pgrst116/i.test(message)
}

async function fetchProfileRecord(userId: string): Promise<ProfileRecord | null> {
    const { data, error } = await supabase
        .from('profiles')
        .select('id, email, first_name, last_name, role, status, avatar_url, picture, image_url, photo_url')
        .eq('id', userId)
        .maybeSingle()

    if (error) {
        if (isMissingProfileError(error)) {
            return null
        }

        throw error
    }

    return data as ProfileRecord | null
}

function getAuthRedirectTo(path: string) {
    return `${window.location.origin}${path}`
}

function isEmailConfirmationError(error: unknown) {
    const message = error instanceof Error ? error.message : String(error)
    return /email(?: address)? not confirmed/i.test(message)
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [authState, setAuthState] = useState<AuthState>({
        user: null,
        isLoading: true,
        isAuthenticated: false,
    })

    useEffect(() => {
        let active = true

        const syncSession = async (sessionUser: User | null) => {
            if (!active) return

            if (!sessionUser) {
                setAuthState({
                    user: null,
                    isLoading: false,
                    isAuthenticated: false,
                })
                return
            }

            try {
                const profile = await fetchProfileRecord(sessionUser.id)
                if (!active) return

                if (!profile || normalizeProfileStatus(profile.status) !== 'approved') {
                    await supabase.auth.signOut().catch(() => undefined)
                    if (!active) return

                    setAuthState({
                        user: null,
                        isLoading: false,
                        isAuthenticated: false,
                    })
                    return
                }

                setAuthState({
                    user: mapProfileUser(sessionUser, profile),
                    isLoading: false,
                    isAuthenticated: true,
                })
            } catch (error) {
                console.warn('Falling back to session metadata because the profile lookup failed.', error)
                if (!active) return

                setAuthState({
                    user: mapSupabaseUser(sessionUser),
                    isLoading: false,
                    isAuthenticated: true,
                })
            }
        }

        supabase.auth.getSession().then(({ data: { session } }) => {
            void syncSession(session?.user ?? null)
        })

        const refreshProfileFromDatabase = async () => {
            const { data: { session } } = await supabase.auth.getSession()
            void syncSession(session?.user ?? null)
        }

        const refreshVisibleProfile = () => {
            if (document.visibilityState === 'visible') {
                void refreshProfileFromDatabase()
            }
        }

        window.addEventListener('focus', refreshProfileFromDatabase)
        document.addEventListener('visibilitychange', refreshVisibleProfile)

        // Listen for auth changes
        const {
            data: { subscription },
        } = supabase.auth.onAuthStateChange((_event, session) => {
            void syncSession(session?.user ?? null)
        })

        return () => {
            active = false
            window.removeEventListener('focus', refreshProfileFromDatabase)
            document.removeEventListener('visibilitychange', refreshVisibleProfile)
            subscription.unsubscribe()
        }
    }, [])

    const signIn = async (credentials: LoginCredentials) => {
        const { data, error } = await supabase.auth.signInWithPassword(credentials)
        if (error) {
            if (isEmailConfirmationError(error)) {
                throw new Error('Email not confirmed. Check your inbox for the confirmation link or resend it below.')
            }

            throw error
        }

        if (data.user) {
            const profile = await fetchProfileRecord(data.user.id)

            if (!profile) {
                await supabase.auth.signOut()
                throw new Error('Profile not found. Please contact support.')
            }

            const profileStatus = normalizeProfileStatus(profile.status)

            if (profileStatus !== 'approved') {
                await supabase.auth.signOut() // Kill the session
                const statusMsg = profileStatus === 'pending'
                    ? 'Your account is pending approval. Please contact the administrator.'
                    : 'Your account request was rejected.'
                throw new Error(statusMsg)
            }

            setAuthState({
                user: mapProfileUser(data.user, profile),
                isLoading: false,
                isAuthenticated: true,
            })
        }
    }

    const resendConfirmationEmail = async (email: string) => {
        const normalizedEmail = email.trim()

        if (!normalizedEmail) {
            throw new Error('Enter your email address first.')
        }

        const { error } = await supabase.auth.resend({
            type: 'signup',
            email: normalizedEmail,
            options: {
                emailRedirectTo: getAuthRedirectTo('/login'),
            },
        })

        if (error) throw error
    }

    const signOut = async () => {
        const { error } = await supabase.auth.signOut()
        if (error) throw error

        setAuthState({
            user: null,
            isLoading: false,
            isAuthenticated: false,
        })
    }

    const resetPassword = async (email: string) => {
        const redirectTo = getAuthRedirectTo('/update-password')

        const { error } = await supabase.auth.resetPasswordForEmail(email, {
            redirectTo,
        })
        if (error) throw error
    }

    const updatePassword = async (password: string) => {
        const { error } = await supabase.auth.updateUser({
            password,
            data: {
                must_change_password: false,
                default_password: false,
            },
        })
        if (error) throw error
    }

    const uploadProfilePhoto = async (file: File) => {
        const currentUser = authState.user

        if (!currentUser) {
            throw new Error('You must be logged in to upload a profile photo.')
        }

        const extension = file.name.split('.').pop()?.toLowerCase() || 'png'
        const storagePath = `${currentUser.id}/profile-${Date.now()}.${extension}`
        const { error: uploadError } = await supabase.storage
            .from('profile-photos')
            .upload(storagePath, file, {
                cacheControl: '3600',
                contentType: file.type,
                upsert: true,
            })

        if (uploadError) throw uploadError

        const { data } = supabase.storage
            .from('profile-photos')
            .getPublicUrl(storagePath)

        const publicUrl = data.publicUrl

        if (!publicUrl) {
            throw new Error('The profile photo uploaded, but no public URL was returned.')
        }

        const { error: profileError } = await supabase
            .from('profiles')
            .update({
                avatar_url: publicUrl,
                updated_at: new Date().toISOString(),
            })
            .eq('id', currentUser.id)

        if (profileError) throw profileError

        setAuthState((previous) => {
            if (!previous.user) return previous

            return {
                ...previous,
                user: {
                    ...previous.user,
                    avatar_url: publicUrl,
                    user_metadata: {
                        ...previous.user.user_metadata,
                        avatar_url: publicUrl,
                    },
                },
            }
        })

        return publicUrl
    }

    const value: AuthContextType = {
        ...authState,
        signIn,
        signOut,
        resendConfirmationEmail,
        resetPassword,
        updatePassword,
        uploadProfilePhoto,
    }

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
    const context = useContext(AuthContext)
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider')
    }
    return context
}
