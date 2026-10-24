-- Webhook retries
--
-- Reliable delivery for forms.webhook_deliveries (lib/server/webhooks.js): one row per
-- delivery carrying its payload for retries and replay, the attempt log, the retry
-- schedule swept by /api/cron/webhooks, and the owner-alert throttle. Stored payloads
-- now follow their response, so a hard delete (retention, erasure) removes them too.

-- @up
alter table forms.webhook_deliveries add column if not exists webhook_id text;
alter table forms.webhook_deliveries add column if not exists payload jsonb;
alter table forms.webhook_deliveries add column if not exists state text not null default 'delivered';
alter table forms.webhook_deliveries add column if not exists attempt_count integer not null default 1;
alter table forms.webhook_deliveries add column if not exists attempts jsonb not null default '[]'::jsonb;
alter table forms.webhook_deliveries add column if not exists next_retry_at timestamptz;
alter table forms.webhook_deliveries add column if not exists alerted_at timestamptz;

-- Single-attempt rows logged before this migration.
update forms.webhook_deliveries set state = 'failed' where not ok and state = 'delivered';
update forms.webhook_deliveries
   set attempts = jsonb_build_array(jsonb_build_object('n', 1, 'at', created_at, 'status', status_code, 'error', error))
 where attempts = '[]'::jsonb;

alter table forms.webhook_deliveries drop constraint if exists webhook_deliveries_state_check;
alter table forms.webhook_deliveries add constraint webhook_deliveries_state_check
  check (state in ('retrying', 'delivered', 'failed'));

alter table forms.webhook_deliveries drop constraint if exists webhook_deliveries_response_id_fkey;
alter table forms.webhook_deliveries add constraint webhook_deliveries_response_id_fkey
  foreign key (response_id) references forms.responses(id) on delete cascade;

create index if not exists forms_webhook_deliveries_due_idx
  on forms.webhook_deliveries (next_retry_at) where state = 'retrying';
create index if not exists forms_webhook_deliveries_alert_idx
  on forms.webhook_deliveries (form_id, url, alerted_at desc) where alerted_at is not null;

-- @down
drop index if exists forms.forms_webhook_deliveries_alert_idx;
drop index if exists forms.forms_webhook_deliveries_due_idx;

alter table forms.webhook_deliveries drop constraint if exists webhook_deliveries_response_id_fkey;
alter table forms.webhook_deliveries add constraint webhook_deliveries_response_id_fkey
  foreign key (response_id) references forms.responses(id) on delete set null;

alter table forms.webhook_deliveries drop constraint if exists webhook_deliveries_state_check;
alter table forms.webhook_deliveries drop column if exists alerted_at;
alter table forms.webhook_deliveries drop column if exists next_retry_at;
alter table forms.webhook_deliveries drop column if exists attempts;
alter table forms.webhook_deliveries drop column if exists attempt_count;
alter table forms.webhook_deliveries drop column if exists state;
alter table forms.webhook_deliveries drop column if exists payload;
alter table forms.webhook_deliveries drop column if exists webhook_id;
