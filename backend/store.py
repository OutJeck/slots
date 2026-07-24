DEFAULT_USER_ID = "default_user"
users_db: dict[str, int] = {DEFAULT_USER_ID: 0}


def credit_account(amount: int, user_id: str = DEFAULT_USER_ID) -> int:
    users_db[user_id] = users_db.get(user_id, 0) + amount
    return users_db[user_id]


class SessionStore:
    def __init__(self) -> None:
        self._sessions: dict[str, int] = {}

    def create_session(self, session_id: str, credits: int = 10) -> None:
        self._sessions[session_id] = credits

    def get_session(self, session_id: str) -> int | None:
        return self._sessions.get(session_id)

    def update_session(self, session_id: str, credits: int) -> None:
        self._sessions[session_id] = credits

    def delete_session(self, session_id: str) -> int | None:
        return self._sessions.pop(session_id, None)


session_store = SessionStore()


def get_store() -> SessionStore:
    return session_store
