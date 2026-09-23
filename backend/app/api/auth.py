import re
import secrets
from datetime import datetime, timezone, timedelta
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, EmailStr
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.security import verify_password, get_password_hash, create_access_token, get_current_user, require_role
from app.models.schema import User, AuditLog, EmailVerificationToken, PasswordResetToken
from app.services.email_service import email_service, EmailDeliveryError
from app.core.config import settings

router = APIRouter(prefix="/auth", tags=["Authentication"])

def get_utc_now():
    return datetime.now(timezone.utc)

def validate_password_strength(password: str):
    """
    Validates password requirements:
    - Minimum 8 characters
    - At least 1 uppercase letter
    - At least 1 lowercase letter
    - At least 1 digit
    - At least 1 special character
    """
    if len(password) < 8:
        raise HTTPException(status_code=400, detail="Password must be at least 8 characters long.")
    if not re.search(r'[A-Z]', password):
        raise HTTPException(status_code=400, detail="Password must contain at least one uppercase letter (A-Z).")
    if not re.search(r'[a-z]', password):
        raise HTTPException(status_code=400, detail="Password must contain at least one lowercase letter (a-z).")
    if not re.search(r'[0-9]', password):
        raise HTTPException(status_code=400, detail="Password must contain at least one number (0-9).")
    if not re.search(r'[!@#$%^&*(),.?":{}|<>]', password):
        raise HTTPException(status_code=400, detail="Password must contain at least one special character (!@#$%^&*...).")

def generate_secure_6digit_otp() -> str:
    return f"{secrets.randbelow(900000) + 100000}"

# Pydantic Schemas
class RegisterRequest(BaseModel):
    email: EmailStr
    password: str
    confirm_password: str
    full_name: str
    user_mode: Optional[str] = "STUDENT"  # STUDENT, EMPLOYEE
    role: Optional[str] = "USER"

class VerifyOtpRequest(BaseModel):
    email: EmailStr
    otp: str

class ResendOtpRequest(BaseModel):
    email: EmailStr

class ForgotPasswordRequest(BaseModel):
    email: EmailStr

class ResetPasswordRequest(BaseModel):
    email: EmailStr
    otp: str
    new_password: str
    confirm_password: str

class LoginRequest(BaseModel):
    email: EmailStr
    password: str

class UserResponse(BaseModel):
    id: str
    email: str
    full_name: str
    role: str
    user_mode: str
    is_active: bool
    is_verified: bool

    class Config:
        from_attributes = True

class AuthResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse

@router.post("/register")
def register_user(req: RegisterRequest, db: Session = Depends(get_db)):
    # 1. Validate password equality & strength
    if req.password != req.confirm_password:
        raise HTTPException(status_code=400, detail="Passwords do not match.")
    validate_password_strength(req.password)

    email_clean = req.email.lower().strip()
    existing_user = db.query(User).filter(User.email == email_clean).first()

    if existing_user and existing_user.is_verified:
        raise HTTPException(status_code=400, detail="An account with this email address already exists. Please log in.")

    # 2. Sanitize role and mode
    valid_roles = ["USER", "SOC_ANALYST", "ADMIN"]
    role = req.role.upper() if req.role and req.role.upper() in valid_roles else "USER"
    user_mode = req.user_mode.upper() if req.user_mode and req.user_mode.upper() in ["STUDENT", "EMPLOYEE"] else "STUDENT"

    if existing_user and not existing_user.is_verified:
        # Update existing unverified user
        existing_user.hashed_password = get_password_hash(req.password)
        existing_user.full_name = req.full_name
        existing_user.user_mode = user_mode
        user = existing_user
    else:
        user = User(
            email=email_clean,
            hashed_password=get_password_hash(req.password),
            full_name=req.full_name,
            role=role,
            user_mode=user_mode,
            is_active=True,
            is_verified=False
        )
        db.add(user)
        db.flush()

    # 3. Generate secure 6-digit OTP
    otp = generate_secure_6digit_otp()
    otp_hash = get_password_hash(otp)
    expires_at = get_utc_now() + timedelta(minutes=5)

    # Invalidate existing unused tokens for this email
    db.query(EmailVerificationToken).filter(
        EmailVerificationToken.email == email_clean,
        EmailVerificationToken.is_used == False
    ).update({"is_used": True})

    # Save new verification token
    tok = EmailVerificationToken(
        email=email_clean,
        otp_hash=otp_hash,
        expires_at=expires_at,
        attempts=0,
        is_used=False
    )
    db.add(tok)
    db.flush()

    # 4. Dispatch real email via SMTP
    try:
        email_service.send_verification_otp(email_clean, user.full_name, otp)
    except EmailDeliveryError as e:
        db.rollback()
        raise HTTPException(status_code=503, detail=str(e))

    # 5. Audit Log
    audit = AuditLog(
        user_id=user.id,
        action="USER_REGISTRATION_INITIATED",
        resource_type="USER",
        resource_id=user.id,
        details={"email": email_clean, "user_mode": user_mode}
    )
    db.add(audit)
    db.commit()

    return {
        "success": True,
        "message": "Verification code sent to your email. Please check your inbox.",
        "email": email_clean,
        "is_verified": False,
        "expires_in_seconds": 300
    }

