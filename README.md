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

```bash
cd backend
source .venv/bin/activate
pip install -r requirements.txt
pytest -q
```

(`backend/pytest.ini` sets `pythonpath = .` so imports resolve the same way as `uvicorn main:app`.)

- `tests/test_house_edge.py` — credit-band cheat probabilities and statistical
  checks that mid/high bands re-roll winning outcomes near 30% / 60%
- `tests/test_api.py` — FastAPI `TestClient` coverage for 200 JSON shapes and
  404 / 400 edge cases

## Architecture

**Backend**

- `models.py` — Pydantic response schemas
- `store.py` — `SessionStore` (in-memory) injected via `Depends(get_store)`
- `services/game.py` — start / fair roll / house edge / cash out
- `routers/game.py` — HTTP mapping and status codes

**Frontend**

- `api/game.ts` — typed `fetch` helpers
- `App.tsx` — session orchestration, phase state machine, staggered reel reveals
- `components/*` — presentational `Balance`, `SlotRow`, `GameControls`

Sessions live in process memory. Rolls cost 1 credit. Three matching symbols
pay out (C=10, L=20, O=30, W=40). When `balance_before_win` is 40–60, winning
results have a 30% chance to be re-drawn; above 60 the chance is 60%. Below 40,
outcomes stay fair.
