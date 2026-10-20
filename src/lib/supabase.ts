import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://vzlotuhhvsimvjqpqqgp.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ6bG90dWhodnNpbXZqcXBxcWdwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTE1MjcxMzgsImV4cCI6MjEwNzEwMzEzOH0.pge5Ren8z4Ui2JFEQpIVzCnHI0lCe-En1RGfcorB84M';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type Faculty = {
  id: string;
  name: string;
  department: string;
  branch: string | null;
  created_at: string;
};

export type Batch = {
  id: string;
  name: string;
  created_at: string;
};

export type FacultyLoad = {
  id: string;
  faculty_id: string;
  batch_id: string;
  subject: string;
  day_of_week: string;
  start_time: string;
  end_time: string;
  start_date: string;
  end_date: string;
  room: string | null;
  start_mail_sent: boolean;
  created_at: string;
};

export type FacultyLoadWithDetails = FacultyLoad & {
  faculty: { name: string; department: string; branch: string | null };
  batch: { name: string };
};

export type MailTrackerGroup = {
  faculty_id: string;
  faculty_name: string;
  department: string;
  subject: string;
  start_time: string;
  end_time: string;
  start_date: string;
  end_date: string;
  day_of_week: string;
  room: string | null;
  batchNames: string[];
  loadIds: string[];
  allMailed: boolean;
};

export type LoadBatchManager = {
  id: string;
  load_id: string;
  bm_name: string;
  bm_phone: string | null;
  start_date: string;
  end_date: string;
  created_at: string;
};

export type ExtraClass = {
  id: string;
  faculty_id: string;
  batch_id: string;
  subject: string;
  date: string;
  start_time: string;
  end_time: string;
  room: string | null;
  reason: string | null;
  created_at: string;
};

export type ExtraClassWithDetails = ExtraClass & {
  faculty: { name: string; department: string; branch: string | null };
  batch: { name: string };
};

export type RescheduledClass = {
  id: string;
  original_load_id: string | null;
  faculty_id: string;
  batch_id: string;
  subject: string;
  original_day: string | null;
  original_date: string | null;
  original_start_time: string | null;
  original_end_time: string | null;
  new_day: string;
  new_date: string;
  new_start_time: string;
  new_end_time: string;
  room: string | null;
  reason: string | null;
  created_at: string;
};

export type RescheduledClassWithDetails = RescheduledClass & {
  faculty: { name: string; department: string; branch: string | null };
  batch: { name: string };
};

export type CancelledClass = {
  id: string;
  faculty_id: string;
  batch_id: string;
  subject: string;
  date: string;
  day_of_week: string | null;
  start_time: string | null;
  end_time: string | null;
  room: string | null;
  reason: string | null;
  created_at: string;
};

export type CancelledClassWithDetails = CancelledClass & {
  faculty: { name: string; department: string; branch: string | null };
  batch: { name: string };
};

export type ClashAlert = {
  load1: FacultyLoadWithDetails;
  load2: FacultyLoadWithDetails;
  type: 'faculty' | 'batch';
  message: string;
};
