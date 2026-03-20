-- Seed test data for 1 month (Feb 18 - Mar 19, 2026)
-- Clean FK dependencies first
DELETE FROM checkin_protocols WHERE checkin_id IN (SELECT id FROM daily_checkins WHERE clinic_id = '7b78aaa0-d210-4f2e-8c44-28da31bac68a' AND date >= '2026-02-18' AND date <= '2026-03-19');
DELETE FROM daily_checkins WHERE clinic_id = '7b78aaa0-d210-4f2e-8c44-28da31bac68a' AND date >= '2026-02-18' AND date <= '2026-03-19';
DELETE FROM daily_actions WHERE clinic_id = '7b78aaa0-d210-4f2e-8c44-28da31bac68a' AND date >= '2026-02-18' AND date <= '2026-03-19';
DELETE FROM daily_checklist_answers WHERE clinic_id = '7b78aaa0-d210-4f2e-8c44-28da31bac68a' AND date >= '2026-02-18' AND date <= '2026-03-19';