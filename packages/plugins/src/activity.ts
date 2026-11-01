/**
 * @nostr-post/plugins/activity - work that runs in the background
 *
 * Plugins and components report what they're doing (an upload, events still being sent to
 * relays) so a UI can show it without blocking the page, e.g. `<np-activity>` from
 * `@nostr-post/web`. Framework-free: a list of activities and listeners.
 */

export type ActivityState = 'running' | 'done' | 'failed';

export interface Activity {
  readonly id: number;
  /** What's happening, e.g. "Uploading photo.jpg" */
  readonly label: string;
  /** More about it, e.g. "3 relays left" or why it failed */
  readonly detail?: string;
  /** 0–1 when it's known how far along it is */
  readonly progress?: number;
  readonly state: ActivityState;
  /** Adds to the form being written (an upload): the composer waits for it before publishing */
  readonly blocksPublish?: boolean;
  /** Leaving the page would lose it (events not yet on every relay): UIs warn */
  readonly warnOnLeave?: boolean;
  /** Not listed by <np-activity>: the component that started it shows it itself */
  readonly hidden?: boolean;
}

export interface ActivityOptions {
  detail?: string;
  blocksPublish?: boolean;
  warnOnLeave?: boolean;
  hidden?: boolean;
}

export interface ActivityHandle {
  readonly id: number;
  update(patch: { label?: string; detail?: string; progress?: number }): void;
  /** Finished; shown for DONE_VISIBLE_MS, then removed */
  done(label?: string, detail?: string): void;
  /** Failed; shown until dismissed */
  fail(detail: string): void;
}

type Listener = (activities: readonly Activity[]) => void;

/** How long a finished activity stays listed */
export const DONE_VISIBLE_MS = 4000;

let activities: readonly Activity[] = [];
let nextId = 1;
const listeners = new Set<Listener>();

const setActivities = (next: readonly Activity[]): void => {
  activities = next;
  for (const listener of listeners) listener(activities);
};

const patchActivity = (id: number, patch: Partial<Omit<Activity, 'id'>>): void => {
  if (!activities.some((a) => a.id === id)) return;
  setActivities(activities.map((a) => (a.id === id ? { ...a, ...patch } : a)));
};

/** Remove an activity from the list (e.g. the user closed a failed one) */
export function dismissActivity(id: number): void {
  if (activities.some((a) => a.id === id)) setActivities(activities.filter((a) => a.id !== id));
}

/** Start reporting an activity; update and finish it through the returned handle */
export function startActivity(label: string, options: ActivityOptions = {}): ActivityHandle {
  const id = nextId++;
  setActivities([...activities, { id, label, ...options, state: 'running' }]);
  return {
    id,
    update: (patch) => patchActivity(id, patch),
    done: (doneLabel, doneDetail) => {
      patchActivity(id, {
        state: 'done',
        progress: undefined,
        ...(doneLabel ? { label: doneLabel } : {}),
        detail: doneDetail,
      });
      setTimeout(() => dismissActivity(id), DONE_VISIBLE_MS);
    },
    fail: (failDetail) =>
      patchActivity(id, { state: 'failed', progress: undefined, detail: failDetail }),
  };
}

/** The activities now listed: running ones, and finished ones still shown */
export function getActivities(): readonly Activity[] {
  return activities;
}

/** Call `listener` on every change; returns a function that stops it */
export function subscribeActivities(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** Running activities the composer waits for before publishing (`blocksPublish`) */
export function publishBlockers(): readonly Activity[] {
  return activities.filter((a) => a.blocksPublish && a.state === 'running');
}

/**
 * Resolves when the publish blockers running now have finished, with the ones that failed
 * (dismissed ones count as finished)
 */
export function waitForPublishBlockers(): Promise<readonly Activity[]> {
  const waiting = new Set(publishBlockers().map((a) => a.id));
  return new Promise((resolve) => {
    let stop: (() => void) | undefined;
    const check = (list: readonly Activity[]): void => {
      const mine = list.filter((a) => waiting.has(a.id));
      if (mine.some((a) => a.state === 'running')) return;
      stop?.();
      resolve(mine.filter((a) => a.state === 'failed'));
    };
    stop = subscribeActivities(check);
    check(activities);
  });
}
