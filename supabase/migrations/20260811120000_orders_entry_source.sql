-- ============================================================
-- orders.entry_source — "how did you hear about Stop and Grow KC?"
--
-- The order form has asked this question since it was written. It was wired to
-- React state and posted with every submission, but placeOrder() never read it
-- and no column existed to hold it, so the answer was discarded on every order
-- placed to date. This adds the column so the question stops being a lie.
--
-- Nullable and unconstrained: the field is optional on the form, the answers are
-- free text ("a friend", "farmers market", "instagram"), and forcing them into
-- an enum now would mean guessing the categories before seeing any data. If the
-- answers turn out to cluster, a later migration can normalize them — going the
-- other way, from an enum that guessed wrong back to free text, loses whatever
-- did not fit.
--
-- No backfill is possible. Orders placed before this migration never had the
-- answer stored anywhere, so they stay null rather than getting a placeholder
-- that would look like a real response in a report.
-- ============================================================

alter table public.orders
  add column entry_source text;

-- Bounded to match LIMITS.name in lib/validation.ts, which placeOrder() enforces
-- before the insert. The check is the backstop, not the primary guard: it exists
-- so a future write path that skips placeOrder() still cannot put an unbounded
-- string in a column Scraps reads.
alter table public.orders
  add constraint orders_entry_source_len
  check (entry_source is null or char_length(entry_source) <= 200);

comment on column public.orders.entry_source is
  'Free-text answer to "how did you hear about us?" on the order form. Optional; null for orders placed before 2026-08-11 and for anyone who skipped it.';
