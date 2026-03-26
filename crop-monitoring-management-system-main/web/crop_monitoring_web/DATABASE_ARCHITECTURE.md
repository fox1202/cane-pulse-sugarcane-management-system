# Crop Monitoring System - Database Architecture & Connection Layer

Complete architectural overview of how the web app connects to Supabase database, including data flow, relationships, and real-time features.

---

## 1. DATABASE TABLES & SCHEMA

### 1.1 Core Tables Overview

#### **Authentication & Users**

| Table | Purpose | Location |
|-------|---------|----------|
| `auth.users` | Supabase Auth (managed by Supabase) | Built-in |
| `public.profiles` | User profiles linked to Auth | [create_profiles_table.sql](supabase/create_profiles_table.sql) |
| `public.login_details` | Legacy login credentials (alternative) | [create_login_details_table.sql](supabase/create_login_details_table.sql) |

#### **Field & Location Data**

| Table | Purpose | Location |
|-------|---------|----------|
| `public.fields` | Predefined field registry (collectors select from this) | [seed_fields.sql](supabase/seed_fields.sql) |
| `public.blocks` | Field blocks/sections (geographic areas) | Referenced in SQL scripts |

#### **Observation Data**

| Table | Purpose | Location |
|-------|---------|----------|
| `public.observations` | Main observation record with basic info | Database schema |
| `public.observation_entry_form` | Mobile form submissions | [create_observation_entry_form_trigger.sql](supabase/create_observation_entry_form_trigger.sql) |
| `public.sugarcane_monitoring` | Analysis table for sugarcane monitoring | [create_sugarcane_monitoring_table.sql](supabase/create_sugarcane_monitoring_table.sql) |

#### **Observation Detail Tables** (JOIN to observations via `observation_id`)

| Table | Fields |
|-------|--------|
| `public.crop_information` | crop_type, variety, ratoon_number, crop_stage, planting_date, expected_harvest_date |
| `public.crop_monitoring` | crop_vigor, canopy_cover, stress, remarks |
| `public.soil_characteristics` | soil_type, soil_texture, soil_ph, organic_matter, drainage_class |
| `public.irrigation_management` | irrigation_type, irrigation_date, irrigation_volume, soil_moisture_percentage, water_source |
| `public.nutrient_management` | fertilizer_type, application_date, application_rate, npk_ratio |
| `public.crop_protection` | weed_type, weed_level, pest_type, pest_severity, disease_type, disease_severity, remarks |
| `public.control_methods` | weed_control, pest_control, disease_control |
| `public.harvest` (aka `harvest_information`) | harvest_date, yield, harvest_method |
| `public.residual_management` | residue_type, management_method, remarks |
| `public.images` (aka `observation_images`) | observation_id, image_url, storage_path, taken_at, uploaded_by |

---

### 1.2 Detailed Table Schemas

#### **profiles Table**
```sql
-- Primary Key: id (UUID, references auth.users)
-- Relationships: One-to-One with auth.users
id UUID PRIMARY KEY (auth.users)
first_name TEXT NOT NULL
last_name TEXT NOT NULL
email TEXT UNIQUE NOT NULL
role TEXT CHECK (role IN ('collector', 'supervisor', 'admin'))
status TEXT CHECK (status IN ('pending', 'approved', 'rejected'))
is_active BOOLEAN DEFAULT true
phone TEXT
department TEXT
notes TEXT
created_at TIMESTAMPTZ DEFAULT now()
updated_at TIMESTAMPTZ (auto-updated by trigger)

-- Indexes
idx_profiles_email
idx_profiles_status
idx_profiles_role

-- RLS Policies
- Users can view their own profile
- Admins can view all profiles
- Users can update their own profile
```

#### **observations Table** (Master Observation)
```sql
-- Primary Key: id (UUID)
-- Referenced by all detail tables via observation_id
id UUID PRIMARY KEY
client_uuid TEXT
collector_id TEXT -- FK to profiles.id
section_name TEXT
block_id TEXT
field_name TEXT
latitude DOUBLE PRECISION
longitude DOUBLE PRECISION
gps_accuracy NUMERIC
date_recorded TIMESTAMPTZ NOT NULL
created_at TIMESTAMPTZ DEFAULT now()
updated_at TIMESTAMPTZ (auto-updated)

-- Indexes
idx_observations_date_recorded
idx_observations_field_name
idx_observations_collector_id
```

