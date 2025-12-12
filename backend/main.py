from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from database import engine, Base, SessionLocal
from models import schema
from routers import stocks, watchlist, auth, portfolio, market

# Create tables on startup
Base.metadata.create_all(bind=engine)

# Create default user for MVP
def create_default_user():
    db = SessionLocal()
    try:
        user = db.query(schema.User).filter(schema.User.id == 1).first()
        if not user:
            # Create default user with a placeholder password hash if needed, 
            # or just leave it for now since this is a fallback.
            # ideally, we should use get_password_hash("password") but imports might be tricky here
            # so we'll skip password for the default legacy user or handle it later.
            default_user = schema.User(id=1, username="me", email="me@example.com") 
            db.add(default_user)
            db.commit()
            print("Default user created.")
    except Exception as e:
        print(f"Error creating default user: {e}")
    finally:
        db.close()

create_default_user()

app = FastAPI(title="Investment Assistant Backend")

# REST API Routers
app.include_router(stocks.router)
app.include_router(watchlist.router)
app.include_router(auth.router)
app.include_router(portfolio.router)
app.include_router(market.router)


# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://mca.moibluu.com", 
        "http://localhost:3000",
        "https://apimca.moibluu.com" 
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/api/health")
def health_check():
    return {"status": "ok", "message": "Backend is running and healthy"}
