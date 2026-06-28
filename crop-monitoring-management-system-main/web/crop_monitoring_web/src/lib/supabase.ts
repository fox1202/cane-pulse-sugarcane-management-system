import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY
export const isSupabaseDisabled = import.meta.env.VITE_SUPABASE_DISABLED === 'true'

function createDisabledSupabaseClient(): SupabaseClient {
    const disabledError = new Error('Supabase is disconnected for this system.')

    const queryProxy = new Proxy(
        {},
        {
            get(_target, property) {
                if (property === 'then') {
                    return (resolve: (value: unknown) => void) => resolve({ data: null, error: disabledError })
                }

                return () => queryProxy
            },
        }
    )

    return {
        auth: {
            getSession: async () => ({ data: { session: null }, error: null }),
            onAuthStateChange: () => ({
                data: {
                    subscription: {
                        unsubscribe: () => undefined,
                    },
                },
            }),
            signInWithPassword: async () => ({ data: { user: null, session: null }, error: disabledError }),
            signOut: async () => ({ error: null }),
            resend: async () => ({ data: null, error: disabledError }),
            resetPasswordForEmail: async () => ({ data: null, error: disabledError }),
            updateUser: async () => ({ data: { user: null }, error: disabledError }),
        },
        from: () => queryProxy,
        storage: {
            from: () => ({
                upload: async () => ({ data: null, error: disabledError }),
                getPublicUrl: () => ({ data: { publicUrl: '' } }),
            }),
        },
        channel: () => ({
            on: () => ({
                subscribe: () => ({ unsubscribe: () => undefined }),
            }),
            subscribe: () => ({ unsubscribe: () => undefined }),
            unsubscribe: () => undefined,
        }),
        removeChannel: async () => ({ error: null }),
    } as unknown as SupabaseClient
}

if (!isSupabaseDisabled && (!supabaseUrl || !supabaseAnonKey)) {
    throw new Error('Missing Supabase environment variables. Please check your .env file.')
}

export const supabase = isSupabaseDisabled
    ? createDisabledSupabaseClient()
    : createClient(supabaseUrl, supabaseAnonKey, {
        auth: {
            autoRefreshToken: true,
            persistSession: true,
            detectSessionInUrl: true,
        },
    })
