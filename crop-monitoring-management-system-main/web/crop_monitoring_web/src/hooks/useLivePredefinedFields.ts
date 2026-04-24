import { useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { LIVE_DATA_UPDATED_EVENT } from '@/lib/liveData'
import {
    fetchLivePredefinedFields,
    type PredefinedField,
} from '@/services/database.service'

export const LIVE_PREDEFINED_FIELDS_QUERY_KEY = ['live-predefined-fields'] as const

interface UseLivePredefinedFieldsOptions {
    enabled?: boolean
    staleTime?: number
}

export function useLivePredefinedFields(options?: UseLivePredefinedFieldsOptions) {
    const query = useQuery<PredefinedField[], Error>({
        queryKey: LIVE_PREDEFINED_FIELDS_QUERY_KEY,
        queryFn: fetchLivePredefinedFields,
        enabled: options?.enabled,
        staleTime: options?.staleTime ?? 60_000,
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
