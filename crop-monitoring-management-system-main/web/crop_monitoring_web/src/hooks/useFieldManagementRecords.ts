import { useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
    fetchSugarcaneMonitoringObservations,
    type MobileObservationRecord,
} from '@/services/database.service'
import { LIVE_DATA_UPDATED_EVENT } from '@/lib/liveData'

export function useFieldManagementRecords() {
    const query = useQuery<MobileObservationRecord[], Error>({
        queryKey: ['field-records', 'sugarcane_field_management'],
        queryFn: () => fetchSugarcaneMonitoringObservations(),
        staleTime: 10 * 1000,
        refetchOnWindowFocus: false,
        refetchOnReconnect: true,
        refetchInterval: false,
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
