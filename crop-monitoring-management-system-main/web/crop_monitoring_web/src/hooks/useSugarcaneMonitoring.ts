import { useQuery } from '@tanstack/react-query'
import { fetchSugarcaneMonitoringRows } from '@/services/database.service'
import type { ObservationFilters, SugarcaneMonitoringRecord } from '@/types/database.types'

interface UseSugarcaneMonitoringOptions {
    filters?: ObservationFilters
    includeUndated?: boolean
}

export function useSugarcaneMonitoring(options?: UseSugarcaneMonitoringOptions) {
    return useQuery<SugarcaneMonitoringRecord[], Error>({
        queryKey: ['sugarcane-monitoring', options?.filters ?? null, options?.includeUndated === true ? 'all-rows' : 'dated-rows'],
        queryFn: () => fetchSugarcaneMonitoringRows(options?.filters, { includeUndated: options?.includeUndated }),
        staleTime: 60_000,
        refetchOnWindowFocus: false,
        refetchOnReconnect: true,
    })
}
