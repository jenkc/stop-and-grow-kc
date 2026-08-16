"use client";

import { useActionState, useState, useTransition } from "react";
import {
  createCycle,
  setCycleStatus,
  addWindow,
  deleteWindow,
} from "@/app/Admin/Cycle/actions";
import type { AdminActionState } from "@/app/Admin/actions";
import { WINDOW_TIMES } from "@/lib/window-times";

/**
 * Setting up the week: create it, add times, open ordering.
 *
 * "Open ordering" is the one button here that changes what the public sees, so
 * it is the only one styled as primary and the only one that confirms.
 */

const EMPTY: AdminActionState = {};

export function OpenCloseButtons({
  cycleId,
  status,
}: {
  cycleId: string;
  status: string;
}) {
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<AdminActionState>({});

  function run(next: "open" | "closed" | "draft") {
    setMessage({});
    startTransition(async () => setMessage(await setCycleStatus(cycleId, next)));
  }

  return (
    <div>
      <div className="flex flex-wrap gap-2">
        {status !== "open" ? (
          <button
            type="button"
            disabled={pending}
            onClick={() => {
              if (
                confirm(
                  "Open ordering for this week? The order form goes live immediately.",
                )
              )
                run("open");
            }}
            className="flex min-h-11 items-center justify-center rounded-md bg-primary px-5 font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-60"
          >
            {pending ? "Saving…" : "Open ordering"}
          </button>
        ) : (
          <button
            type="button"
            disabled={pending}
            onClick={() => run("closed")}
            className="flex min-h-11 items-center justify-center rounded-md border border-line-mid px-5 font-medium transition-colors hover:bg-paper-2 disabled:opacity-60"
          >
            {pending ? "Saving…" : "Close ordering"}
          </button>
        )}
      </div>
      <Message state={message} />
    </div>
  );
}

/**
 * `defaultCycleDate` is computed on the server (see lib/week.ts) and passed in
 * rather than derived here. This is a client component, so a date built from the
 * browser clock would follow the viewer's timezone — and near midnight that
 * hands back the wrong Wednesday.
 */
export function CreateCycleForm({
  defaultCycleDate,
}: {
  defaultCycleDate: string;
}) {
  const [state, action, pending] = useActionState(createCycle, EMPTY);

  return (
    <form action={action} className="rounded-lg border border-border bg-card p-4">
      <h2 className="font-display text-xl">Add a new week</h2>
      <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-end">
        <label className="flex-1">
          <span className="mb-1 block text-sm font-medium">
            Week of{" "}
            <span className="text-muted-foreground">(Wednesday)</span>
          </span>
          {/* Pre-filled with the coming Wednesday — shopping day, and the first
              thing that happens in a week. Not restricted to Wednesdays: a
              holiday week may genuinely shift, and blocking that would be worse
              than an odd date. Deliveries are Thu–Sat and live in the windows
              below, not in this field. */}
          <input
            type="date"
            name="cycleDate"
            required
            defaultValue={defaultCycleDate}
            className="h-11 w-full rounded-md border border-line-mid bg-paper px-3"
          />
        </label>
        <label className="flex-1">
          <span className="mb-1 block text-sm font-medium">
            Name <span className="text-muted-foreground">(optional)</span>
          </span>
          <input
            type="text"
            name="title"
            placeholder="Week of Aug 19"
            className="h-11 w-full rounded-md border border-line-mid bg-paper px-3"
          />
        </label>
        <button
          type="submit"
          disabled={pending}
          className="flex h-11 items-center justify-center rounded-md border border-line-mid px-5 font-medium transition-colors hover:bg-paper-2 disabled:opacity-60"
        >
          {pending ? "Creating…" : "Create"}
        </button>
      </div>
      <Message state={state} />
    </form>
  );
}

export function AddWindowForm({
  cycleId,
  defaultWindowDate,
}: {
  cycleId: string;
  defaultWindowDate: string;
}) {
  const [state, action, pending] = useActionState(addWindow, EMPTY);

  return (
    <form action={action} className="rounded-lg border border-border bg-card p-4">
      <input type="hidden" name="cycleId" value={cycleId} />
      <h3 className="font-medium">Add a time</h3>
      <p className="mt-1 text-sm text-muted-foreground">
        The label is what customers see. Start and end are what the runsheet
        sorts by.
      </p>

      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <label>
          <span className="mb-1 block text-sm font-medium">Pickup or delivery</span>
          <select
            name="kind"
            required
            className="h-11 w-full rounded-md border border-line-mid bg-paper px-3"
          >
            <option value="delivery">Delivery</option>
            <option value="pickup">Pickup</option>
          </select>
        </label>
        <label>
          <span className="mb-1 block text-sm font-medium">Label</span>
          <input
            type="text"
            name="label"
            required
            placeholder="10:00–12:30pm"
            className="h-11 w-full rounded-md border border-line-mid bg-paper px-3"
          />
        </label>
        {/* One date for the whole window — a slot that starts on one day and
            ends on the next is not a thing she runs, and two datetime fields
            made that possible. Defaults to the Thursday after the shopping
            Wednesday, the first delivery day. */}
        <label>
          <span className="mb-1 block text-sm font-medium">Day</span>
          <input
            type="date"
            name="windowDate"
            required
            defaultValue={defaultWindowDate}
            className="h-11 w-full rounded-md border border-line-mid bg-paper px-3"
          />
        </label>
        <div className="grid grid-cols-2 gap-3">
          <label>
            <span className="mb-1 block text-sm font-medium">Starts</span>
            <select
              name="startsTime"
              required
              defaultValue=""
              className="h-11 w-full rounded-md border border-line-mid bg-paper px-3"
            >
              <option value="" disabled>
                Time
              </option>
              {WINDOW_TIMES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span className="mb-1 block text-sm font-medium">Ends</span>
            <select
              name="endsTime"
              required
              defaultValue=""
              className="h-11 w-full rounded-md border border-line-mid bg-paper px-3"
            >
              <option value="" disabled>
                Time
              </option>
              {WINDOW_TIMES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>

      <button
        type="submit"
        disabled={pending}
        className="mt-3 flex h-11 items-center justify-center rounded-md border border-line-mid px-5 font-medium transition-colors hover:bg-paper-2 disabled:opacity-60"
      >
        {pending ? "Adding…" : "Add time"}
      </button>
      <Message state={state} />
    </form>
  );
}

export function DeleteWindowButton({ windowId }: { windowId: string }) {
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<AdminActionState>({});

  return (
    <>
      <button
        type="button"
        disabled={pending}
        onClick={() => {
          setMessage({});
          startTransition(async () => setMessage(await deleteWindow(windowId)));
        }}
        className="flex min-h-11 items-center rounded-md px-3 text-sm text-muted-foreground transition-colors hover:text-destructive disabled:opacity-60"
      >
        Remove
      </button>
      {message.error && (
        <p role="alert" className="text-sm font-medium text-destructive">
          {message.error}
        </p>
      )}
    </>
  );
}

function Message({ state }: { state: AdminActionState }) {
  if (state.error)
    return (
      <p role="alert" className="mt-2 text-sm font-medium text-destructive">
        {state.error}
      </p>
    );
  if (state.ok)
    return (
      <p role="status" className="mt-2 text-sm font-medium text-brand-green">
        {state.ok}
      </p>
    );
  return null;
}