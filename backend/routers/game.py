from fastapi import APIRouter, Depends, HTTPException

from models import CashOutResponse, RollResponse, SessionResponse
from services import game as game_service
from store import SessionStore, get_store

router = APIRouter(prefix="/api/game")


@router.post("/start", response_model=SessionResponse)
def start_game(store: SessionStore = Depends(get_store)) -> SessionResponse:
    return game_service.start_session(store)


@router.post("/{session_id}/roll", response_model=RollResponse)
def roll(
    session_id: str,
    store: SessionStore = Depends(get_store),
) -> RollResponse:
    try:
        return game_service.roll(session_id, store)
    except game_service.SessionNotFoundError:
        raise HTTPException(status_code=404, detail="Session not found")
    except game_service.InsufficientCreditsError:
        raise HTTPException(status_code=400, detail="Insufficient credits")


@router.post("/{session_id}/cashout", response_model=CashOutResponse)
def cashout(
    session_id: str,
    store: SessionStore = Depends(get_store),
) -> CashOutResponse:
    try:
        return game_service.cash_out(session_id, store)
    except game_service.SessionNotFoundError:
        raise HTTPException(status_code=404, detail="Session not found")
