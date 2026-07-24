from services import game as game_service
from store import DEFAULT_USER_ID, SessionStore, users_db

TRIALS = 10_000
TOLERANCE = 0.03


def _force_redraws_to_lose(monkeypatch):
    monkeypatch.setattr(
        game_service,
        "_draw_symbols",
        lambda: ["🍒", "🍋", "🍊"],
    )


def _lose_rate(balance_before_spin: int, trials: int, monkeypatch) -> float:
    _force_redraws_to_lose(monkeypatch)
    losses = 0
    for _ in range(trials):
        _symbols, reward = game_service._apply_house_edge(
            balance_before_spin,
            ["🍒", "🍒", "🍒"],
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


def test_single_reroll_even_if_second_is_win(monkeypatch):
    draws = {"n": 0}

    def always_win():
        draws["n"] += 1
        return ["🍒", "🍒", "🍒"]

    monkeypatch.setattr(game_service, "_draw_symbols", always_win)
    monkeypatch.setattr(game_service.random, "random", lambda: 0.0)

    symbols, reward = game_service._apply_house_edge(50, ["🍒", "🍒", "🍒"], 10)

    assert draws["n"] == 1
    assert symbols == ["🍒", "🍒", "🍒"]
    assert reward == 10


def test_roll_uses_balance_before_cost_for_tier(monkeypatch):
    store = SessionStore()
    session = game_service.start_session(store)
    store.update_session(session.session_id, 40)

    draws = {"n": 0}

    def draw():
        draws["n"] += 1
        if draws["n"] == 1:
            return ["🍒", "🍒", "🍒"]
        return ["🍒", "🍋", "🍊"]

    monkeypatch.setattr(game_service, "_draw_symbols", draw)
    monkeypatch.setattr(game_service.random, "random", lambda: 0.0)

    result = game_service.roll(session.session_id, store)

    assert result.reward == 0
    assert result.symbols == ["🍒", "🍋", "🍊"]
    assert result.credits == 39


def test_roll_fair_session_applies_cost_and_payout(monkeypatch):
    store = SessionStore()
    session = game_service.start_session(store)
    store.update_session(session.session_id, 10)

    monkeypatch.setattr(
        game_service,
        "_draw_symbols",
        lambda: ["🍒", "🍒", "🍒"],
    )
    monkeypatch.setattr(game_service.random, "random", lambda: 1.0)

    result = game_service.roll(session.session_id, store)
    assert result.reward == 10
    assert result.credits == 19
    assert result.symbols == ["🍒", "🍒", "🍒"]


def test_cash_out_credits_user_account():
    users_db[DEFAULT_USER_ID] = 0
    store = SessionStore()
    session = game_service.start_session(store)

    cash = game_service.cash_out(session.session_id, store)

    assert cash.amount == 10
    assert cash.account_balance == 10
    assert users_db[DEFAULT_USER_ID] == 10
    assert store.get_session(session.session_id) is None

    try:
        game_service.cash_out(session.session_id, store)
        raise AssertionError("expected SessionNotFoundError")
    except game_service.SessionNotFoundError:
        pass


def test_payout_table_for_matching_and_mixed_symbols():
    assert game_service._calculate_reward(["🍒", "🍒", "🍒"]) == 10
    assert game_service._calculate_reward(["🍋", "🍋", "🍋"]) == 20
    assert game_service._calculate_reward(["🍊", "🍊", "🍊"]) == 30
    assert game_service._calculate_reward(["🍉", "🍉", "🍉"]) == 40
    assert game_service._calculate_reward(["🍒", "🍋", "🍊"]) == 0


def test_roll_loss_deducts_exactly_one_credit(monkeypatch):
    store = SessionStore()
    session = game_service.start_session(store)
    monkeypatch.setattr(
        game_service,
        "_draw_symbols",
        lambda: ["🍒", "🍋", "🍊"],
    )

    result = game_service.roll(session.session_id, store)

    assert result.reward == 0
    assert result.credits == 9


def test_roll_fair_band_at_39_keeps_win_despite_cheat_rng(monkeypatch):
    store = SessionStore()
    session = game_service.start_session(store)
    store.update_session(session.session_id, 39)
    monkeypatch.setattr(
        game_service,
        "_draw_symbols",
        lambda: ["🍒", "🍒", "🍒"],
    )
    monkeypatch.setattr(game_service.random, "random", lambda: 0.0)

    result = game_service.roll(session.session_id, store)

    assert result.reward == 10
    assert result.credits == 48


def test_roll_high_band_at_61_can_reroll_win_to_loss(monkeypatch):
    store = SessionStore()
    session = game_service.start_session(store)
    store.update_session(session.session_id, 61)

    draws = {"n": 0}

    def draw():
        draws["n"] += 1
        if draws["n"] == 1:
            return ["🍒", "🍒", "🍒"]
        return ["🍒", "🍋", "🍊"]

    monkeypatch.setattr(game_service, "_draw_symbols", draw)
    monkeypatch.setattr(game_service.random, "random", lambda: 0.0)

    result = game_service.roll(session.session_id, store)

    assert result.reward == 0
    assert result.symbols == ["🍒", "🍋", "🍊"]
    assert result.credits == 60


def test_cash_out_accumulates_account_balance():
    users_db[DEFAULT_USER_ID] = 0
    store = SessionStore()

    first = game_service.start_session(store)
    cash1 = game_service.cash_out(first.session_id, store)
    assert cash1.account_balance == 10

    second = game_service.start_session(store)
    cash2 = game_service.cash_out(second.session_id, store)
    assert cash2.amount == 10
    assert cash2.account_balance == 20
    assert users_db[DEFAULT_USER_ID] == 20
