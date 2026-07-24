# Casino Jackpot

Full-stack slot machine assignment: a React + TypeScript client and a FastAPI
backend that keeps session state on the server and applies a house-edge twist
once players climb the credit ladder.

## Prerequisites

- Python 3.12+ (3.14 works with the pinned deps)
- Node.js 20+ and npm

## Running the backend

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

- Health: http://localhost:8000/health
- Start session: `POST /api/game/start`
- Roll: `POST /api/game/{session_id}/roll`
- Cash out: `POST /api/game/{session_id}/cashout`

## Running the frontend

Start the backend first. The Vite dev server proxies `/api` to `http://127.0.0.1:8000`.

```bash
cd frontend
npm install
npm run dev
```

App: http://localhost:5173

## Running tests

**Backend**

```bash
cd backend
source .venv/bin/activate
pip install -r requirements.txt
pytest -q
```

(`backend/pytest.ini` sets `pythonpath = .` so imports resolve the same way as `uvicorn main:app`.)

- `tests/test_house_edge.py` — house-edge bands/stats, single re-roll, pre-cost
  boundaries (39/40/61), payout table, loss path, account cash-out accumulation
- `tests/test_api.py` — FastAPI `TestClient` 200 JSON shapes, 404 / 400 edges,
  roll-after-cashout

**Frontend**

```bash
cd frontend
npm install
npm run test
```

- `src/App.test.tsx` — session start, start failure, spin timing (fake timers),
  busy disables, cash-out / game over, roll error restore
- `src/components/SlotRow.test.tsx` — idle symbols vs spinning strip
- `src/api/game.test.ts` — fetch OK / error mapping

## Test coverage notes

Optional follow-ups (not required for the brief): OpenAPI schema smoke test;
multi-worker / persistent session store (current `SessionStore` and `users_db`
are in-memory and process-local, which is fine for this assignment).

## Architecture

**Backend**

- `models.py` — Pydantic response schemas
- `store.py` — `SessionStore` (in-memory) injected via `Depends(get_store)`;
  dummy `users_db` for cash-out
- `services/game.py` — start / fair roll / house edge / cash out
- `routers/game.py` — HTTP mapping and status codes

**Frontend**

- `api/game.ts` — typed `fetch` helpers
- `App.tsx` — session orchestration, phase state machine, staggered reel reveals
- `components/*` — presentational `Balance`, `SlotRow`, `GameControls`

Sessions live in process memory (not multi-worker safe). Rolls cost 1 credit.
Three matching symbols pay out (🍒=10, 🍋=20, 🍊=30, 🍉=40). House-edge tiers use
the balance *before* the spin cost: **inclusive** `40..60` → 30% chance of a
single re-draw on a win; above 60 → 60%; below 40 → fair. Cash-out moves session
credits into `users_db["default_user"]`, returns `account_balance`, and closes
the session (shown on the Game Over screen).
