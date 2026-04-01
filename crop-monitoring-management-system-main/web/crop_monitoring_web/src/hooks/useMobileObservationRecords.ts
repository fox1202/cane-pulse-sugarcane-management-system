import { useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { fetchMobileObservationRecords } from '@/services/database.service'
import type { MobileObservationRecord } from '@/services/database.service'
import { LIVE_DATA_UPDATED_EVENT } from '@/lib/liveData'

interface UseMobileObservationRecordsOptions {
    includeUndated?: boolean
}

export function useMobileObservationRecords(options?: UseMobileObservationRecordsOptions) {
    const query = useQuery<MobileObservationRecord[], Error>({
        queryKey: ['mobile-observation-records', options?.includeUndated === true ? 'all-rows' : 'dated-rows'],
        queryFn: () => fetchMobileObservationRecords(options),
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
