-- The event log is append-only (§33, §34, Appendix A): immutability is
-- enforced by the database, not by convention. SQLite has no roles to
-- revoke and no TRUNCATE (D1 runs DELETE without WHERE as a delete, which
-- the trigger catches), so these two triggers are the whole guard.
CREATE TRIGGER events_no_update BEFORE UPDATE ON events
BEGIN
  SELECT RAISE(ABORT, 'events is append-only: UPDATE is not allowed');
END;
--> statement-breakpoint
CREATE TRIGGER events_no_delete BEFORE DELETE ON events
BEGIN
  SELECT RAISE(ABORT, 'events is append-only: DELETE is not allowed');
END;
