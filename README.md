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

- `tests/test_house_edge.py` — credit-band cheat probabilities, single re-roll,
  pre-cost tier boundary, payout/cash-out account behavior
- `tests/test_api.py` — FastAPI `TestClient` coverage for 200 JSON shapes and
  404 / 400 edge cases

**Frontend**

```bash
cd frontend
npm install
npm run test
```

- `src/App.test.tsx` — smoke test: mocked session start shows Credits: 10 and Spin

## TODO: tests worth adding

Gaps relative to what we already cover — useful for fuller assignment/CI confidence:

### Backend

- [ ] **Payout table unit tests** — each three-of-a-kind (cherry/lemon/orange/watermelon)
      yields 10 / 20 / 30 / 40; mixed symbols yield `reward == 0`
- [ ] **Loss path** — roll with forced non-matching symbols: credits decrease by exactly 1
- [ ] **Fair band at 39 via `roll()`** — session at 39 credits, forced win + always-cheat
      RNG: win is kept (proves post-cost 38 is irrelevant; pairs with existing test at 40)
- [ ] **High-band boundary at 61** — same pattern as the mid-band integration test
- [ ] **Account accumulation** — two sequential sessions cash out; `account_balance` sums
- [ ] **API: roll after cash-out** — same `session_id` returns 404
- [ ] **API: openapi/schema smoke** — optional `TestClient` GET `/openapi.json` if reviewers
      care about contract docs

### Frontend

- [ ] **Start failure** — mock `startGame` reject; assert error message and no playable Spin
- [ ] **Spin happy path** — mock `roll`; click Spin; assert optimistic credits −1, then final
      balance/symbols after fake timers (1s / 2s / 3s reveals)
- [ ] **Spin disabled while busy** — during pending roll / reveal, Spin and Cash Out disabled
- [ ] **Cash out** — mock `cashOut`; click Cash Out; assert Game Over text and controls gone
- [ ] **Insufficient credits UX** — mock roll 400; assert error text and restored UI state
- [ ] **`SlotReel` / `SlotRow`** — spinning vs idle rendering (strip vs final symbol)
- [ ] **`api/game.ts`** — fetch helpers map non-OK responses to thrown errors (mock `fetch`)

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
pay out (🍒=10, 🍋=20, 🍊=30, 🍉=40). House-edge tiers use the balance *before*
the spin cost: at 40–60, winning results have a 30% chance of a single re-draw;
above 60 the chance is 60%. Below 40, outcomes stay fair. Cash-out moves session
credits into `users_db["default_user"]` and closes the session.
