import random
import uuid

from models import RollResponse, SessionResponse
from store import SessionStore, session_store

STARTING_CREDITS = 10
ROLL_COST = 1
SYMBOLS = ("C", "L", "O", "W")
PAYOUTS = {"C": 10, "L": 20, "O": 30, "W": 40}


class SessionNotFoundError(Exception):
    pass


class InsufficientCreditsError(Exception):
    pass


def start_session(store: SessionStore = session_store) -> SessionResponse:
    session_id = str(uuid.uuid4())
    store.create_session(session_id, STARTING_CREDITS)
    return SessionResponse(session_id=session_id, credits=STARTING_CREDITS)


def _draw_symbols() -> list[str]:
    return [random.choice(SYMBOLS) for _ in range(3)]


def _calculate_reward(symbols: list[str]) -> int:
    if symbols[0] == symbols[1] == symbols[2]:
        return PAYOUTS[symbols[0]]
    return 0


def roll(session_id: str, store: SessionStore = session_store) -> RollResponse:
    credits = store.get_session(session_id)
    if credits is None:
        raise SessionNotFoundError(session_id)
    if credits < ROLL_COST:
        raise InsufficientCreditsError(session_id)

    credits -= ROLL_COST
    symbols = _draw_symbols()
    reward = _calculate_reward(symbols)
    credits += reward
    store.update_session(session_id, credits)

    return RollResponse(
        session_id=session_id,
        symbols=symbols,
        reward=reward,
        credits=credits,
    )
