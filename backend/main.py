from fastapi import FastAPI

from routers.game import router as game_router

app = FastAPI()
app.include_router(game_router)


@app.get("/health")
def health():
    return {"status": "ok"}
