/*
# Faculty Load Management Portal - Schema

1. New Tables
- `faculty`: Stores faculty members with their name and department.
- `batches`: Stores student batches (e.g., "CS-2023", "EE-2024").
- `faculty_loads`: Stores teaching load entries — which faculty teaches which batch,
  on which day, from what time to what time, and for what date range.

2. Security
- This is a single-tenant app with no sign-in screen.
- RLS enabled on all tables.
- All policies use `TO anon, authenticated` with `USING (true)` / `WITH CHECK (true)`
  because the data is intentionally shared/public.

3. Clash Detection
- Clash detection is performed in the application layer by querying faculty_loads
  and comparing day + time overlaps + date range overlaps for the same faculty or same batch.
*/

-- Faculty table
CREATE TABLE IF NOT EXISTS faculty (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  department text NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE faculty ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_faculty" ON faculty;
CREATE POLICY "anon_select_faculty" ON faculty FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_faculty" ON faculty;
CREATE POLICY "anon_insert_faculty" ON faculty FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_faculty" ON faculty;
CREATE POLICY "anon_update_faculty" ON faculty FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_faculty" ON faculty;
CREATE POLICY "anon_delete_faculty" ON faculty FOR DELETE
  TO anon, authenticated USING (true);

-- Batches table
CREATE TABLE IF NOT EXISTS batches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE batches ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_batches" ON batches;
CREATE POLICY "anon_select_batches" ON batches FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_batches" ON batches;
CREATE POLICY "anon_insert_batches" ON batches FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_batches" ON batches;
CREATE POLICY "anon_update_batches" ON batches FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_batches" ON batches;
CREATE POLICY "anon_delete_batches" ON batches FOR DELETE
  TO anon, authenticated USING (true);

-- Faculty loads table
CREATE TABLE IF NOT EXISTS faculty_loads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  faculty_id uuid NOT NULL REFERENCES faculty(id) ON DELETE CASCADE,
  batch_id uuid NOT NULL REFERENCES batches(id) ON DELETE CASCADE,
  subject text NOT NULL,
  day_of_week text NOT NULL CHECK (day_of_week IN ('Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday')),
  start_time text NOT NULL,
  end_time text NOT NULL,
  start_date date NOT NULL,
  end_date date NOT NULL,
  room text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE faculty_loads ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_faculty_loads" ON faculty_loads;
CREATE POLICY "anon_select_faculty_loads" ON faculty_loads FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_faculty_loads" ON faculty_loads;
CREATE POLICY "anon_insert_faculty_loads" ON faculty_loads FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_faculty_loads" ON faculty_loads;
CREATE POLICY "anon_update_faculty_loads" ON faculty_loads FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_faculty_loads" ON faculty_loads;
CREATE POLICY "anon_delete_faculty_loads" ON faculty_loads FOR DELETE
  TO anon, authenticated USING (true);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_faculty_loads_faculty_id ON faculty_loads(faculty_id);
CREATE INDEX IF NOT EXISTS idx_faculty_loads_batch_id ON faculty_loads(batch_id);
CREATE INDEX IF NOT EXISTS idx_faculty_loads_day ON faculty_loads(day_of_week);
