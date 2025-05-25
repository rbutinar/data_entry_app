from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2AuthorizationCodeBearer
from jose import jwt, JWTError
import os
from sqlalchemy.orm import Session
from backend.database.connection import get_db
from backend.models.models import User

# OAuth2 scheme for token validation
oauth2_scheme = OAuth2AuthorizationCodeBearer(
    authorizationUrl="https://login.microsoftonline.com/{tenant}/oauth2/v2.0/authorize",
    tokenUrl="https://login.microsoftonline.com/{tenant}/oauth2/v2.0/token",
)

# Azure AD tenant ID
TENANT_ID = os.getenv("AZURE_TENANT_ID")
CLIENT_ID = os.getenv("AZURE_CLIENT_ID")

async def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    """
    Validate the access token and return the current user information.
    """
    print(f"\n\n=== TOKEN VALIDATION ===\nToken length: {len(token) if token else 'None'}\n======================")
    
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    try:
        # Decode the JWT token
        # Note: In production, you should validate the token signature using public keys
        # from Microsoft's JWKS endpoint. For simplicity, we're just decoding here.
        print(f"Attempting to decode token with audience: {CLIENT_ID}")
        payload = jwt.decode(
            token, 
            options={"verify_signature": False},
            audience=CLIENT_ID
        )
        
        print(f"Token decoded successfully. Claims: {list(payload.keys())}")
        
        # Extract user email from token claims
        email = payload.get("preferred_username") or payload.get("email")
        print(f"Extracted email: {email}")
        
        if email is None:
            print("No email found in token!")
            raise credentials_exception
        
        # Check if user exists in the database
        user = db.query(User).filter(User.email == email).first()
        
        # For development: If user doesn't exist in the database, create a temporary user object
        # In production, you would want to remove this and require proper database registration
        if user is None:
            print(f"Development mode: Auto-creating user for {email}")
            # Create a temporary user object (not saved to database)
            user = User(id=999, email=email, name="Development User")
            
            # Uncomment the following lines to actually save the user to the database
            # if you have proper database permissions:
            # user = User(email=email, name="Auto-created User")
            # db.add(user)
            # db.commit()
            # db.refresh(user)
        
        # Return user information
        return {
            "id": user.id,
            "email": user.email,
            "name": user.name
        }
        
    except JWTError:
        raise credentials_exception