#### **observation_entry_form Table** (Mobile Form)
```sql
-- Primary Key: id (INTEGER or UUID)
-- Alternative data source for observations
-- Unlike observations, this is a denormalized single-row entry form
id INTEGER/UUID PRIMARY KEY
client_uuid TEXT
collector_id TEXT
selected_field TEXT
section_name TEXT
field_name TEXT
block_id TEXT
block_size NUMERIC
spatial_data JSONB
latitude DOUBLE PRECISION
longitude DOUBLE PRECISION
gps_accuracy NUMERIC

-- Crop Information
date_recorded TIMESTAMPTZ
crop_class TEXT
variety TEXT
planting_date DATE
cutting_date DATE
expected_harvest_date DATE

-- Soil & Environmental
soil_type TEXT
soil_ph NUMERIC
irrigation_type TEXT
water_source TEXT
tamm_area NUMERIC

-- Advanced Monitoring
crop_vigor TEXT
canopy_cover NUMERIC
stress TEXT
yield NUMERIC
remarks TEXT

created_at TIMESTAMPTZ DEFAULT now()
updated_at TIMESTAMPTZ (auto-updated by trigger)
```

#### **sugarcane_monitoring Table** (Analysis Table)
```sql
-- Denormalized table optimized for analytics
-- Direct data entry or aggregated from observations
id UUID PRIMARY KEY
field_name TEXT
section_name TEXT
block_id TEXT
latitude DOUBLE PRECISION
longitude DOUBLE PRECISION
date_recorded TIMESTAMPTZ

-- Crop Info
crop_type TEXT (default 'Sugarcane')
variety TEXT
ratoon_number INTEGER
crop_stage TEXT
planting_date DATE
expected_harvest_date DATE

-- Monitoring Data
crop_vigor TEXT
canopy_cover NUMERIC
stress TEXT
soil_type TEXT
soil_ph NUMERIC
organic_matter NUMERIC
irrigation_type TEXT
water_source TEXT
soil_moisture_percentage NUMERIC
weed_level TEXT
pest_severity TEXT
disease_severity TEXT
yield NUMERIC
harvest_date DATE
harvest_method TEXT

collector_id TEXT
remarks TEXT
image_url TEXT
created_at TIMESTAMPTZ DEFAULT now()
updated_at TIMESTAMPTZ (auto-updated)

-- Indexes
idx_sugarcane_field_name
idx_sugarcane_date_recorded
idx_sugarcane_variety
idx_sugarcane_crop_stage
idx_sugarcane_yield
```

#### **fields Table** (Predefined Field Registry)
```sql
id UUID PRIMARY KEY DEFAULT gen_random_uuid()
field_name TEXT UNIQUE NOT NULL
section_name TEXT NOT NULL
block_id TEXT NOT NULL
latitude DOUBLE PRECISION NOT NULL
longitude DOUBLE PRECISION NOT NULL
geom JSONB (GeoJSON geometry)
created_at TIMESTAMPTZ DEFAULT now()
updated_at TIMESTAMPTZ (auto-updated)
```

---

### 1.3 Data Relationships

```
auth.users (Supabase managed)
    ↓ (links via id)
    └─→ profiles
          ├─ one-to-many → observations (via collector_id)
          ├─ one-to-many → observation_entry_form (via collector_id)
          └─ one-to-many → sugarcane_monitoring (via collector_id)

observations (Master record)
    ├─ one-to-one → crop_information (observation_id FK)
    ├─ one-to-one → crop_monitoring (observation_id FK)
    ├─ one-to-one → soil_characteristics (observation_id FK)
    ├─ one-to-one → irrigation_management (observation_id FK)
    ├─ one-to-one → nutrient_management (observation_id FK)
    ├─ one-to-one → crop_protection (observation_id FK)
    ├─ one-to-one → control_methods (observation_id FK)
    ├─ one-to-one → harvest_information (observation_id FK)
    ├─ one-to-one → residual_management (observation_id FK)
    └─ one-to-many → observation_images (observation_id FK)

fields
    └─ referenced by observations (field_name) and observation_entry_form (field_name)
```

**Key: Rows with observation_id reference should only have ONE record per observation**

---

## 2. CONNECTION LAYER

### 2.1 Supabase Client Configuration

**File**: [src/lib/supabase.ts](src/lib/supabase.ts)

```typescript
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
        autoRefreshToken: true,      // Auto-refresh sessions
        persistSession: true,         // Store session in localStorage
        detectSessionInUrl: true,     // Watch for auth URL params
    },
})
```

**Configuration File**: [supabase/config.toml](supabase/config.toml)

