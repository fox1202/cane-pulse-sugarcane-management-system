import { useEffect, useRef } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { LIVE_DATA_TABLES, LIVE_DATA_UPDATED_EVENT } from '@/lib/liveData'

export function LiveQuerySync() {
    const queryClient = useQueryClient()
    const refreshTimerRef = useRef<number | null>(null)

    useEffect(() => {
        const scheduleRefresh = () => {
            if (refreshTimerRef.current !== null) {
                window.clearTimeout(refreshTimerRef.current)
            }

            refreshTimerRef.current = window.setTimeout(() => {
                queryClient.invalidateQueries({ queryKey: ['observations'] })
                queryClient.invalidateQueries({ queryKey: ['sugarcane-monitoring'] })
                queryClient.invalidateQueries({ queryKey: ['mobile-observation-records'] })
                queryClient.invalidateQueries({ queryKey: ['dashboard-sugarcane-analytics'] })
                queryClient.invalidateQueries({ queryKey: ['observation-entry-forms'] })

                window.dispatchEvent(new CustomEvent(LIVE_DATA_UPDATED_EVENT))
                refreshTimerRef.current = null
            }, 250)
        }

        let channel = supabase.channel('dashboard-live-query-sync')

        LIVE_DATA_TABLES.forEach((table) => {
            channel = channel.on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table,
                },
                scheduleRefresh
            )
        })

        channel.subscribe((status) => {
            if (status === 'CHANNEL_ERROR') {
                console.warn('Supabase realtime sync channel failed to connect.')
            }
        })

        return () => {
            if (refreshTimerRef.current !== null) {
                window.clearTimeout(refreshTimerRef.current)
            }

            void supabase.removeChannel(channel)
        }
    }, [queryClient])

    return null
}
