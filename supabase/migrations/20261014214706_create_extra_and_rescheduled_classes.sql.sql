/*
# Extra Classes & Rescheduled Classes

1. New Tables
- `extra_classes`: Stores extra/make-up class entries for a faculty + batch.
  Fields: faculty_id, batch_id, subject, date, start_time, end_time, room, reason, created_at.
- `rescheduled_classes`: Stores rescheduled class entries — links to an original
  faculty_load and stores the new day/time/dates.
  Fields: original_load_id (nullable, links to faculty_loads), faculty_id, batch_id,
  subject, original_day, original_date, original_start_time, original_end_time,
  new_day, new_date, new_start_time, new_end_time, room, reason, created_at.

2. Security
- Single-tenant app with no sign-in screen.
- RLS enabled on both tables.
- All policies use `TO anon, authenticated` with `USING (true)` / `WITH CHECK (true)`
  because the data is intentionally shared/public.

3. Important Notes
- `extra_classes` is standalone — not linked to a specific faculty_load row.
- `rescheduled_classes` has an optional FK to `faculty_loads` via `original_load_id`.
  If the original load entry is deleted, the reschedule record stays (ON DELETE SET NULL).
- Both tables reference `faculty` and `batches` with CASCADE delete.
*/

-- Extra Classes table
CREATE TABLE IF NOT EXISTS extra_classes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  faculty_id uuid NOT NULL REFERENCES faculty(id) ON DELETE CASCADE,
  batch_id uuid NOT NULL REFERENCES batches(id) ON DELETE CASCADE,
  subject text NOT NULL,
  date date NOT NULL,
  start_time text NOT NULL,
  end_time text NOT NULL,
  room text,
  reason text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE extra_classes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_extra_classes" ON extra_classes;
CREATE POLICY "anon_select_extra_classes" ON extra_classes FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_extra_classes" ON extra_classes;
CREATE POLICY "anon_insert_extra_classes" ON extra_classes FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_extra_classes" ON extra_classes;
CREATE POLICY "anon_update_extra_classes" ON extra_classes FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_extra_classes" ON extra_classes;
CREATE POLICY "anon_delete_extra_classes" ON extra_classes FOR DELETE
  TO anon, authenticated USING (true);

-- Rescheduled Classes table
CREATE TABLE IF NOT EXISTS rescheduled_classes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  original_load_id uuid REFERENCES faculty_loads(id) ON DELETE SET NULL,
  faculty_id uuid NOT NULL REFERENCES faculty(id) ON DELETE CASCADE,
  batch_id uuid NOT NULL REFERENCES batches(id) ON DELETE CASCADE,
  subject text NOT NULL,
  original_day text,
  original_date date,
  original_start_time text,
  original_end_time text,
  new_day text NOT NULL,
  new_date date NOT NULL,
  new_start_time text NOT NULL,
  new_end_time text NOT NULL,
  room text,
  reason text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE rescheduled_classes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_rescheduled_classes" ON rescheduled_classes;
CREATE POLICY "anon_select_rescheduled_classes" ON rescheduled_classes FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_rescheduled_classes" ON rescheduled_classes;
CREATE POLICY "anon_insert_rescheduled_classes" ON rescheduled_classes FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_rescheduled_classes" ON rescheduled_classes;
CREATE POLICY "anon_update_rescheduled_classes" ON rescheduled_classes FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_rescheduled_classes" ON rescheduled_classes;
CREATE POLICY "anon_delete_rescheduled_classes" ON rescheduled_classes FOR DELETE
  TO anon, authenticated USING (true);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_extra_classes_faculty_id ON extra_classes(faculty_id);
CREATE INDEX IF NOT EXISTS idx_extra_classes_batch_id ON extra_classes(batch_id);
CREATE INDEX IF NOT EXISTS idx_extra_classes_date ON extra_classes(date);

CREATE INDEX IF NOT EXISTS idx_rescheduled_classes_faculty_id ON rescheduled_classes(faculty_id);
CREATE INDEX IF NOT EXISTS idx_rescheduled_classes_batch_id ON rescheduled_classes(batch_id);
CREATE INDEX IF NOT EXISTS idx_rescheduled_classes_new_date ON rescheduled_classes(new_date);
CREATE INDEX IF NOT EXISTS idx_rescheduled_classes_original_load_id ON rescheduled_classes(original_load_id);
