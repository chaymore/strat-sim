import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface MatchSession {
  matchId: string;
  matchCode: string;
  playerId: string;
  playerToken: string;
  companyId: string;
  name: string;
}

export interface InstructorSession {
  classCode: string;
  instructorToken: string;
  className: string;
}

interface SessionState {
  match: MatchSession | null;
  instructor: InstructorSession | null;
  setMatchSession: (m: MatchSession | null) => void;
  setInstructorSession: (i: InstructorSession | null) => void;
}

export const useSession = create<SessionState>()(
  persist(
    (set) => ({
      match: null,
      instructor: null,
      setMatchSession: (m) => set({ match: m }),
      setInstructorSession: (i) => set({ instructor: i }),
    }),
    { name: "strat-sim-session" },
  ),
);
