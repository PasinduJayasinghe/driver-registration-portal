-- Employee IDs were allocated with
--   SELECT MAX(CAST(SUBSTRING("employeeId" FROM 5) AS INTEGER)) ...
-- which is a sequential scan (the cast/regex are not indexable) and races:
-- two concurrent registrations compute the same value and collide on the
-- unique index, which the app papered over with a 5-attempt retry loop.
--
-- Replace it with a sequence. nextval() is atomic and O(1).

CREATE SEQUENCE IF NOT EXISTS employee_id_seq AS BIGINT START WITH 1;

-- Start the sequence above the highest ID already issued so we never reuse one.
-- setval(..., false) means "next nextval() returns exactly this value".
SELECT setval(
  'employee_id_seq',
  COALESCE(
    (
      SELECT MAX(CAST(SUBSTRING("employeeId" FROM 5) AS BIGINT)) + 1
      FROM "Driver"
      WHERE "employeeId" ~ '^FEN-[0-9]+$'
    ),
    1
  ),
  false
);
