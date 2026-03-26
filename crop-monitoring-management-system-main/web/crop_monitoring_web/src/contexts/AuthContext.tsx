import React, { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { AuthUser, AuthState, LoginCredentials } from '@/types/auth.types'
import { User } from '@supabase/supabase-js'

interface AuthContextType extends AuthState {
    signIn: (credentials: LoginCredentials) => Promise<void>
    signOut: () => Promise<void>
    resendConfirmationEmail: (email: string) => Promise<void>
    resetPassword: (email: string) => Promise<void>
    updatePassword: (password: string) => Promise<void>
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

function mapSupabaseUser(user: User): AuthUser {
    return {
        id: user.id,
        email: user.email || '',
        role: getUserRole(user),
        status: getUserStatus(user),
        full_name: user.user_metadata?.full_name,
        user_metadata: user.user_metadata,
    }
}

type ProfileRecord = {
    id: string
    email: string
    first_name: string
    last_name: string
    role: AuthUser['role']
    status: AuthUser['status']
}

function mapProfileUser(user: User, profile: ProfileRecord): AuthUser {
    return {
        id: user.id,
        email: profile.email || user.email || '',
        role: profile.role,
        status: profile.status,
        full_name: `${profile.first_name} ${profile.last_name}`.trim(),
        user_metadata: user.user_metadata,
    }
}

function isMissingProfileError(error: unknown) {
    const message = error instanceof Error ? error.message : String(error)
    return /0 rows|no rows|pgrst116/i.test(message)
}

async function fetchProfileRecord(userId: string): Promise<ProfileRecord | null> {
    const { data, error } = await supabase
        .from('profiles')
        .select('id, email, first_name, last_name, role, status')
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

                if (!profile || profile.status !== 'approved') {
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

        // Listen for auth changes
        const {
            data: { subscription },
        } = supabase.auth.onAuthStateChange((_event, session) => {
            void syncSession(session?.user ?? null)
        })

        return () => {
            active = false
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

            if (profile.status !== 'approved') {
                await supabase.auth.signOut() // Kill the session
                const statusMsg = profile.status === 'pending'
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
        const { error } = await supabase.auth.updateUser({ password })
        if (error) throw error
    }

    const value: AuthContextType = {
        ...authState,
        signIn,
        signOut,
        resendConfirmationEmail,
        resetPassword,
        updatePassword,
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
