from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from database import engine, Base
from models import schema
from routers import stocks, watchlist

# Create tables on startup
Base.metadata.create_all(bind=engine)

app = FastAPI(title="Investment Assistant Backend")

# REST API Routers
app.include_router(stocks.router)
app.include_router(watchlist.router)


# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins for MVP/EC2
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/api/health")
def health_check():
    return {"status": "ok", "message": "Backend is running and healthy"}
