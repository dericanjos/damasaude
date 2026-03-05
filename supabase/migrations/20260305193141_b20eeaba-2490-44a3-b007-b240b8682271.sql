
-- Add task_4 and tip_4 columns to checklists table
ALTER TABLE public.checklists ADD COLUMN task_4 text;
ALTER TABLE public.checklists ADD COLUMN tip_4 text;

-- Add checklist_level to profiles table
ALTER TABLE public.profiles ADD COLUMN checklist_level integer NOT NULL DEFAULT 1;
