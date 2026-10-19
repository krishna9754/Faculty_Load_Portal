/*
# Add Batch Manager contact number

1. Modified Tables
- `load_batch_managers`
- Adds `bm_phone` as an optional text field for the Batch Manager's contact number.
- Existing Batch Manager rows remain valid and keep a blank contact number until updated.

2. Security
- No access model changes. Existing RLS policies on `load_batch_managers` continue to apply to the new column.

3. Important Notes
- Contact numbers are stored as text so leading zeros, country codes, spaces, and hyphens are preserved.
- The change is additive and does not remove or alter existing data.
*/

ALTER TABLE load_batch_managers
  ADD COLUMN IF NOT EXISTS bm_phone text;