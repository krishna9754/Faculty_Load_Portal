ALTER TABLE faculty_loads
  ADD COLUMN IF NOT EXISTS start_mail_sent boolean NOT NULL DEFAULT false;
