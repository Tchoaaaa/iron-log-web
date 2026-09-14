-- =============================================================================
-- GymApp — recategorize exercise library into final muscle-group set
-- =============================================================================
-- One-time migration for exercises already sitting in every user's library
-- (supabase-exercises.sql only inserts missing rows, it never updates
-- categories on existing ones — this file catches those up).
--
-- Final category set: Pectoraux, Dos, Épaules, Biceps, Triceps, Quadriceps,
-- Adducteurs, Abducteurs, Ischios/Fessier, Mollets, Abdominaux.
--
-- Run once in the Supabase dashboard: SQL Editor -> New query -> paste -> Run.
-- Idempotent: safe to run again (updates are no-ops once applied; the delete
-- only ever matches the forearm exercises below).
-- =============================================================================

-- 1. Trapèzes + Lombaires fold into Dos
update public.exercises set category = 'Dos'
where category in ('Trapèzes', 'Lombaires');

-- 2. Ischio-jambiers folds into Ischios/Fessier
update public.exercises set category = 'Ischios/Fessier'
where category = 'Ischio-jambiers';

-- 3. Fessiers: the "Abducteurs ..." exercises split into their own category,
--    the rest fold into Ischios/Fessier
update public.exercises set category = 'Abducteurs'
where category = 'Fessiers'
  and name in (
    'Abducteurs allongé avec lest cheville',
    'Abducteurs assis à la machine',
    'Abducteurs à la machine',
    'Abducteurs à la poulie'
  );

update public.exercises set category = 'Ischios/Fessier'
where category = 'Fessiers';

-- 4. Quadriceps: the "Adducteurs ..." exercises split into their own category
update public.exercises set category = 'Adducteurs'
where category = 'Quadriceps'
  and name in (
    'Adducteurs assis à la machine',
    'Adducteurs à la machine',
    'Adducteurs à la poulie'
  );

-- 5. Drop the forearm exercises entirely
delete from public.exercises
where name in (
  'Bobine Andrieux - Extension',
  'Bobine Andrieux - Flexion',
  'Curl inversé allongé à la poulie basse',
  'Curl inversé allongé à la poulie haute',
  'Curl inversé au pupitre avec barre',
  'Curl inversé au pupitre à la poulie',
  'Curl inversé avec barre',
  'Curl inversé à la poulie',
  'Extension des poignets avec barre',
  'Flexion des poignets avec barre'
);

-- Check the result for your account:
--   select category, count(*) from public.exercises
--   where user_id = auth.uid() group by category order by count(*) desc;
