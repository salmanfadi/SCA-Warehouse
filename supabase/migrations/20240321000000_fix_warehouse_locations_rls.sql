-- Drop existing policies
DROP POLICY IF EXISTS "Enable all operations for warehouse staff" ON public.warehouse_locations;
DROP POLICY IF EXISTS "Enable read access for all authenticated users" ON public.warehouse_locations;

-- Create new policies
CREATE POLICY "Enable all operations for admins" ON public.warehouse_locations
    FOR ALL
    TO public
    USING (EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
    ))
    WITH CHECK (EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
    ));

CREATE POLICY "Enable read access for all authenticated users" ON public.warehouse_locations
    FOR SELECT
    TO authenticated
    USING (true); 