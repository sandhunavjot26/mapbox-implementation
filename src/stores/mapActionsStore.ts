import type { Target } from "@/mock/targets";

export type InterceptState = "vectoring" | "engaging" | "neutralized";

export interface Intercept {
  targetId: string;
  assetId: string;
  state: InterceptState;
  startedAt: number;
  completedAt?: number;
}

type ReclassifyHandler = (id: string, classification: Target["classification"]) => void;
type ConfirmThreatHandler = (id: string) => void;

let reclassifyHandler: ReclassifyHandler | null = null;
let confirmThreatHandler: ConfirmThreatHandler | null = null;

let computedTargets: (Target & { confirmed?: boolean })[] = [];
let pulseTargetIds: string[] = [];
let intercepts: Intercept[] = [];

type Subscriber<T> = (value: T) => void;
const computedTargetsSubscribers = new Set<Subscriber<(Target & { confirmed?: boolean })[]>>();
const pulseTargetIdsSubscribers = new Set<Subscriber<string[]>>();
const interceptsSubscribers = new Set<Subscriber<Intercept[]>>();

export function registerMapActions(handlers: {
  reclassifyTarget: ReclassifyHandler;
  confirmThreat: ConfirmThreatHandler;
}) {
  reclassifyHandler = handlers.reclassifyTarget;
  confirmThreatHandler = handlers.confirmThreat;
}

export function reclassifyTarget(id: string, classification: Target["classification"]) {
  reclassifyHandler?.(id, classification);
}

export function confirmThreat(id: string) {
  confirmThreatHandler?.(id);
}

export function setComputedTargets(targets: (Target & { confirmed?: boolean })[]) {
  computedTargets = targets;
  computedTargetsSubscribers.forEach((cb) => cb(computedTargets));
}

export function getComputedTargets() {
  return computedTargets;
}

export function subscribeToComputedTargets(cb: Subscriber<(Target & { confirmed?: boolean })[]>) {
  computedTargetsSubscribers.add(cb);
  cb(computedTargets);
  return () => {
    computedTargetsSubscribers.delete(cb);
  };
}

export function setPulseTargetIds(ids: string[]) {
  pulseTargetIds = ids;
  pulseTargetIdsSubscribers.forEach((cb) => cb(pulseTargetIds));
}

export function addPulseTarget(id: string) {
  if (pulseTargetIds.includes(id)) return;
  pulseTargetIds = [...pulseTargetIds, id];
  pulseTargetIdsSubscribers.forEach((cb) => cb(pulseTargetIds));
  setTimeout(() => {
    pulseTargetIds = pulseTargetIds.filter((x) => x !== id);
    pulseTargetIdsSubscribers.forEach((cb) => cb(pulseTargetIds));
  }, 2000);
}

export function getPulseTargetIds() {
  return pulseTargetIds;
}

export function subscribeToPulseTargets(cb: Subscriber<string[]>) {
  pulseTargetIdsSubscribers.add(cb);
  cb(pulseTargetIds);
  return () => {
    pulseTargetIdsSubscribers.delete(cb);
  };
}

export function addIntercept(targetId: string, assetId: string) {
  const intercept: Intercept = {
    targetId,
    assetId,
    state: "vectoring",
    startedAt: Date.now(),
  };
  intercepts = [...intercepts, intercept];
  interceptsSubscribers.forEach((cb) => cb(intercepts));

  // Mock state progression: vectoring -> engaging (3s) -> neutralized (5s)
  setTimeout(() => {
    updateInterceptState(targetId, "engaging");
  }, 3000);
  setTimeout(() => {
    updateInterceptState(targetId, "neutralized");
  }, 8000);
}

export interface EngagementLogEntry {
  targetId: string;
  assetId: string;
  startedAt: number;
  completedAt: number;
}

let engagementLog: EngagementLogEntry[] = [];
const engagementLogSubscribers = new Set<Subscriber<EngagementLogEntry[]>>();

export function updateInterceptState(targetId: string, state: InterceptState) {
  intercepts = intercepts.map((i) =>
    i.targetId === targetId
      ? {
          ...i,
          state,
          completedAt: state === "neutralized" ? Date.now() : i.completedAt,
        }
      : i
  );
  interceptsSubscribers.forEach((cb) => cb(intercepts));

  if (state === "neutralized") {
    const intercept = intercepts.find((i) => i.targetId === targetId);
    if (intercept?.completedAt) {
      engagementLog = [
        { targetId, assetId: intercept.assetId, startedAt: intercept.startedAt, completedAt: intercept.completedAt },
        ...engagementLog,
      ].slice(0, 50);
      engagementLogSubscribers.forEach((cb) => cb(engagementLog));
    }
  }
}

export function getEngagementLog() {
  return engagementLog;
}

export function subscribeToEngagementLog(cb: Subscriber<EngagementLogEntry[]>) {
  engagementLogSubscribers.add(cb);
  cb(engagementLog);
  return () => {
    engagementLogSubscribers.delete(cb);
  };
}

export function getIntercepts() {
  return intercepts;
}

export function subscribeToIntercepts(cb: Subscriber<Intercept[]>) {
  interceptsSubscribers.add(cb);
  cb(intercepts);
  return () => {
    interceptsSubscribers.delete(cb);
  };
}

export function getInterceptStats() {
  const neutralized = intercepts.filter((i) => i.state === "neutralized").length;
  const confirmed = intercepts.length; // simplified: each intercept = 1 confirmed
  const successRate = confirmed > 0 ? Math.round((neutralized / confirmed) * 100) : 0;
  return { neutralized, confirmed, successRate };
}

export function getNeutralizedTargetIds(): string[] {
  return intercepts
    .filter((i) => i.state === "neutralized")
    .map((i) => i.targetId);
}
