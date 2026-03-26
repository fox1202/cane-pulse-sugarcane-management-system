import { useQuery } from '@tanstack/react-query'
import { fetchSugarcaneMonitoringRows } from '@/services/database.service'
import type { SugarcaneMonitoringRecord } from '@/types/database.types'

export function useSugarcaneMonitoring() {
    return useQuery<SugarcaneMonitoringRecord[], Error>({
        queryKey: ['sugarcane-monitoring'],
        queryFn: () => fetchSugarcaneMonitoringRows(),
        staleTime: 60_000,
        refetchOnWindowFocus: false,
        refetchOnReconnect: true,
    })
}