```toml
[api]
port = 54321
max_rows = 1000                    # Limit on query results
schemas = ["public", "graphql_public"]

[db]
port = 54322
major_version = 17                 # PostgreSQL 17

[db.pooler]
enabled = false                    # Connection pooling disabled locally
pool_mode = "transaction"          # When enabled: transaction-mode pooling
default_pool_size = 20             # Max connections per user/db
max_client_conn = 100              # Max client connections
```

### 2.2 Authentication Flow

**File**: [src/contexts/AuthContext.tsx](src/contexts/AuthContext.tsx)

```
User Login
    ↓
supabase.auth.signInWithPassword()
    ↓
Verify in Supabase Auth (auth.users table)
    ↓
Fetch Profile from profiles table (get role, status, approval)
    ↓
Check status === 'approved'
    ↓
If not approved → signOut() + throw error
    ↓
If approved → Store in AuthContext + localStorage
    ↓
Can now make authenticated API calls
```

**Key Functions**:
- `signIn(LoginCredentials)` - Authenticate user, fetch profile, verify approval
- `signOut()` - Clear auth state
- `resetPassword(email)` - Send password reset link
- `updatePassword(password)` - Change password (must be authenticated)
- `resendConfirmationEmail(email)` - Resend signup confirmation

**Session Persistence**:
- Session stored in localStorage (via `persistSession: true`)
- Auto-refreshed on app startup (via `getSession()`)
- Listeners watch for auth changes (`onAuthStateChange`)

### 2.3 Row Level Security (RLS) Policies

All tables have RLS enabled. Examples:

**profiles Table**:
- SELECT: Users view own profile OR admins view all
- UPDATE: Users update own profile only

**sugarcane_monitoring Table**:
- SELECT/INSERT/UPDATE: Authenticated users (permissive for analysis)

**observation_entry_form Table**:
- Policies configured per deployment requirements

---

## 3. DATA FLOW ARCHITECTURE

### 3.1 Complete User Journey: View Observations Example

```
┌─────────────────────────────────────────────────────────────────┐
│ UI LAYER: Component                                             │
│  SugarcaneMonitoringPage.tsx                                    │
│  - Page loads, calls useObservations()                          │
└────────────────────┬────────────────────────────────────────────┘
                     ↓
┌─────────────────────────────────────────────────────────────────┐
│ HOOKS LAYER: Data Management                                    │
│  useObservations(filters?) [src/hooks/useObservations.ts]      │
│  - Initializes TanStack React Query                            │
│  - queryKey: ['observations', filters]                          │
│  - staleTime: 10 seconds (refetch after stale)                 │
│  - Sets up refetchOnWindowFocus, refetchOnReconnect            │
│  - Listens for LIVE_DATA_UPDATED_EVENT custom event            │
└────────────────────┬────────────────────────────────────────────┘
                     ↓
┌─────────────────────────────────────────────────────────────────┐
│ SERVICE LAYER: Database Operations                              │
│  fetchObservations(filters?) [src/services/database.service.ts] │
│                                                                 │
│  1. Build query builder:                                        │
│     supabase.from('observations').select(`id, collector_id,     │
│       field_name, date_recorded,                               │
│       crop_information(*), crop_monitoring(*),                 │
│       soil_characteristics(*), ...`)                           │
│                                                                 │
│  2. Apply filters (if provided):                               │
│     .eq('field_name', filter.field)                            │
│     .gte('date_recorded', filter.startDate)                    │
│     .lte('date_recorded', filter.endDate)                      │
│                                                                 │
│  3. Order & execute:                                           │
│     .order('date_recorded', { ascending: false })              │
│     .limit(1000)                                               │
└────────────────────┬────────────────────────────────────────────┘
                     ↓
┌─────────────────────────────────────────────────────────────────┐
│ DATABASE: Supabase (Remote)                                     │
│  - Execute SELECT from observations table                       │
│  - JOIN crop_information, crop_monitoring, etc.                │
│  - Return results as JSON                                      │
└────────────────────┬────────────────────────────────────────────┘
                     ↓
┌─────────────────────────────────────────────────────────────────┐
│ SERVICE LAYER: Transform Data                                   │
│  transformFullObservation()                                     │
│  - Map DB rows to FullObservation type                         │
│  - Extract nested relationships                                │
│  - Handle null/undefined fields                                │
└────────────────────┬────────────────────────────────────────────┘
                     ↓
┌─────────────────────────────────────────────────────────────────┐
│ HOOKS LAYER: Cache & Subscribe                                  │
│  useObservations()                                              │
│  - React Query caches results                                  │
│  - Set up real-time listeners via Supabase Realtime            │
└────────────────────┬────────────────────────────────────────────┘
                     ↓
┌─────────────────────────────────────────────────────────────────┐
│ UI LAYER: Re-render                                             │
│  SugarcaneMonitoringPage.tsx                                    │
│  - Receive data: query.data (FullObservation[])                │
│  - Map to table rows, charts, analytics                        │
│  - Display to user                                              │
└─────────────────────────────────────────────────────────────────┘
```

