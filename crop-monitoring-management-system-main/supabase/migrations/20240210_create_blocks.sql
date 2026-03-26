-- 🗺️ PostGIS Setup & Table Schema for Block Management

-- 1. Enable PostGIS Extension
-- This must be run by a superuser (Supabase default dashboard SQL editor)
CREATE EXTENSION IF NOT EXISTS postgis;

-- 2. Create the Blocks Table
CREATE TABLE IF NOT EXISTS public.blocks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    block_id TEXT UNIQUE NOT NULL,
    name TEXT,
    geom GEOMETRY(MultiPolygon, 4326),
    created_at TIMESTAMPTZ DEFAULT now(),
    created_by UUID REFERENCES auth.users(id),
    
    -- Constraint to ensure we only have valid polygons/multipolygons
    CONSTRAINT valid_geom CHECK (ST_GeometryType(geom) IN ('ST_Polygon', 'ST_MultiPolygon'))
);

-- 3. Spatial Index for Performance
-- Essential for point-in-polygon queries and visual rendering
CREATE INDEX IF NOT EXISTS blocks_geom_idx ON public.blocks USING GIST (geom);

-- 4. Enable Row Level Security
ALTER TABLE public.blocks ENABLE ROW LEVEL SECURITY;

-- 5. Define Access Policies

-- Read access: All authenticated users (Collectors, Supervisors, Admins)
CREATE POLICY "Allow authenticated read access" 
ON public.blocks FOR SELECT 
TO authenticated 
USING (true);

-- Management access: Only Supervisors and Admins
-- This policy uses user_metadata to check roles
CREATE POLICY "Allow Admin/Supervisor to manage blocks" 
ON public.blocks FOR ALL 
TO authenticated 
USING (
  (auth.jwt() -> 'user_metadata' ->> 'role') IN ('supervisor', 'admin')
);

-- 6. Helper Function for Mobile Validation
-- Can be called via Supabase RPC to verify if a collector is in the right place
CREATE OR REPLACE FUNCTION public.check_point_in_block(
  p_lat DOUBLE PRECISION, 
  p_lng DOUBLE PRECISION, 
  p_block_id TEXT
) 
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM public.blocks 
    WHERE block_id = p_block_id 
    AND ST_Contains(geom, ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326))
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
