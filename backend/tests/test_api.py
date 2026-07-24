import pytest
from fastapi.testclient import TestClient

from main import app
from store import DEFAULT_USER_ID, SessionStore, get_store, users_db


@pytest.fixture(autouse=True)
def reset_users_db():
    users_db[DEFAULT_USER_ID] = 0
    yield
    users_db[DEFAULT_USER_ID] = 0


@pytest.fixture
def store() -> SessionStore:
    return SessionStore()


@pytest.fixture
def client(store: SessionStore):
    app.dependency_overrides[get_store] = lambda: store
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()


def test_start_returns_session_json(client: TestClient):
    response = client.post("/api/game/start")
    assert response.status_code == 200
    body = response.json()
    assert set(body.keys()) == {"session_id", "credits"}
    assert isinstance(body["session_id"], str)
    assert body["credits"] == 10


def test_roll_returns_symbols_reward_and_credits(
    client: TestClient, store: SessionStore
):
    start = client.post("/api/game/start").json()
    session_id = start["session_id"]

    response = client.post(f"/api/game/{session_id}/roll")
    assert response.status_code == 200
    body = response.json()
    assert set(body.keys()) == {"session_id", "symbols", "reward", "credits"}
    assert body["session_id"] == session_id
    assert len(body["symbols"]) == 3
    assert all(symbol in {"🍒", "🍋", "🍊", "🍉"} for symbol in body["symbols"])
    assert isinstance(body["reward"], int)
    assert body["credits"] == store.get_session(session_id)


def test_cashout_returns_amount_json(client: TestClient, store: SessionStore):
    start = client.post("/api/game/start").json()
    session_id = start["session_id"]

    response = client.post(f"/api/game/{session_id}/cashout")
    assert response.status_code == 200
    body = response.json()
    assert set(body.keys()) == {"session_id", "amount", "account_balance"}
    assert body["session_id"] == session_id
    assert body["amount"] == 10
    assert body["account_balance"] == 10
    assert store.get_session(session_id) is None
    assert users_db[DEFAULT_USER_ID] == 10


def test_roll_unknown_session_returns_404(client: TestClient):
    response = client.post("/api/game/does-not-exist/roll")
    assert response.status_code == 404
    assert response.json() == {"detail": "Session not found"}


def test_cashout_unknown_session_returns_404(client: TestClient):
    response = client.post("/api/game/does-not-exist/cashout")
    assert response.status_code == 404
    assert response.json() == {"detail": "Session not found"}


def test_roll_with_zero_credits_returns_400(client: TestClient, store: SessionStore):
    start = client.post("/api/game/start").json()
    session_id = start["session_id"]
    store.update_session(session_id, 0)

    response = client.post(f"/api/game/{session_id}/roll")
    assert response.status_code == 400
    assert response.json() == {"detail": "Insufficient credits"}


def test_health(client: TestClient):
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}