### 3.2 File Locations by Step

| Step | Primary File | Secondary Files |
|------|--------------|-----------------|
| UI Component | [src/pages/SugarcaneMonitoringPage.tsx](src/pages/SugarcaneMonitoringPage.tsx) | [src/components/Dashboard/](src/components/Dashboard/) |
| Hook/Query | [src/hooks/useObservations.ts](src/hooks/useObservations.ts) | [src/lib/liveData.ts](src/lib/liveData.ts) |
| Service/Database | [src/services/database.service.ts](src/services/database.service.ts) (lines 1195-1421) | Types: [src/types/database.types.ts](src/types/database.types.ts) |
| Types | [src/types/database.types.ts](src/types/database.types.ts) | [src/types/auth.types.ts](src/types/auth.types.ts) |
| DB Connection | [src/lib/supabase.ts](src/lib/supabase.ts) | - |

### 3.3 Alternative Data Flow: Create/Update Observation

```
Form Input
    ↓
validateObservationData()
    ↓
createObservation(observation: FullObservation) or
updateObservation(observation: FullObservation)
    ↓
Map to observation_entry_form table (denormalized single row)
    ↓
INSERT/UPDATE supabase.from('observation_entry_form').insert/update()
    ↓
Trigger updates timestamp via trigger function
    ↓
Realtime: LiveQuerySync detects change via postgres_changes event
    ↓
Emit custom event: window.dispatchEvent(new CustomEvent(LIVE_DATA_UPDATED_EVENT))
    ↓
useObservations() listener catches event
    ↓
queryClient.invalidateQueries() forces refetch
    ↓
UI updates with new data
```

---

## 4. SERVICE LAYER

### 4.1 Database Service: [database.service.ts](src/services/database.service.ts)

**Purpose**: Central hub for all database operations. Handles CRUD, filtering, transformations.

#### **Field Operations**
```typescript
fetchPredefinedFields(): PredefinedField[]
  - Fetches from fields table or hardcoded fallback
  - Used by mobile form dropdowns
  - Location: lines 100-170

getPredefinedFieldByName(fieldName: string): PredefinedField | undefined
  - Lookup single field from predefined list
  - Location: lines 174-189
```

#### **Observation Queries**
```typescript
fetchObservations(filters?: ObservationFilters): FullObservation[]
  - Queries: observations table + all detail tables (JOINs)
  - Filters: field_name, date_recorded range, collector_id
  - Returns fully hydrated FullObservation objects
  - Location: lines 1195-1421
  - Used by: useObservations hook → pages

fetchObservationById(id: string): FullObservation | null
  - Single observation with all details
  - Location: lines 1423-1467

fetchMobileObservationRecords(): MobileObservationRecord[]
  - Queries from observation_entry_form table
  - Location: lines 1062-1161
  - Returns merged view of both normalized & denormalized data
```

#### **Sugarcane Monitoring Queries**
```typescript
fetchSugarcaneMonitoringRows(filters?): SugarcaneMonitoringRecord[]
  - Direct from sugarcane_monitoring table (analytics)
  - Location: lines 611-650

fetchSugarcaneMonitoringObservations(filters?): MobileObservationRecord[]
  - Hydrated from observations + details
  - Location: lines 651-960
```

#### **Create/Update/Delete Operations**
```typescript
createObservation(observation: FullObservation): FullObservation
  - INSERT into observations + detail tables
  - Generates UUID, sets timestamps
  - Location: lines 1638-1778

updateMobileObservationRecord(record: FullObservation): void
  - UPDATE observation_entry_form
  - Location: lines 2025-2113

updateObservation(observation: FullObservation): void
  - UPDATE observations + all detail tables
  - Location: lines 2115-2222

deleteObservation(id: string): void
  - DELETE observation + cascade to all detail tables
  - Location: lines 1469-1561

deleteMobileObservationRecord(record: FullObservation): void
  - DELETE from observation_entry_form
  - Location: lines 1563-1590

deleteAllObservations(): { deletedCount: number }
  - Bulk delete (debug only)
  - Location: lines 1592-1636
```

