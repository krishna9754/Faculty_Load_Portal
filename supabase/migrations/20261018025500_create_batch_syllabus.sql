/*
  # Batch Syllabus & Faculty Curriculum Table

  1. New Table:
     - `batch_syllabus`: Stores the syllabus curriculum for each batch.
       Fields:
       - `id` (uuid, primary key)
       - `batch_id` (uuid, references batches(id) ON DELETE CASCADE)
       - `batch_name` (text, cached batch name)
       - `subject` (text, subject name)
       - `faculty_id` (uuid, references faculty(id) ON DELETE CASCADE)
       - `faculty_name` (text, cached faculty name)
       - `allocated_hours` (numeric, total planned syllabus hours e.g. 60)
       - `notes` (text, optional module or syllabus details)
       - `status` (text, e.g. 'planned', 'in_progress', 'completed')
       - `created_at` (timestamptz)
       - `updated_at` (timestamptz)

  2. Security:
     - RLS enabled with permissive policies for anon & authenticated users.
*/

CREATE TABLE IF NOT EXISTS batch_syllabus (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id uuid NOT NULL REFERENCES batches(id) ON DELETE CASCADE,
  batch_name text,
  subject text NOT NULL,
  faculty_id uuid NOT NULL REFERENCES faculty(id) ON DELETE CASCADE,
  faculty_name text,
  allocated_hours numeric NOT NULL DEFAULT 40,
  start_date date,
  end_date date,
  notes text,
  status text DEFAULT 'in_progress',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE batch_syllabus ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_batch_syllabus" ON batch_syllabus;
CREATE POLICY "anon_select_batch_syllabus" ON batch_syllabus FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_batch_syllabus" ON batch_syllabus;
CREATE POLICY "anon_insert_batch_syllabus" ON batch_syllabus FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_batch_syllabus" ON batch_syllabus;
CREATE POLICY "anon_update_batch_syllabus" ON batch_syllabus FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_batch_syllabus" ON batch_syllabus;
CREATE POLICY "anon_delete_batch_syllabus" ON batch_syllabus FOR DELETE
  TO anon, authenticated USING (true);
