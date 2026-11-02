-- Clear submitted partial answers
--
-- Submit now empties a draft's answers, since the response holds what's needed. This clears the same copy from drafts submitted earlier, which could include answers to hidden questions.
-- The touch trigger is paused so retention windows and drop-off analytics keep each row's real updated_at.

-- @up
alter table forms.partials disable trigger partials_touch_updated_at;
update forms.partials set answers = '{}'::jsonb where completed_at is not null and answers <> '{}'::jsonb;
alter table forms.partials enable trigger partials_touch_updated_at;

-- @down
-- Cleared answers can't be restored; submitted responses are unaffected.
select 1;
