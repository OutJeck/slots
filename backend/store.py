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
