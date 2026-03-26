-- Manual script to create blocks table in remote Supabase
-- Run this in your Supabase SQL Editor if the table doesn't exist

-- 1. Enable PostGIS Extension (if not already enabled)
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
CREATE INDEX IF NOT EXISTS blocks_geom_idx ON public.blocks USING GIST (geom);

-- 4. Enable Row Level Security
ALTER TABLE public.blocks ENABLE ROW LEVEL SECURITY;

-- 5. Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Allow authenticated read access" ON public.blocks;
DROP POLICY IF EXISTS "Allow Admin/Supervisor to manage blocks" ON public.blocks;

-- 6. Define Access Policies

-- Read access: All authenticated users
CREATE POLICY "Allow authenticated read access" 
ON public.blocks FOR SELECT 
TO authenticated 
USING (true);

-- Management access: Only Supervisors and Admins
CREATE POLICY "Allow Admin/Supervisor to manage blocks" 
ON public.blocks FOR ALL 
TO authenticated 
USING (
  (auth.jwt() -> 'user_metadata' ->> 'role') IN ('supervisor', 'admin')
);

-- 7. Helper Function for Mobile Validation
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
