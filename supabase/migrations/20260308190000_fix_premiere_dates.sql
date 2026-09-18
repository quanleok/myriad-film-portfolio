-- Set premiere_date on premiering projects that are missing it
UPDATE projects
SET premiere_date = NOW() + INTERVAL '3 days'
WHERE lifecycle_status = 'premiering'
  AND premiere_date IS NULL
  AND slug = 'midnight-boulevard';

UPDATE projects
SET premiere_date = NOW() + INTERVAL '5 days'
WHERE lifecycle_status = 'premiering'
  AND premiere_date IS NULL
  AND slug = 'red-signal';

UPDATE projects
SET premiere_date = NOW() + INTERVAL '10 days'
WHERE lifecycle_status = 'premiering'
  AND premiere_date IS NULL
  AND slug = 'featherweight';

-- Catch-all: any other premiering project without a date gets one 7 days out
UPDATE projects
SET premiere_date = NOW() + INTERVAL '7 days'
WHERE lifecycle_status = 'premiering'
  AND premiere_date IS NULL;
