# Casino Jackpot

Full-stack slot machine for the Mano assignment: FastAPI keeps the session on the
server (and quietly tilts the odds once you get rich), React + TypeScript shows a
simple three-reel UI with staggered reveals.

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

CI (`.github/workflows/ci.yml`) runs backend Ruff + pytest and frontend format /
lint / Vitest / typecheck on pushes and PRs to `main`.

## Architecture

### High-level flow

```text
Browser (Vite :5173)
  └─ /api/*  ──proxy──►  FastAPI (:8000)
                            ├─ routers/game.py     HTTP
                            ├─ services/game.py    rules (roll, house edge, cash-out)
                            ├─ store.py            sessions + users_db
                            └─ models.py           response schemas
```

1. On load the client calls `POST /api/game/start` and stores `session_id` + credits.
2. **Spin** calls `POST /api/game/{id}/roll`. The server charges 1 credit, draws three
   symbols, may apply house edge, then returns symbols / reward / new balance.
3. The UI shows a vertical reel spin immediately, then reveals symbols at 1s / 2s / 3s
   after the response. Displayed balance drops by 1 on click; winnings apply only when
   the third reel stops.
4. **Cash Out** calls `POST /api/game/{id}/cashout`, moves session credits into
   `users_db["default_user"]`, closes the session, and shows Game Over (including
   `account_balance`).

### Backend layout

| Piece | Role |
|-------|------|
| `models.py` | Pydantic responses (`SessionResponse`, `RollResponse`, `CashOutResponse`) |
| `store.py` | `SessionStore` (in-memory `session_id → credits`) + dummy `users_db` |
| `services/game.py` | Start / roll / cash-out; fair RNG; house-edge helpers |
| `routers/game.py` | Thin HTTP layer; `SessionStore` via FastAPI `Depends(get_store)` |
| `main.py` | App factory, `/health`, mounts game router |

**Game rules (server is source of truth)**

- New session starts with **10** credits; each roll costs **1**.
- Win = three identical symbols: 🍒=10, 🍋=20, 🍊=30, 🍉=40.
- House edge uses the balance **before** deducting the spin cost:
  - below 40 → fair
  - **inclusive** `40..60` → 30% chance to re-draw a winning outcome once
  - above 60 → 60% chance, still a **single** re-roll (if the second draw wins, it stands)
- Cash-out credits the dummy account and deletes the session.

In-memory storage is enough for the assignment; it is not multi-worker safe.

### Frontend layout

| Piece | Role |
|-------|------|
| `api/game.ts` | Typed `fetch` wrappers for start / roll / cash-out |
| `App.tsx` | Phase state machine (`loading` / `ready` / `busy` / `gameover` / `error`), timers |
| `Balance`, `SlotRow` / `SlotReel`, `SpinButton`, `CashOutButton` | Presentational UI |
| `types/game.ts` | Shared TS types (`SlotSymbol`, `DisplaySymbol`, API payloads) |

Spin sits **next to** the three reels (brief requirement). Reels use a vertical
scrolling strip while spinning, then hard-stop to the server symbols on the
staggered schedule.

## Development Journey

### Thought process

I treated this as a small production-shaped monorepo rather than a single script.
The brief puts session truth and the house-edge “cheat” on the server, so I built
**backend first**: fair start/roll, then house edge + cash-out, with clear layers
(models → store → service → router) so rules stay testable without going through HTTP
for every assertion.

On the client I kept orchestration in `App` and pushed rendering into small
components. That made it easier to add staggered reveals and a more realistic reel
animation later without rewriting the API wiring. I also invested early in tooling
(Ruff, ESLint/Prettier, Vitest, GitHub Actions) so regressions would show up in CI
instead of only during a manual playthrough.

Stack choice was pragmatic: **FastAPI + Pydantic** for a typed JSON API with little
boilerplate, **Vite + React + TypeScript** for a fast UI loop. Fruit emojis replaced
letter symbols for readability once the core loop worked.

### Challenges faced

1. **House-edge timing and “between 40 and 60”.** Early versions checked the balance
   after deducting the spin cost, which pushed a player at exactly 40 into the fair
   band. Review feedback also pushed for a **single** re-roll (`if`), not a loop that
   could keep discarding wins. Inclusive `40..60` → 30% needed to be explicit in code
   and docs for reviewers.

2. **Proving the cheat rates in tests.** Natural three-of-a-kind odds are low, so a
   naive “simulate many full games” test is noisy. Isolating `_apply_house_edge` with a
   forced initial win and a losing re-draw made the 30% / 60% coin-flip measurable.

3. **React Strict Mode vs session bootstrap.** Double-mounting in development could
   call `startGame` twice and orphan sessions. A `useRef` guard keeps bootstrap once.

4. **Staggered UI vs server balance.** The brief wants −1 credit feel immediately, but
   winnings only after the third reel stops. That meant optimistic credits, holding the
   roll payload, and `spinId` / timeout cleanup so stale timers cannot corrupt state.

5. **CORS and local DX.** Separate Vite and uvicorn ports. A Vite `/api` proxy kept the
   browser same-origin without backend CORS middleware for local work.

6. **Frontend test depth.** A single smoke test was not enough for review. Covering spin
   timing needed fake timers; Strict Mode + `mockRejectedValueOnce` caused flaky start-
   failure tests until mocks rejected consistently; spinning strips contain many fruit
   nodes, so assertions target `.slot-reel__symbol` rather than bare `getByText`.

7. **Cash-out “user account”.** The brief asks to move credits to an account. A dummy
   `users_db` plus `account_balance` on the response (and on the Game Over screen)
   makes that requirement visible without a real auth system.

### Solutions implemented

- Layered FastAPI backend with DI (`Depends(get_store)`), RESTful
  `POST /api/game/{session_id}/roll|cashout`, and house edge on **pre-spin** balance
  with one re-draw max.
- React UI with phase machine, Spin beside the reels, vertical reel CSS, staggered
  1s/2s/3s reveals, and Game Over showing cashed amount + account balance.
- Backend pytest (logic stats + `TestClient` HTTP) and Vitest + Testing Library
  (App flows, SlotRow, API helpers).
- Ruff / ESLint / Prettier and a GitHub Actions workflow so lint, format, and tests
  run on `main` PRs.
- README + CI notes that storage is in-memory (acceptable here) and that the mid
  house-edge band is inclusive `40..60`.

### Result

A playable full-stack slot machine that matches the assignment: server-owned
sessions, credit cost and payouts, house edge that kicks in as credits climb,
cash-out into a dummy account, and a minimal client with the required timing and
layout. The repo is structured and tested as something I would be comfortable
handing to a reviewer as “production-minded” coursework rather than a one-off demo.
