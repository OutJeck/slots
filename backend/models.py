from pydantic import BaseModel


class SessionResponse(BaseModel):
    session_id: str
    credits: int


class RollResponse(BaseModel):
    session_id: str
    symbols: list[str]
    reward: int
    credits: int


class CashOutResponse(BaseModel):
    session_id: str
    amount: int
    account_balance: int
