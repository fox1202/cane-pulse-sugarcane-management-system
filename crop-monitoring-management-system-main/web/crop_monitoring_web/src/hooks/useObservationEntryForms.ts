import { useQuery } from '@tanstack/react-query'
import { fetchObservationEntryForms } from '@/services/database.service'
import type { ObservationEntryForm } from '@/types/database.types'

export function useObservationEntryForms() {
    return useQuery<ObservationEntryForm[], Error>({
        queryKey: ['observation-entry-forms'],
        queryFn: fetchObservationEntryForms,
        staleTime: 60_000,
        refetchOnWindowFocus: false,
        refetchOnReconnect: true,
        refetchInterval: false,
    })
}