#### **Observation Entry Form Operations**
```typescript
fetchObservationEntryForms(): ObservationEntryForm[]
  - All forms from observation_entry_form table
  - Location: lines 2533-2721

createObservationEntryFormSubmission(data: ObservationEntryFormSubmissionInput): void
  - NEW observation_entry_form row
  - Location: lines 2810-2824

updateObservationEntryFormSubmission(id: string, data: Partial<...>): void
  - UPDATE observation_entry_form
  - Location: lines 2723-2808

bulkCreateObservationEntryFormSubmissions(rows: ObservationEntryImportRow[]): ObservationEntryBulkImportResult
  - Batch INSERT from CSV import
  - Location: lines 2826+
```

#### **Analytic/Reporting Functions**
```typescript
fetchAllCropInformation(): CropInformation[]
fetchAllCropMonitoring(): CropMonitoring[]
fetchAllSoilCharacteristics(): SoilCharacteristics[]
fetchAllIrrigationManagement(): IrrigationManagement[]
fetchAllNutrientManagement(): NutrientManagement[]
fetchAllCropProtection(): CropProtection[]
fetchAllControlMethods(): ControlMethods[]
fetchAllHarvestInformation(): HarvestInformation[]
fetchAllResidualManagement(): ResidualManagement[]
fetchAllObservationImages(): ObservationImage[]
  - Individual detail tables (for analysis exports)
  - Location: lines 2240-2410

fetchAllData(): AllDataCollectionResult
  - All tables combined (debug/export)
  - Location: lines 2410-2532
```

### 4.2 Staff Service: [staff.service.ts](src/services/staff.service.ts)

**Purpose**: Staff/profile management.

```typescript
fetchStaff(): Profile[]                           // All staff
fetchStaffByRole(role: string): Profile[]         // Filtered by role
requestSignUp(data: SignupData): AuthData         // User signup request
fetchPendingUsers(): Profile[]                    // Pending approvals
updateUserStatus(userId, email, role, status)    // Approve/reject users
updateStaffProfile(userId, updates)               // Update profile info
```

### 4.3 Email Service: [email.service.ts](src/services/email.service.ts)

**Purpose**: Sendgrid integration for notifications.

```typescript
sendSignUpNotification(data: SignupEmail): void
sendApprovalEmail(email: string, userName: string): void
```

### 4.4 Offline Service: [offline.service.ts](src/services/offline.service.ts)

**Purpose**: IndexedDB caching for offline access.

```typescript
cacheObservations(observations: FullObservation[]): void
  - Store in IndexedDB for offline access

getCachedObservations(): FullObservation[]
  - Retrieve cached data locally

getLastSyncTime(): string | null
  - Get last sync timestamp

clearCache(): void
  - Clear all cached data
```

---

## 5. REAL-TIME FEATURES

### 5.1 Real-time Subscription: LiveQuerySync Component

**File**: [src/components/LiveQuerySync.tsx](src/components/LiveQuerySync.tsx)

```typescript
export function LiveQuerySync() {
    // 1. Listen to Supabase Realtime on LIVE_DATA_TABLES
    supabase.channel('dashboard-live-query-sync')
        .on('postgres_changes', {
            event: '*',              // Listen: INSERT, UPDATE, DELETE
            schema: 'public',
            table: tableName,        // For each monitored table
        }, () => scheduleRefresh())
        .subscribe()

    // 2. Debounce refresh (250ms timer prevents thrashing)
    const scheduleRefresh = () => {
        clearTimeout(refreshTimerRef.current)
        refreshTimerRef.current = setTimeout(() => {
            // 3. Invalidate React Query caches
            queryClient.invalidateQueries(['observations'])
            queryClient.invalidateQueries(['sugarcane-monitoring'])
            queryClient.invalidateQueries(['mobile-observation-records'])
            queryClient.invalidateQueries(['dashboard-sugarcane-analytics'])
            queryClient.invalidateQueries(['observation-entry-forms'])

            // 4. Dispatch custom event
            window.dispatchEvent(new CustomEvent(LIVE_DATA_UPDATED_EVENT))
        }, 250)
    }
}
```

**Monitored Tables** [src/lib/liveData.ts](src/lib/liveData.ts):
```typescript
const LIVE_DATA_TABLES = [
    'sugarcane_monitoring',
    'observation_entry_form',
    'observations',
    'fields',
    'blocks',
    'crop_information',
    'crop_monitoring',
    'soil_characteristics',
    'irrigation_management',
    'nutrient_management',
    'crop_protection',
    'control_methods',
    'harvest',
    'residual_management',
    'images',
]
```

### 5.2 Hook-level Subscriptions

**In useObservations** [src/hooks/useObservations.ts](src/hooks/useObservations.ts):

