from fastapi import APIRouter, HTTPException

from models import RollResponse, SessionResponse
from services import game as game_service

router = APIRouter(prefix="/api/game")


@router.post("/start", response_model=SessionResponse)
def start_game() -> SessionResponse:
    return game_service.start_session()


@router.post("/{session_id}/roll", response_model=RollResponse)
def roll(session_id: str) -> RollResponse:
    try:
        return game_service.roll(session_id)
    except game_service.SessionNotFoundError:
        raise HTTPException(status_code=404, detail="Session not found")
    except game_service.InsufficientCreditsError:
        raise HTTPException(status_code=400, detail="Insufficient credits")
