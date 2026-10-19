/*
# Add branch column to faculty table

1. Changes
- Adds `branch` text column to `faculty` table, nullable, defaulting to NULL.
  This stores the faculty's branch (e.g. Civil, Mechanical, CS/IT) separately from
  `department` which stores the category.
- Existing rows get NULL for branch — the frontend treats NULL as "Not set".

2. Security
- No policy changes. Existing anon/authenticated CRUD policies on `faculty` already
  cover the new column since they use `USING (true)` / `WITH CHECK (true)`.
*/

ALTER TABLE faculty ADD COLUMN IF NOT EXISTS branch text;
