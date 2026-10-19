/*
# Create load_batch_managers table

1. New Tables
- `load_batch_managers` — stores Batch Manager (BM) assignments for faculty load entries.
  Each row links to a faculty_loads entry and records who is the BM for a specific
  date range within the class's overall schedule.
  Columns:
  - id (uuid PK)
  - load_id (uuid FK to faculty_loads, CASCADE on delete)
  - bm_name (text, the batch manager's name, e.g. "Aman" or "Arun")
  - start_date (date, when this BM's responsibility starts)
  - end_date (date, when this BM's responsibility ends)
  - created_at (timestamptz)

2. Security
- RLS enabled, anon + authenticated CRUD (single-tenant, no sign-in).
- Same pattern as all other tables in this app.
*/

CREATE TABLE IF NOT EXISTS load_batch_managers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  load_id uuid NOT NULL REFERENCES faculty_loads(id) ON DELETE CASCADE,
  bm_name text NOT NULL,
  start_date date NOT NULL,
  end_date date NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE load_batch_managers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_load_bms" ON load_batch_managers;
CREATE POLICY "anon_select_load_bms" ON load_batch_managers FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_load_bms" ON load_batch_managers;
CREATE POLICY "anon_insert_load_bms" ON load_batch_managers FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_load_bms" ON load_batch_managers;
CREATE POLICY "anon_update_load_bms" ON load_batch_managers FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_load_bms" ON load_batch_managers;
CREATE POLICY "anon_delete_load_bms" ON load_batch_managers FOR DELETE
  TO anon, authenticated USING (true);

CREATE INDEX IF NOT EXISTS idx_load_bms_load_id ON load_batch_managers(load_id);
