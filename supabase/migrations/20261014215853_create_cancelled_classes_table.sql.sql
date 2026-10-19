/*
# Create cancelled_classes table

1. New Tables
- `cancelled_classes`: Stores cancelled class entries for a faculty + batch.
  Fields: faculty_id, batch_id, subject, date, day_of_week, start_time, end_time, room, reason, created_at.

2. Security
- Single-tenant app with no sign-in screen.
- RLS enabled, all policies use `TO anon, authenticated` with `USING (true)` / `WITH CHECK (true)`.

3. Notes
- References faculty and batches with CASCADE delete.
*/

CREATE TABLE IF NOT EXISTS cancelled_classes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  faculty_id uuid NOT NULL REFERENCES faculty(id) ON DELETE CASCADE,
  batch_id uuid NOT NULL REFERENCES batches(id) ON DELETE CASCADE,
  subject text NOT NULL,
  date date NOT NULL,
  day_of_week text,
  start_time text,
  end_time text,
  room text,
  reason text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE cancelled_classes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_cancelled_classes" ON cancelled_classes;
CREATE POLICY "anon_select_cancelled_classes" ON cancelled_classes FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_cancelled_classes" ON cancelled_classes;
CREATE POLICY "anon_insert_cancelled_classes" ON cancelled_classes FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_cancelled_classes" ON cancelled_classes;
CREATE POLICY "anon_update_cancelled_classes" ON cancelled_classes FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_cancelled_classes" ON cancelled_classes;
CREATE POLICY "anon_delete_cancelled_classes" ON cancelled_classes FOR DELETE
  TO anon, authenticated USING (true);

CREATE INDEX IF NOT EXISTS idx_cancelled_classes_faculty_id ON cancelled_classes(faculty_id);
CREATE INDEX IF NOT EXISTS idx_cancelled_classes_batch_id ON cancelled_classes(batch_id);
CREATE INDEX IF NOT EXISTS idx_cancelled_classes_date ON cancelled_classes(date);
