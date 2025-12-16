from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from database import get_db
from models import schema
from auth_utils import verify_password, get_password_hash, create_access_token, decode_access_token
from pydantic import BaseModel
from typing import Optional
from datetime import timedelta

router = APIRouter(tags=["authentication"])

class UserCreate(BaseModel):
    username: str
    email: str
    password: str

class Token(BaseModel):
    access_token: str
    token_type: str

class UserResponse(BaseModel):
    id: int
    username: str
    email: str
    
    class Config:
        from_attributes = True

@router.post("/api/register", response_model=UserResponse)
def register(user: UserCreate, db: Session = Depends(get_db)):
    # Check if user exists
    db_user = db.query(schema.User).filter(schema.User.username == user.username).first()
    if db_user:
        raise HTTPException(status_code=400, detail="Username already registered")
    
    db_email = db.query(schema.User).filter(schema.User.email == user.email).first()
    if db_email:
        raise HTTPException(status_code=400, detail="Email already registered")

    # Create new user
    hashed_password = get_password_hash(user.password)
    new_user = schema.User(
        username=user.username,
        email=user.email,
        hashed_password=hashed_password
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return new_user

@router.post("/api/token", response_model=Token)
async def login_for_access_token(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    # Verify user
    user = db.query(schema.User).filter(schema.User.username == form_data.username).first()
    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Create token
    access_token_expires = timedelta(minutes=30)
    access_token = create_access_token(
        data={"sub": user.username, "user_id": user.id},
        expires_delta=access_token_expires
    )
    return {"access_token": access_token, "token_type": "bearer"}

from google.oauth2 import id_token
from google.auth.transport import requests as google_requests
import random
import string

# ... existing imports ...

import logging
logger = logging.getLogger(__name__)

class GoogleLoginRequest(BaseModel):
    token: str

@router.post("/api/auth/google", response_model=Token)
async def google_login(request: GoogleLoginRequest, db: Session = Depends(get_db)):
    try:
        logger.info(f"DEBUG: Processing Google Login with token prefix: {request.token[:10]}...")
        
        # Verify the ID token
        try:
            id_info = id_token.verify_oauth2_token(
                request.token, 
                google_requests.Request(), 
                audience=None 
            )
        except ValueError as e:
            logger.error(f"DEBUG: Google Auth verification failed: {str(e)}")
            raise HTTPException(status_code=401, detail=f"Invalid Google Token: {str(e)}")

        google_id = id_info['sub']
        email = id_info['email']
        name = id_info.get('name', email.split('@')[0])
        picture = id_info.get('picture')

        # Check if user exists by Google ID
        user = db.query(schema.User).filter(schema.User.google_id == google_id).first()
        
        if not user:
            # Check by email (link account if exists)
            user = db.query(schema.User).filter(schema.User.email == email).first()
            if user:
                # Link existing account
                user.google_id = google_id
                if not user.profile_picture:
                    user.profile_picture = picture
                db.commit()
            else:
                # Create new user
                # Generates random password for legacy compatibility
                random_pass = ''.join(random.choices(string.ascii_letters + string.digits, k=16))
                hashed_password = get_password_hash(random_pass)
                
                # Ensure unique username
                base_username = name.replace(" ", "").lower()
                username = base_username
                counter = 1
                while db.query(schema.User).filter(schema.User.username == username).first():
                    username = f"{base_username}{counter}"
                    counter += 1

                user = schema.User(
                    username=username,
                    email=email,
                    hashed_password=hashed_password,
                    google_id=google_id,
                    profile_picture=picture
                )
                db.add(user)
                db.commit()
                db.refresh(user)

        # Create JWT
        access_token_expires = timedelta(minutes=60) # Longer expiry for convenience
        access_token = create_access_token(
            data={"sub": user.username, "user_id": user.id},
            expires_delta=access_token_expires
        )
        return {"access_token": access_token, "token_type": "bearer"}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Google Auth Error: {e}")
        raise HTTPException(status_code=500, detail="Authentication failed")

# Dependency to get current user
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/token")

def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    payload = decode_access_token(token)
    if payload is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )
    username: str = payload.get("sub")
    if username is None:
        raise HTTPException(status_code=401, detail="Invalid token")
        
    user = db.query(schema.User).filter(schema.User.username == username).first()
    if user is None:
        raise HTTPException(status_code=401, detail="User not found")
    return user
