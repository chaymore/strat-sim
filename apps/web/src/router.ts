import { useSyncExternalStore } from "react";

export type Route =
  | { kind: "landing" }
  | { kind: "solo" }
  | { kind: "join" }
  | { kind: "instructor" }
  | { kind: "dashboard"; classCode: string }
  | { kind: "lobby"; matchCode: string }
  | { kind: "play"; matchId: string };

export function routeToHash(r: Route): string {
  switch (r.kind) {
    case "landing": return "#/";
    case "solo": return "#/solo";
    case "join": return "#/join";
    case "instructor": return "#/instructor";
    case "dashboard": return `#/instructor/${r.classCode}`;
    case "lobby": return `#/lobby/${r.matchCode}`;
    case "play": return `#/play/${r.matchId}`;
  }
}

export function hashToRoute(hash: string): Route {
  const h = hash.replace(/^#/, "");
  const parts = h.split("/").filter(Boolean);
  if (parts.length === 0) return { kind: "landing" };
  if (parts[0] === "solo") return { kind: "solo" };
  if (parts[0] === "join") return { kind: "join" };
  if (parts[0] === "instructor") {
    if (parts[1]) return { kind: "dashboard", classCode: parts[1] };
    return { kind: "instructor" };
  }
  if (parts[0] === "lobby" && parts[1]) return { kind: "lobby", matchCode: parts[1] };
  if (parts[0] === "play" && parts[1]) return { kind: "play", matchId: parts[1] };
  return { kind: "landing" };
}

function subscribe(cb: () => void): () => void {
  window.addEventListener("hashchange", cb);
  return () => window.removeEventListener("hashchange", cb);
}

export function useRoute(): Route {
  const hash = useSyncExternalStore(subscribe, () => window.location.hash, () => "#/");
  return hashToRoute(hash);
}

export function navigate(r: Route): void {
  window.location.hash = routeToHash(r);
}
