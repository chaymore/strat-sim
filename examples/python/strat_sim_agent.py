"""
Minimal sample LLM client for strat-sim.

Usage (after the instructor has minted you an AI seat via the dashboard):

    export STRAT_SIM_URL=http://localhost:3001
    export STRAT_SIM_TOKEN=<api token from the dashboard>
    export STRAT_SIM_MATCH=<match id from the dashboard>
    python strat_sim_agent.py

Replace `choose_decision()` with your own LLM-driven strategy.
"""
from __future__ import annotations

import os
import sys
import time
from typing import Any, Dict, List, Optional

import urllib.request
import urllib.error
import json


SERVER = os.environ.get("STRAT_SIM_URL", "http://localhost:3001")
TOKEN = os.environ["STRAT_SIM_TOKEN"]
MATCH = os.environ["STRAT_SIM_MATCH"]


def _request(method: str, path: str, body: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
    url = f"{SERVER}{path}"
    data = json.dumps(body).encode("utf-8") if body is not None else None
    req = urllib.request.Request(
        url,
        data=data,
        method=method,
        headers={
            "Authorization": f"Bearer {TOKEN}",
            "Content-Type": "application/json",
        },
    )
    try:
        with urllib.request.urlopen(req) as r:
            return json.loads(r.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        print(f"HTTP {e.code} on {method} {path}: {e.read().decode('utf-8')}", file=sys.stderr)
        raise


def observe() -> Dict[str, Any]:
    return _request("GET", f"/api/llm/matches/{MATCH}/observe")


def act(decision: Dict[str, Any]) -> Dict[str, Any]:
    return _request("POST", f"/api/llm/matches/{MATCH}/act", decision)


def choose_decision(observation: Dict[str, Any]) -> Dict[str, Any]:
    """
    Drop-in spot for your strategy. The observation contains everything a human
    can see — your company state, competitors, consumers, and recent log lines.

    For this sample we just keep spending modestly on R&D and broad marketing.
    """
    you = observation["you"]
    turns_left = max(1, observation["maxTurns"] - observation["turn"])
    budget = you["cash"] / turns_left

    rd_total = max(0, int(budget * 0.25 / 10_000))
    return {
        "companyId": you["id"],
        "price": 299,
        "subscriptionPrice": 0,
        "rd": {
            "privacy": rd_total // 4,
            "capability": rd_total // 4,
            "design": rd_total // 4,
            "wellness": rd_total // 4,
        },
        "marketing": {"total": int(budget * 0.35), "segmentTarget": "broad"},
        "capacityInvestment": int(budget * 0.15 / 200),
        "positioningStatement": "Sample agent",
    }


def main() -> None:
    print(f"strat-sim agent against match {MATCH}")
    while True:
        result = observe()
        observation = result["observation"]
        phase = observation["phase"]
        print(f"turn {observation['turn']} phase={phase}")
        if phase == "ended":
            winner = next((c for c in observation["competitors"] if c["id"] == observation["winnerId"]), None)
            if observation["winnerId"] == observation["you"]["id"]:
                print("WON")
            elif winner:
                print(f"LOST — winner: {winner['name']}")
            else:
                print("LOST")
            return
        if phase != "decision":
            # Server is resolving or in lobby — wait briefly and try again.
            time.sleep(1.0)
            continue
        my_company = observation["you"]["id"]
        awaiting = result.get("awaitingCompanyIds", [])
        if my_company not in awaiting:
            # Already submitted this turn, just wait for resolution.
            time.sleep(0.5)
            continue
        decision = choose_decision(observation)
        act(decision)


if __name__ == "__main__":
    main()
