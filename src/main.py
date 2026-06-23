from fastapi import FastAPI
from fastapi.responses import StreamingResponse, JSONResponse
from fastapi.middleware.cors import CORSMiddleware

from src.parking_logic import get_parking_layout
from src.detector import generate_frames, get_last_event, set_mode
from src.parking_logic import get_dashboard_stats

app = FastAPI(title="Smart Parking System API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def root():
    return {"status": "FastAPI backend running"}

@app.get("/video_feed")
def video_feed():
    return StreamingResponse(
        generate_frames(),
        media_type="multipart/x-mixed-replace; boundary=frame"
    )

@app.get("/stats")
def stats():
    return JSONResponse(content=get_dashboard_stats())

@app.get("/last_event")
def last_event_api():
    return JSONResponse(content=get_last_event())

@app.post("/set_mode/{mode}")
def update_mode(mode: str):
    set_mode(mode.upper())
    return {"mode": mode.upper()}

@app.get("/parking_layout")
def parking_layout():
    return get_parking_layout()