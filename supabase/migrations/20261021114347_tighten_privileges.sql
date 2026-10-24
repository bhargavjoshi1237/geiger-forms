-- Tighten privileges
--
-- Three grants left wider than intended:
-- * forms.webhook_deliveries.payload (respondent answers) was readable by anyone holding forms.form.edit through
--   webhook_deliveries_read. Signed-in members keep the delivery log's other columns; payloads stay server-side.
-- * forms.hit_rate_limit and forms.purge_expired_responses were revoked from anon and authenticated but still
--   executable through PUBLIC; they are service-role only.
-- * The migration ledger (forms.geiger_migrations, created by @geiger/orm) had RLS off and full DML for anon and
--   authenticated. @geiger/orm connects as the table owner, which RLS does not restrict.

-- @up
revoke select on forms.webhook_deliveries from anon, authenticated;
grant select (id, form_id, response_id, webhook_id, url, event, status_code, ok, error, state, attempt_count, attempts, next_retry_at, alerted_at, created_at)
  on forms.webhook_deliveries to authenticated;

revoke execute on function forms.hit_rate_limit(text, integer, integer) from public;
revoke execute on function forms.purge_expired_responses() from public;

revoke all on forms.geiger_migrations from anon, authenticated;
revoke all on sequence forms.geiger_migrations_id_seq from anon, authenticated;
alter table forms.geiger_migrations enable row level security;

-- @down
alter table forms.geiger_migrations disable row level security;
grant all on sequence forms.geiger_migrations_id_seq to anon, authenticated;
grant all on forms.geiger_migrations to anon, authenticated;

grant execute on function forms.purge_expired_responses() to public;
grant execute on function forms.hit_rate_limit(text, integer, integer) to public;

-- Revoking the table privilege drops the column grants too.
revoke select on forms.webhook_deliveries from anon, authenticated;
grant select on forms.webhook_deliveries to anon, authenticated;
