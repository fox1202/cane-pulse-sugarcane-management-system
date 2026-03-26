import { useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { fetchObservations } from '@/services/database.service'
import { LIVE_DATA_UPDATED_EVENT } from '@/lib/liveData'
import type { FullObservation, ObservationFilters } from '@/types/database.types'

export function useObservations(filters?: ObservationFilters) {
    const query = useQuery<FullObservation[], Error>({
        queryKey: ['observations', filters],
        queryFn: () => {
            console.warn('⚠️ useObservations: Database disconnected - returning empty data')
            return fetchObservations(filters)
        },
        staleTime: 10 * 1000,
        refetchOnWindowFocus: false,
        refetchOnReconnect: false,
        refetchInterval: false,
    })

    useEffect(() => {
        const handleLiveDataUpdate = () => {
            void query.refetch()
        }

        window.addEventListener(LIVE_DATA_UPDATED_EVENT, handleLiveDataUpdate)
        return () => window.removeEventListener(LIVE_DATA_UPDATED_EVENT, handleLiveDataUpdate)
    }, [query.refetch])
    
    if (query.data) {
        console.log('📡 useObservations: Data loaded with', query.data.length, 'observations')
    }
    if (query.error) {
        console.error('📡 useObservations: Error loading data:', query.error)
    }
    
    return query
}