@router.post("/verify-otp")
def verify_email_otp(req: VerifyOtpRequest, db: Session = Depends(get_db)):
    email_clean = req.email.lower().strip()
    user = db.query(User).filter(User.email == email_clean).first()
    if not user:
        raise HTTPException(status_code=400, detail="Invalid or expired verification code.")

    token = db.query(EmailVerificationToken).filter(
        EmailVerificationToken.email == email_clean,
        EmailVerificationToken.is_used == False
    ).order_by(EmailVerificationToken.created_at.desc()).first()

    if not token:
        raise HTTPException(status_code=400, detail="Invalid verification code.")

    # Check expiration
    # Normalize token.expires_at to timezone-aware UTC for accurate comparison
    token_expiry = token.expires_at
    if token_expiry.tzinfo is None:
        token_expiry = token_expiry.replace(tzinfo=timezone.utc)

    if get_utc_now() > token_expiry:
        token.is_used = True
        db.commit()
        raise HTTPException(status_code=400, detail="This verification code has expired.")

    # Check max attempts
    if token.attempts >= 5:
        token.is_used = True
        db.commit()
        raise HTTPException(status_code=400, detail="This verification code has expired.")

    # Verify OTP
    if not verify_password(req.otp.strip(), token.otp_hash):
        token.attempts += 1
        if token.attempts >= 5:
            token.is_used = True
        db.commit()
        raise HTTPException(status_code=400, detail="Invalid verification code.")

    # Mark token as used & activate user
    token.is_used = True
    user.is_verified = True
    user.is_active = True

    audit = AuditLog(
        user_id=user.id,
        action="USER_EMAIL_VERIFIED",
        resource_type="USER",
        resource_id=user.id,
        details={"email": email_clean}
    )
    db.add(audit)
    db.commit()
    db.refresh(user)

    access_token = create_access_token(data={"sub": user.id, "email": user.email, "role": user.role})
    return {
        "success": True,
        "message": "Email verified successfully! Welcome to SentriAI.",
        "access_token": access_token,
        "token_type": "bearer",
        "user": user
    }

@router.post("/send-otp")
@router.post("/resend-otp")
def resend_otp(req: ResendOtpRequest, db: Session = Depends(get_db)):
    email_clean = req.email.lower().strip()
    user = db.query(User).filter(User.email == email_clean).first()
    if not user:
        raise HTTPException(status_code=404, detail="User account not found.")

    # Enforce 60-second cooldown
    recent_token = db.query(EmailVerificationToken).filter(
        EmailVerificationToken.email == email_clean
    ).order_by(EmailVerificationToken.created_at.desc()).first()

    if recent_token:
        recent_created = recent_token.created_at
        if recent_created.tzinfo is None:
            recent_created = recent_created.replace(tzinfo=timezone.utc)
        elapsed = (get_utc_now() - recent_created).total_seconds()
        if elapsed < 60:
            remaining = int(60 - elapsed)
            raise HTTPException(status_code=429, detail=f"Please wait {remaining} seconds before requesting a new code.")

    # Invalidate previous
    db.query(EmailVerificationToken).filter(
        EmailVerificationToken.email == email_clean,
        EmailVerificationToken.is_used == False
    ).update({"is_used": True})

    otp = generate_secure_6digit_otp()
    otp_hash = get_password_hash(otp)
    expires_at = get_utc_now() + timedelta(minutes=5)

    tok = EmailVerificationToken(
        email=email_clean,
        otp_hash=otp_hash,
        expires_at=expires_at,
        attempts=0,
        is_used=False
    )
    db.add(tok)
    db.flush()

    try:
        email_service.send_verification_otp(email_clean, user.full_name, otp)
    except EmailDeliveryError as e:
        db.rollback()
        raise HTTPException(status_code=503, detail=str(e))
    db.commit()

    return {
        "success": True,
        "message": "Verification code sent to your email. Please check your inbox.",
        "expires_in_seconds": 300
    }

