
DELETE FROM weekly_reports WHERE user_id = 'e8ab9b3d-bda1-4d6e-8657-5f0c069a1015';
DELETE FROM monthly_reports WHERE user_id = 'e8ab9b3d-bda1-4d6e-8657-5f0c069a1015';
DELETE FROM daily_actions WHERE user_id = 'e8ab9b3d-bda1-4d6e-8657-5f0c069a1015';
DELETE FROM daily_checkins WHERE user_id = 'e8ab9b3d-bda1-4d6e-8657-5f0c069a1015';
DELETE FROM daily_checklist_answers WHERE user_id = 'e8ab9b3d-bda1-4d6e-8657-5f0c069a1015';
DELETE FROM loss_reasons WHERE user_id = 'e8ab9b3d-bda1-4d6e-8657-5f0c069a1015';
DELETE FROM location_financials WHERE user_id = 'e8ab9b3d-bda1-4d6e-8657-5f0c069a1015';
DELETE FROM location_schedules WHERE user_id = 'e8ab9b3d-bda1-4d6e-8657-5f0c069a1015';
DELETE FROM locations WHERE user_id = 'e8ab9b3d-bda1-4d6e-8657-5f0c069a1015';
DELETE FROM clinics WHERE user_id = 'e8ab9b3d-bda1-4d6e-8657-5f0c069a1015';
UPDATE profiles SET onboarding_completed = false WHERE user_id = 'e8ab9b3d-bda1-4d6e-8657-5f0c069a1015';
