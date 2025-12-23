from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from database import get_db
from models import schema
from routers.auth import get_current_user
from auth_utils import verify_password, get_password_hash
from pydantic import BaseModel
from typing import Dict, Any, Optional

router = APIRouter(
    prefix="/api/user",
    tags=["user"],
)

class UserProfileUpdate(BaseModel):
    investment_profile: Dict[str, Any]
    risk_tolerance: Optional[str] = None # "low", "medium", "high"
    years_experience: Optional[int] = None

class ChangePasswordRequest(BaseModel):
    old_password: str
    new_password: str

@router.put("/profile")
def update_user_profile(
    profile: UserProfileUpdate,
    db: Session = Depends(get_db),
    current_user: schema.User = Depends(get_current_user)
):
    """
    Update user's investment profile and risk tolerance.
    """
    # Merge existing profile with new data
    current_profile = dict(current_user.investment_profile) if current_user.investment_profile else {}
    current_profile.update(profile.investment_profile)
    
    current_user.investment_profile = current_profile
    
    if profile.risk_tolerance:
        # Validate enum if needed, but schema handles str mapping often
        # Assuming simple string compatibility or validation in frontend
        # ideally map "low" -> schema.RiskTolerance.LOW
        match profile.risk_tolerance.lower():
            case "low" | "conservative":
                current_user.risk_tolerance = schema.RiskTolerance.LOW
            case "high" | "aggressive":
                current_user.risk_tolerance = schema.RiskTolerance.HIGH
            case _:
                current_user.risk_tolerance = schema.RiskTolerance.MEDIUM

    db.commit()
    db.refresh(current_user)
    
    return {"message": "Profile updated successfully", "profile": current_profile}

@router.post("/change-password")
def change_password(
    request: ChangePasswordRequest,
    db: Session = Depends(get_db),
    current_user: schema.User = Depends(get_current_user)
):
    # Social login users cannot change password
    if current_user.google_id:
        raise HTTPException(
            status_code=400, 
            detail="Google Social Login users cannot change password."
        )

    if not verify_password(request.old_password, current_user.hashed_password):
        raise HTTPException(
            status_code=400,
            detail="Incorrect old password"
        )
    
    if len(request.new_password) < 6:
        raise HTTPException(
            status_code=400, 
            detail="Password must be at least 6 characters long"
        )

    current_user.hashed_password = get_password_hash(request.new_password)
    db.commit()
    
    return {"message": "Password updated successfully"}

@router.get("/profile")
def get_user_profile(current_user: schema.User = Depends(get_current_user)):
    return {
        "username": current_user.username,
        "email": current_user.email,
        "profile_picture": current_user.profile_picture,
        "investment_profile": current_user.investment_profile,
        "risk_tolerance": current_user.risk_tolerance,
        "is_social_login": bool(current_user.google_id)
    }
