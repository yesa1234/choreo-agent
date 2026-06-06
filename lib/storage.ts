import { ChoreoProject, emptyProject } from "./types";

const KEY = "choreo:project:v3";
const LEGACY_KEYS = ["choreo:project:v1", "choreo:project:v2"];

export function loadProject(): ChoreoProject {
  if (typeof window === "undefined") return emptyProject();
  try {
    for (const k of LEGACY_KEYS) window.localStorage.removeItem(k);
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return emptyProject();
    return JSON.parse(raw) as ChoreoProject;
  } catch {
    return emptyProject();
  }
}

export function saveProject(p: ChoreoProject) {
  if (typeof window === "undefined") return;
  p.updatedAt = Date.now();
  window.localStorage.setItem(KEY, JSON.stringify(p));
}

export function resetProject(): ChoreoProject {
  const p = emptyProject();
  saveProject(p);
  return p;
}