```typescript
// React Query configuration
useQuery({
    queryKey: ['observations', filters],
    queryFn: () => fetchObservations(filters),
    staleTime: 10 * 1000,              // Data stale after 10s
    refetchOnWindowFocus: true,        // Refetch on window focus
    refetchOnReconnect: true,          // Refetch when connection restored
    refetchInterval: 10 * 1000,        // Polling every 10s
})

// Custom event listener
useEffect(() => {
    window.addEventListener('dashboard:live-data-updated', () => {
        void query.refetch()           // Manual refetch on event
    })
}, [query.refetch])
```

### 5.3 Polling Mechanisms

| Hook | Stale Time | Poll Interval | Refetch Trigger |
|------|-----------|---------------|-----------------|
| useObservations | 10s | 10s | WindowFocus, Reconnect, CustomEvent |
| useObservationEntryForms | 60s | 30s | WindowFocus, Reconnect |
| useSugarcaneMonitoring | 30s | ∞ | WindowFocus, Reconnect |
| useExcelAnalytics | 10s | 10s | WindowFocus, Reconnect, CustomEvent |

### 5.4 Cache Invalidation Pattern

```
Event: Data changes in DB (INSERT/UPDATE/DELETE)
    ↓
Supabase Realtime detects postgres_changes event
    ↓
LiveQuerySync.tsx receives event
    ↓
scheduleRefresh() - Debounced 250ms
    ↓
queryClient.invalidateQueries(queryKey)
    ↓
React Query marks data as stale
    ↓
Hook refetches automatically
    ↓
useObservations() gets fresh data
    ↓
UI re-renders with new data
```

### 5.5 Offline Support

**IndexedDB Caching**:
- `cacheObservations()` stores observations locally → `observation_entry_form` backup
- `getCachedObservations()` retrieves on network failure
- Last sync timestamp tracked for sync awareness
- Clear cache on manual user action

---

## 6. DATA RELATIONSHIPS & JOINS

### 6.1 Foreign Key Relationships

```
profiles (id: UUID)
    └─ references auth.users(id) ON DELETE CASCADE

observations (id: UUID)
    └─ references profiles(id) via collector_id (IMPLIED, not FK)

[All detail tables with observation_id]
    └─ implicitly reference observations(id) via observation_id
       (No explicit FK constraint, soft reference via app logic)

observation_entry_form
    └─ references profiles(id) via collector_id (IMPLIED)
    └─ references fields via field_name (text match, not FK)

sugarcane_monitoring
    └─ references profiles(id) via collector_id (IMPLIED)
    └─ references fields via field_name (text match, not FK)
```

### 6.2 Join Patterns: Fetching Full Observations

When `fetchObservations()` runs:

```sql
SELECT 
    o.*, 
    ci.*, 
    cm.*, 
    sc.*,
    im.*,
    nm.*,
    cp.*,
    ctrl.*,
    h.*,
    rm.*,
    imgs.*
FROM observations o
LEFT JOIN crop_information ci ON o.id = ci.observation_id
LEFT JOIN crop_monitoring cm ON o.id = cm.observation_id
LEFT JOIN soil_characteristics sc ON o.id = sc.observation_id
LEFT JOIN irrigation_management im ON o.id = im.observation_id
LEFT JOIN nutrient_management nm ON o.id = nm.observation_id
LEFT JOIN crop_protection cp ON o.id = cp.observation_id
LEFT JOIN control_methods ctrl ON o.id = ctrl.observation_id
LEFT JOIN harvest h ON o.id = h.observation_id
LEFT JOIN residual_management rm ON o.id = rm.observation_id
LEFT JOIN observation_images imgs ON o.id = imgs.observation_id
WHERE [filters applied]
ORDER BY o.date_recorded DESC
LIMIT 1000
```

### 6.3 Relationship Types

| Relationship | Tables | Type | Cardinality |
|-------------|--------|------|-------------|
| Observation → Details | observations ↔ crop_information | Normalized | 1:0..1 |
| Observation → Images | observations ↔ observation_images | Normalized | 1:N |
| Profile → Observations | profiles ↔ observations | Denormalized | 1:N |
| Field → Observations | fields ↔ observations | Text match | 1:N |
| Observation Entry Form | Denormalized | Single table | 1 view |
| Sugarcane Monitoring | Denormalized | Single table | 1 view |

### 6.4 One-to-Many Examples

**Profile → Observations**:
```typescript
// Get all observations by a collector
const { data, error } = await supabase
    .from('observations')
    .select('*')
    .eq('collector_id', userId)

// Result: Multiple observation rows with same collector_id
```

**Observation → Images**:
```typescript
// Get all images for an observation (via LEFT JOIN)
const { data: observation, error } = await supabase
    .from('observations')
    .select(`*, observation_images(*)`)
    .eq('id', observationId)
    .single()

// observation.observation_images is an array of images
```

