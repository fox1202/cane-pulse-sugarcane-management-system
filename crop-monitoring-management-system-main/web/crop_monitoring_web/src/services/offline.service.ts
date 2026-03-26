import { openDB, DBSchema, IDBPDatabase } from 'idb'
import type { FullObservation } from '@/types/database.types'

interface CropMonitoringDB extends DBSchema {
    observations: {
        key: string
        value: FullObservation
    }
    metadata: {
        key: string
        value: {
            lastSync: string
        }
    }
}

const DB_NAME = 'crop-monitoring-db'
const DB_VERSION = 1

let dbInstance: IDBPDatabase<CropMonitoringDB> | null = null

async function getDB(): Promise<IDBPDatabase<CropMonitoringDB>> {
    if (dbInstance) return dbInstance

    dbInstance = await openDB<CropMonitoringDB>(DB_NAME, DB_VERSION, {
        upgrade(db) {
            // Create observations store
            if (!db.objectStoreNames.contains('observations')) {
                db.createObjectStore('observations', { keyPath: 'id' })
            }

            // Create metadata store
            if (!db.objectStoreNames.contains('metadata')) {
                db.createObjectStore('metadata')
            }
        },
    })

    return dbInstance
}

/**
 * Cache observations in IndexedDB for offline access
 */
export async function cacheObservations(observations: FullObservation[]): Promise<void> {
    try {
        const db = await getDB()
        const tx = db.transaction('observations', 'readwrite')

        await Promise.all([
            ...observations.map(obs => tx.store.put(obs)),
            tx.done,
        ])

        // Update last sync timestamp
        await db.put('metadata', { lastSync: new Date().toISOString() }, 'lastSync')
    } catch (error) {
        console.error('Error caching observations:', error)
        throw error
    }
}

/**
 * Retrieve cached observations from IndexedDB
 */
export async function getCachedObservations(): Promise<FullObservation[]> {
    try {
        const db = await getDB()
        return await db.getAll('observations')
    } catch (error) {
        console.error('Error retrieving cached observations:', error)
        return []
    }
}

/**
 * Get last sync timestamp
 */
export async function getLastSyncTime(): Promise<string | null> {
    try {
        const db = await getDB()
        const metadata = await db.get('metadata', 'lastSync')
        return metadata?.lastSync || null
    } catch (error) {
        console.error('Error getting last sync time:', error)
        return null
    }
}

/**
 * Clear all cached data
 */
export async function clearCache(): Promise<void> {
    try {
        const db = await getDB()
        const tx = db.transaction(['observations', 'metadata'], 'readwrite')

        await Promise.all([
            tx.objectStore('observations').clear(),
            tx.objectStore('metadata').clear(),
            tx.done,
        ])
    } catch (error) {
        console.error('Error clearing cache:', error)
        throw error
    }
}

/**
 * Check if we're online
 */
export function isOnline(): boolean {
    return navigator.onLine
}
