from services import game as game_service
from store import SessionStore

TRIALS = 10_000
TOLERANCE = 0.03


def _force_redraws_to_lose(monkeypatch):
    monkeypatch.setattr(
        game_service,
        "_draw_symbols",
        lambda: ["C", "L", "O"],
    )


def _lose_rate(balance_before_win: int, trials: int, monkeypatch) -> float:
    _force_redraws_to_lose(monkeypatch)
    losses = 0
    for _ in range(trials):
        _symbols, reward = game_service._apply_house_edge(
            balance_before_win,
            ["C", "C", "C"],
            10,
        )
        if reward == 0:
            losses += 1
    return losses / trials


def test_cheat_probability_bands():
    assert game_service._cheat_probability(39) == 0.0
    assert game_service._cheat_probability(40) == 0.30
    assert game_service._cheat_probability(60) == 0.30
    assert game_service._cheat_probability(61) == 0.60


def test_fair_band_never_rerolls(monkeypatch):
    rate = _lose_rate(20, 1_000, monkeypatch)
    assert rate == 0.0


def test_mid_band_reroll_rate_near_30_percent(monkeypatch):
    rate = _lose_rate(50, TRIALS, monkeypatch)
    assert abs(rate - 0.30) <= TOLERANCE


def test_high_band_reroll_rate_near_60_percent(monkeypatch):
    rate = _lose_rate(70, TRIALS, monkeypatch)
    assert abs(rate - 0.60) <= TOLERANCE


def test_roll_fair_session_applies_cost_and_payout(monkeypatch):
    store = SessionStore()
    session = game_service.start_session(store)
    store.update_session(session.session_id, 10)

    monkeypatch.setattr(
        game_service,
        "_draw_symbols",
        lambda: ["C", "C", "C"],
    )
    monkeypatch.setattr(game_service.random, "random", lambda: 1.0)

    result = game_service.roll(session.session_id, store)
    assert result.reward == 10
    assert result.credits == 19
    assert result.symbols == ["C", "C", "C"]


def test_cash_out_deletes_session():
    store = SessionStore()
    session = game_service.start_session(store)
    cash = game_service.cash_out(session.session_id, store)
    assert cash.amount == 10
    assert store.get_session(session.session_id) is None

    try:
        game_service.cash_out(session.session_id, store)
        raise AssertionError("expected SessionNotFoundError")
    except game_service.SessionNotFoundError:
        pass