### 6.5 Many-to-Many Relationships

No explicit many-to-many in current schema. However:

**Implied via Denormalization**:
- `sugarcane_monitoring` table denormalizes observations across multiple contexts
- Users (profiles) can have multiple roles via status + role fields
- Fields can have multiple observations (one-to-many normalized)

---

## 7. API CONFIGURATION & LIMITS

### 7.1 Supabase PostgREST API Settings

**Config File**: [supabase/config.toml](supabase/config.toml)

```toml
[api]
max_rows = 1000                    # Max rows returned per query
schemas = ["public", "graphql_public"]
```

**Implications**:
- Queries limited to 1000 rows (data is paginated if needed)
- Explicit `.limit(1000)` in database.service.ts respects this

### 7.2 Connection Pooling (Production)

**Current**: Disabled locally (`[db.pooler] enabled = false`)

**When Production**: 
```toml
[db.pooler]
enabled = true
pool_mode = "transaction"          # Reuse connections per transaction
default_pool_size = 20             # Max 20 connections per user
max_client_conn = 100              # Max 100 total client connections
```

**Impact on App**: No code changes needed; Supabase handles pooling transparently.

### 7.3 RLS (Row Level Security)

All tables have RLS enabled. When a query runs:

```
1. User authenticates (JWT token)
2. Query executes with auth.uid() = user's UUID
3. RLS policies check: 
   - Can this user access this row?
4. Only matching rows returned
```

**Example Policy**:
```sql
CREATE POLICY "Users can view their own profile"
    ON public.profiles FOR SELECT
    USING (auth.uid() = id OR role = 'admin');
```

---

## 8. EXAMPLE DATA FLOW: CREATING AN OBSERVATION

### 8.1 Complete Flow: UI → DB → Cache

```
1. USER: Fills form in ObservationEntryFormPage
   └─ Calls: createObservationEntryFormSubmission(data)

2. SERVICE: [database.service.ts line 2810]
   └─ Creates ObservationEntryForm object
   └─ Calls: supabase.from('observation_entry_form').insert([formData])

3. DATABASE: Supabase ProcessesINSERT
   └─ New row in observation_entry_form table
   └─ Trigger fires: set_observation_entry_form_updated_at()
   └─ updated_at set to NOW()
   └─ Returns: { data: newRecord, error: null }

4. REALTIME: Supabase Realtime detects INSERT
   └─ Event: { event: 'INSERT', schema: 'public', table: 'observation_entry_form' }
   └─ LiveQuerySync.tsx receives event
   └─ Emits: window.dispatchEvent(LIVE_DATA_UPDATED_EVENT)

5. HOOK: useObservationEntryForms listens
   └─ Catches custom event
   └─ Calls: queryClient.invalidateQueries(['observation-entry-forms'])
   └─ Marks cache as stale

6. REACT QUERY: Auto-refetch triggered
   └─ Calls: fetchObservationEntryForms()
   └─ Supabase query runs again
   └─ Fresh data returned

7. OFFLINE: Cache updated
   └─ cacheObservations(freshData) updates IndexedDB
   └─ getLastSyncTime() updated to now

8. UI: Component re-renders
   └─ ObservationEntryFormPage displays new entry in table
   └─ User sees data immediately
```

### 8.2 Key Files Involved

| Step | File | Lines | Function |
|------|------|-------|----------|
| User Input | [src/pages/ObservationEntryFormPage.tsx](src/pages/ObservationEntryFormPage.tsx) | 1-50 | Form + Table |
| Create Call | [src/services/database.service.ts](src/services/database.service.ts) | 2810-2824 | createObservationEntryFormSubmission |
| Query State | [src/hooks/useObservationEntryForms.ts](src/hooks/useObservationEntryForms.ts) | 1-15 | useQuery hook |
| Realtime | [src/components/LiveQuerySync.tsx](src/components/LiveQuerySync.tsx) | 1-70 | postgres_changes listener |
| Type Safety | [src/types/database.types.ts](src/types/database.types.ts) | 140-200 | ObservationEntryForm interface |
| Offline | [src/services/offline.service.ts](src/services/offline.service.ts) | 1-50 | cacheObservations |

---

## 9. ARCHITECTURE SUMMARY

### 9.1 Layer Breakdown

