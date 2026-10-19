-- The event log is append-only (§33, §34, Appendix A): immutability is
-- enforced by the database, not by convention. Triggers apply to every role,
-- including the table owner the app connects as. Derived labels live in
-- other tables and stay re-computable.
CREATE FUNCTION events_reject_mutation() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'events is append-only: % is not allowed', TG_OP
    USING ERRCODE = 'insufficient_privilege';
END;
$$ LANGUAGE plpgsql;
--> statement-breakpoint
CREATE TRIGGER events_no_update_delete
  BEFORE UPDATE OR DELETE ON events
  FOR EACH ROW EXECUTE FUNCTION events_reject_mutation();
--> statement-breakpoint
CREATE TRIGGER events_no_truncate
  BEFORE TRUNCATE ON events
  FOR EACH STATEMENT EXECUTE FUNCTION events_reject_mutation();
--> statement-breakpoint
REVOKE UPDATE, DELETE, TRUNCATE ON events FROM PUBLIC;
