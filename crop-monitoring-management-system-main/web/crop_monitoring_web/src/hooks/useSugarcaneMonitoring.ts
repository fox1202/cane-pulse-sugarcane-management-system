import { useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { fetchSugarcaneMonitoringRows } from '@/services/database.service'
import type { ObservationFilters, SugarcaneMonitoringRecord } from '@/types/database.types'
import { LIVE_DATA_UPDATED_EVENT } from '@/lib/liveData'

interface UseSugarcaneMonitoringOptions {
    filters?: ObservationFilters
    includeUndated?: boolean
}

export function useSugarcaneMonitoring(options?: UseSugarcaneMonitoringOptions) {
    const query = useQuery<SugarcaneMonitoringRecord[], Error>({
        queryKey: ['sugarcane-monitoring', options?.filters ?? null, options?.includeUndated === true ? 'all-rows' : 'dated-rows'],
        queryFn: () => fetchSugarcaneMonitoringRows(options?.filters, { includeUndated: options?.includeUndated }),
        staleTime: 60_000,
        refetchOnWindowFocus: false,
        refetchOnReconnect: true,
    })

    useEffect(() => {
        const handleLiveDataUpdate = () => {
            void query.refetch()
        }

        window.addEventListener(LIVE_DATA_UPDATED_EVENT, handleLiveDataUpdate)
        return () => window.removeEventListener(LIVE_DATA_UPDATED_EVENT, handleLiveDataUpdate)
    }, [query.refetch])

    return query
}