```
┌────────────────────────────────────────────┐
│ PRESENTATION LAYER (React Components)     │
│ Pages: SugarcaneMonitoringPage             │
│ Components: Dashboard, Data, Map, etc.     │
└─────────────────────┬──────────────────────┘
                      ↓
┌────────────────────────────────────────────┐
│ STATE MANAGEMENT (Hooks + React Query)    │
│ useObservations, useSugarcaneMonitoring    │
│ Handles caching, polling, subscriptions    │
└─────────────────────┬──────────────────────┘
                      ↓
┌────────────────────────────────────────────┐
│ SERVICE LAYER (Business Logic)            │
│ database.service, staff.service, etc.      │
│ CRUD operations, transformations           │
└─────────────────────┬──────────────────────┘
                      ↓
┌────────────────────────────────────────────┐
│ SUPABASE CLIENT (Connection Library)       │
│ supabase.ts - Configured with auth/config  │
│ Realtime subscriptions, PostgREST API      │
└─────────────────────┬──────────────────────┘
                      ↓
┌────────────────────────────────────────────┐
│ REMOTE DATABASE (Supabase PostgreSQL)      │
│ Normalized schema: observations + details  │
│ Denormalized: observation_entry_form       │
│ Analytics: sugarcane_monitoring            │
└────────────────────────────────────────────┘
                      ↓
┌────────────────────────────────────────────┐
│ LOCAL STORAGE (IndexedDB Offline Cache)    │
│ Fallback when network unavailable          │
│ Syncs when connection restored             │
└────────────────────────────────────────────┘
```

### 9.2 Critical Configuration Points

| Component | Config | Location | Impact |
|-----------|--------|----------|--------|
| Auth | autoRefreshToken, persistSession | [supabase.ts](src/lib/supabase.ts) | Session persistence |
| Pooling | pool_mode = transaction | [config.toml](supabase/config.toml) | Connection reuse (prod only) |
| RLS | Policies on all tables | SQL files | Data access control |
| Real-time | Supabase channels + custom events | [LiveQuerySync.tsx](src/components/LiveQuerySync.tsx), [liveData.ts](src/lib/liveData.ts) | Live data sync |
| Polling | React Query staleTime/refetch | Hooks (`useObservations`, etc.) | Data freshness |

### 9.3 Key Design Patterns

1. **Normalized + Denormalized**: Observations stored in both normalized (split tables) and denormalized (entry_form, sugarcane_monitoring) formats
2. **Service-based CRUD**: All DB operations centralized in database.service.ts
3. **Hook-based State**: React hooks (useObservations) manage query state & caching
4. **Real-time + Polling**: Hybrid approach for reliable updates
5. **Soft RLS**: RLS enforced server-side via policies
6. **Offline-first Cache**: IndexedDB for offline access, syncs on reconnect
7. **Event-driven Refresh**: Custom DOM events trigger React Query cache invalidation

---

## 10. QUICK REFERENCE: ADDING A NEW FEATURE

### If you want to: **Display a new observation field**

1. Add to [src/types/database.types.ts](src/types/database.types.ts) - Observation* interface
2. Add to SQL schema (e.g., `alter table observations add column new_field TEXT`)
3. Update [src/services/database.service.ts](src/services/database.service.ts) - fetchObservations() .select() clause
4. Component uses useObservations() hook → automatically gets field
5. Realtime automatically triggers refresh via LiveQuerySync

### If you want to: **Add a new service operation**

1. Write function in [src/services/database.service.ts](src/services/database.service.ts)
2. Use Supabase client: `supabase.from('table').operation()`
3. Export function for use in hooks/components
4. Trigger cache invalidation if needed via queryClient.invalidateQueries()

### If you want to: **Fix a data sync issue**

1. Check [src/components/LiveQuerySync.tsx](src/components/LiveQuerySync.tsx) - Is the table monitored?
2. Check [src/lib/liveData.ts](src/lib/liveData.ts) - Is LIVE_DATA_TABLES configured?
3. Check [src/hooks/useObservations.ts](src/hooks/useObservations.ts) - Is refetch logic correct?
4. Check [src/services/offline.service.ts](src/services/offline.service.ts) - Is cache valid?

---

## Summary

This crop monitoring system uses a **layered architecture** with:
- **Normalized observations** + detail tables for consistency
- **Denormalized forms** for simplified data collection
- **Real-time subscriptions** via Supabase channels
- **Polling fallback** for reliability
- **Offline caching** with IndexedDB
- **Centralized services** for DB operations
- **Type-safe queries** via TypeScript interfaces

All database connections flow through [supabase.ts](src/lib/supabase.ts), with authentication managed in [AuthContext.tsx](src/contexts/AuthContext.tsx), and real-time updates coordinated by [LiveQuerySync.tsx](src/components/LiveQuerySync.tsx).
