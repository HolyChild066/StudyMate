-- Run AFTER creating demo accounts via the app sign-up (or after auth users exist).
-- Password for all: demo1234
-- Creates profiles/subjects/availability/decisions for alex, jamie, maria, sam by email lookup.

do $$
declare
  alex_id uuid;
  jamie_id uuid;
  maria_id uuid;
  sam_id uuid;
begin
  select id into alex_id from auth.users where email = 'alex@northbridge.edu';
  select id into jamie_id from auth.users where email = 'jamie@northbridge.edu';
  select id into maria_id from auth.users where email = 'maria@northbridge.edu';
  select id into sam_id from auth.users where email = 'sam@northbridge.edu';

  if alex_id is null or jamie_id is null or maria_id is null or sam_id is null then
    raise exception 'One or more demo users not found. Sign up all 4 accounts first.';
  end if;

  -- Upsert profiles
  insert into public.profiles (id, name, email, course, year, verification, bio, study_pref, avatar_color, university)
  values
    (alex_id, 'Alex Morgan', 'alex@northbridge.edu', 'BS Information Technology', 2, 'approved',
     'Second-year IT student. I like breaking code down until it finally clicks.', 'either', '#3B4FE0', 'Northbridge University'),
    (jamie_id, 'Jamie Cruz', 'jamie@northbridge.edu', 'BS Information Technology', 2, 'approved',
     'Databases make sense to me. Java does not. Let us trade notes.', 'either', '#FF5A4F', 'Northbridge University'),
    (maria_id, 'Maria Santos', 'maria@northbridge.edu', 'BS Computer Science', 2, 'approved',
     'I tutor ER diagrams at the library on Mondays. Bring your messy schema.', 'in_person', '#12B76A', 'Northbridge University'),
    (sam_id, 'Sam Rivera', 'sam@northbridge.edu', 'BS Information Systems', 2, 'approved',
     'Normalization, transactions, and quiet corners of the library.', 'online', '#8B5CF6', 'Northbridge University')
  on conflict (id) do update set
    name = excluded.name, email = excluded.email, course = excluded.course, year = excluded.year,
    verification = excluded.verification, bio = excluded.bio, study_pref = excluded.study_pref,
    avatar_color = excluded.avatar_color, university = excluded.university;

  -- Clear and reseed subjects
  delete from public.profile_subjects where profile_id in (alex_id, jamie_id, maria_id, sam_id);
  insert into public.profile_subjects (profile_id, subject_id, kind) values
    (alex_id, 'it102', 'can_help'), (alex_id, 'it103', 'can_help'), (alex_id, 'it203', 'need_help'), (alex_id, 'it204', 'want_study'),
    (jamie_id, 'it203', 'can_help'), (jamie_id, 'it102', 'need_help'), (jamie_id, 'it205', 'want_study'),
    (maria_id, 'it203', 'can_help'), (maria_id, 'it204', 'need_help'), (maria_id, 'math101', 'can_help'),
    (sam_id, 'it203', 'can_help'), (sam_id, 'math101', 'need_help'), (sam_id, 'it101', 'want_study');

  -- Clear and reseed availability
  delete from public.availability where profile_id in (alex_id, jamie_id, maria_id, sam_id);
  insert into public.availability (profile_id, day, start_time, end_time) values
    (alex_id, 1, '18:00', '21:00'), (alex_id, 3, '18:00', '21:00'), (alex_id, 6, '09:00', '12:00'),
    (jamie_id, 2, '18:00', '21:00'), (jamie_id, 4, '18:00', '21:00'), (jamie_id, 6, '09:00', '12:00'),
    (maria_id, 1, '17:00', '20:00'), (maria_id, 3, '17:00', '20:00'),
    (sam_id, 2, '19:00', '22:00'), (sam_id, 5, '14:00', '17:00');

  -- Jamie studies Alex (for instant mutual match demo)
  insert into public.decisions (viewer_id, target_id, action) values (jamie_id, alex_id, 'study')
  on conflict (viewer_id, target_id) do update set action = 'study';
end $$;
