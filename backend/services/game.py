import random
import uuid

from models import CashOutResponse, RollResponse, SessionResponse
from store import SessionStore, credit_account

STARTING_CREDITS = 10
ROLL_COST = 1
SYMBOLS = ("🍒", "🍋", "🍊", "🍉")
PAYOUTS = {"🍒": 10, "🍋": 20, "🍊": 30, "🍉": 40}


class SessionNotFoundError(Exception):
    pass


class InsufficientCreditsError(Exception):
    pass


def start_session(store: SessionStore) -> SessionResponse:
    session_id = str(uuid.uuid4())
    store.create_session(session_id, STARTING_CREDITS)
    return SessionResponse(session_id=session_id, credits=STARTING_CREDITS)


def _draw_symbols() -> list[str]:
    return [random.choice(SYMBOLS) for _ in range(3)]


def _calculate_reward(symbols: list[str]) -> int:
    if symbols[0] == symbols[1] == symbols[2]:
        return PAYOUTS[symbols[0]]
    return 0


def _cheat_probability(balance_before_spin: int) -> float:
    if balance_before_spin < 40:
        return 0.0
    if balance_before_spin <= 60:
        return 0.30
    return 0.60


def _apply_house_edge(
    balance_before_spin: int,
    symbols: list[str],
    reward: int,
) -> tuple[list[str], int]:
    if reward > 0:
        p = _cheat_probability(balance_before_spin)
        if p > 0.0 and random.random() < p:
            symbols = _draw_symbols()
            reward = _calculate_reward(symbols)
    return symbols, reward


def roll(session_id: str, store: SessionStore) -> RollResponse:
    credits = store.get_session(session_id)
    if credits is None:
        raise SessionNotFoundError(session_id)
    if credits < ROLL_COST:
        raise InsufficientCreditsError(session_id)

    balance_before_spin = credits
    credits -= ROLL_COST
    symbols = _draw_symbols()
    reward = _calculate_reward(symbols)
    symbols, reward = _apply_house_edge(balance_before_spin, symbols, reward)
    credits += reward
    store.update_session(session_id, credits)

    return RollResponse(
        session_id=session_id,
        symbols=symbols,
        reward=reward,
        credits=credits,
    )


def cash_out(session_id: str, store: SessionStore) -> CashOutResponse:
    amount = store.delete_session(session_id)
    if amount is None:
        raise SessionNotFoundError(session_id)
    account_balance = credit_account(amount)
    return CashOutResponse(
        session_id=session_id,
        amount=amount,
        account_balance=account_balance,
    )
