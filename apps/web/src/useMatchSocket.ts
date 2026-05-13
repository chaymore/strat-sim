import { useEffect, useRef, useState } from "react";
import type {
  CompanyId,
  LobbyState,
  ObservationView,
  ServerMessage,
} from "@strat-sim/shared";
import { MatchSocket } from "./ws.js";

export interface MatchSocketState {
  socket: MatchSocket | null;
  lobby: LobbyState | null;
  observation: ObservationView | null;
  awaitingCompanyIds: CompanyId[];
  matchEnded: boolean;
  error: string | null;
}

export function useMatchSocket(matchId: string | null, token: string | null): MatchSocketState {
  const [state, setState] = useState<MatchSocketState>({
    socket: null,
    lobby: null,
    observation: null,
    awaitingCompanyIds: [],
    matchEnded: false,
    error: null,
  });
  const socketRef = useRef<MatchSocket | null>(null);

  useEffect(() => {
    if (!matchId || !token) return;
    const ms = new MatchSocket(matchId, token);
    socketRef.current = ms;
    setState((s) => ({ ...s, socket: ms }));
    const off = ms.on((msg: ServerMessage) => {
      setState((prev) => {
        switch (msg.type) {
          case "lobby":
            return { ...prev, lobby: msg.lobby };
          case "observation":
            return {
              ...prev,
              observation: msg.observation,
              awaitingCompanyIds: msg.awaitingCompanyIds,
              matchEnded: msg.observation.phase === "ended",
            };
          case "turn-resolved":
            return {
              ...prev,
              observation: msg.observation,
              awaitingCompanyIds: [],
              matchEnded: msg.observation.phase === "ended",
            };
          case "match-ended":
            return { ...prev, observation: msg.observation, matchEnded: true };
          case "error":
            return { ...prev, error: msg.message };
        }
      });
    });
    ms.open();
    return () => {
      off();
      ms.close();
      socketRef.current = null;
    };
  }, [matchId, token]);

  return state;
}
