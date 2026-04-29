/**
 * Tiny pub/sub for coarse mission_event side-effects (e.g. SWARM_DETECTED)
 * so socket code does not import future feature modules.
 */

type MissionEventListener = (eventType: string, payload: unknown) => void;

const listeners = new Set<MissionEventListener>();

/** Returns unsubscribe. */
export function subscribe(fn: MissionEventListener): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function publish(eventType: string, payload: unknown): void {
  for (const l of listeners) {
    l(eventType, payload);
  }
}
