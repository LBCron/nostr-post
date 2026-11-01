// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest';

describe('<np-activity>', async () => {
  await import('./activityPanel');
  const { dismissActivity, getActivities, startActivity } = await import(
    '@nostr-post/plugins/activity'
  );
  const { RELAYS_PENDING_EVENT } = await import('@nostr-post/signer');
  const clear = () => {
    for (const a of getActivities()) dismissActivity(a.id);
  };
  const leaving = () => {
    const e = new Event('beforeunload', { cancelable: true });
    window.dispatchEvent(e);
    return e.defaultPrevented;
  };
  const relays = (pending: number, sent: number, failed = 0) =>
    window.dispatchEvent(
      new CustomEvent(RELAYS_PENDING_EVENT, { detail: { pending, sent, failed } })
    );

  it('is added to the page only for activities it shows', () => {
    const hidden = startActivity('Uploading a.jpg', { hidden: true });
    expect(document.querySelector('np-activity')).toBeNull();
    hidden.done();
    startActivity('Uploading b.jpg');
    expect(document.querySelector('np-activity')).not.toBeNull();
    clear();
  });

  it('asks before leaving while events are still sent to relays', () => {
    expect(leaving()).toBe(false);
    relays(2, 1);
    expect(getActivities().map((a) => [a.label, a.detail])).toEqual([
      ['Sending to relays…', '2 relays left'],
    ]);
    expect(leaving()).toBe(true);
    relays(0, 3);
    expect(getActivities().map((a) => [a.label, a.state])).toEqual([
      ['Sent to 3 of 3 relays', 'done'],
    ]);
    expect(leaving()).toBe(false);
    clear();
  });
});