@router.post("/forgot-password")
def forgot_password(req: ForgotPasswordRequest, db: Session = Depends(get_db)):
    email_clean = req.email.lower().strip()
    user = db.query(User).filter(User.email == email_clean).first()
    if not user:
        # Avoid account enumeration: return consistent friendly message
        return {"success": True, "message": f"If an account exists for {email_clean}, a password reset code has been sent."}

    # Invalidate previous reset tokens
    db.query(PasswordResetToken).filter(
        PasswordResetToken.email == email_clean,
        PasswordResetToken.is_used == False
    ).update({"is_used": True})

    otp = generate_secure_6digit_otp()
    otp_hash = get_password_hash(otp)
    expires_at = get_utc_now() + timedelta(minutes=5)

    tok = PasswordResetToken(
        email=email_clean,
        otp_hash=otp_hash,
        expires_at=expires_at,
        attempts=0,
        is_used=False
    )
    db.add(tok)
    db.flush()

    try:
        email_service.send_password_reset_otp(email_clean, user.full_name, otp)
    except EmailDeliveryError as e:
        db.rollback()
        raise HTTPException(status_code=503, detail=str(e))
    db.commit()

    return {
        "success": True,
        "message": f"If an account exists for {email_clean}, a password reset code has been sent.",
        "email": email_clean
    }

@router.post("/reset-password")
def reset_password(req: ResetPasswordRequest, db: Session = Depends(get_db)):
    if req.new_password != req.confirm_password:
        raise HTTPException(status_code=400, detail="Passwords do not match.")
    validate_password_strength(req.new_password)

    email_clean = req.email.lower().strip()
    user = db.query(User).filter(User.email == email_clean).first()
    if not user:
        raise HTTPException(status_code=400, detail="Invalid or expired reset code.")

    token = db.query(PasswordResetToken).filter(
        PasswordResetToken.email == email_clean,
        PasswordResetToken.is_used == False
    ).order_by(PasswordResetToken.created_at.desc()).first()

    if not token:
        raise HTTPException(status_code=400, detail="Invalid verification code.")

    token_expiry = token.expires_at
    if token_expiry.tzinfo is None:
        token_expiry = token_expiry.replace(tzinfo=timezone.utc)

    if get_utc_now() > token_expiry:
        token.is_used = True
        db.commit()
        raise HTTPException(status_code=400, detail="This verification code has expired.")

    if not verify_password(req.otp.strip(), token.otp_hash):
        token.attempts += 1
        if token.attempts >= 5:
            token.is_used = True
        db.commit()
        raise HTTPException(status_code=400, detail="Invalid verification code.")

    token.is_used = True
    user.hashed_password = get_password_hash(req.new_password)
    user.is_verified = True

    audit = AuditLog(
        user_id=user.id,
        action="PASSWORD_RESET_COMPLETED",
        resource_type="USER",
        resource_id=user.id,
        details={"email": email_clean}
    )
    db.add(audit)
    db.commit()

    return {
        "success": True,
        "message": "Password updated successfully. You may now log in with your new password."
    }

@router.post("/login", response_model=AuthResponse)
def login_user(req: LoginRequest, db: Session = Depends(get_db)):
    email_clean = req.email.lower().strip()
    user = db.query(User).filter(User.email == email_clean).first()
    if not user or not verify_password(req.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid email or password.")
    
    if not user.is_active:
        raise HTTPException(status_code=403, detail="User account is deactivated.")

    if not user.is_verified:
        raise HTTPException(
            status_code=403,
            detail="Account email is not yet verified. Please complete OTP verification.",
            headers={"X-Requires-Verification": "true"}
        )

    token = create_access_token(data={"sub": user.id, "email": user.email, "role": user.role})
    return AuthResponse(access_token=token, user=user)

@router.get("/me", response_model=UserResponse)
def get_current_user_profile(current_user: User = Depends(get_current_user)):
    return current_user

@router.post("/refresh")
def refresh_token(current_user: User = Depends(get_current_user)):
    token = create_access_token(data={"sub": current_user.id, "email": current_user.email, "role": current_user.role})
    return {"access_token": token, "token_type": "bearer", "user": current_user}

@router.post("/logout")
def logout_user(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    audit = AuditLog(
        user_id=current_user.id,
        action="USER_LOGOUT",
        resource_type="USER",
        resource_id=current_user.id,
        details={"email": current_user.email}
    )
    db.add(audit)
    db.commit()
    return {"message": "Logged out successfully."}

@router.get("/users", response_model=List[UserResponse])
def list_users(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["ADMIN", "SOC_ANALYST"]))
):
    return db.query(User).order_by(User.created_at.desc()).all()

