"""
Security utilities for Rddhi Trading App
- Environment validation
- Secure token management
- Rate limiting
- Input sanitization
"""

import os
import logging
import re
from datetime import datetime, timezone, timedelta
from typing import Optional, Dict, Any
import jwt
import bcrypt
from cryptography.fernet import Fernet
from fastapi import HTTPException, status, Request
from collections import defaultdict
import time

logger = logging.getLogger(__name__)

class SecurityConfig:
    """Validate and store security configuration"""
    
    @staticmethod
    def validate_env() -> Dict[str, Any]:
        """Validate all required environment variables at startup"""
        required_vars = {
            'MONGO_URL': 'Database connection URL',
            'DB_NAME': 'Database name',
            'ENCRYPTION_KEY': 'Fernet encryption key',
            'JWT_SECRET': 'JWT secret key',
            'CORS_ORIGINS': 'Allowed CORS origins',
        }
        
        missing = []
        for var, description in required_vars.items():
            if not os.environ.get(var):
                missing.append(f"{var} ({description})")
        
        if missing:
            error_msg = f"Missing required environment variables:\n  - " + "\n  - ".join(missing)
            logger.error(error_msg)
            raise ValueError(error_msg)
        
        # Validate encryption key format
        try:
            Fernet(os.environ['ENCRYPTION_KEY'].encode())
        except Exception as e:
            logger.error(f"Invalid ENCRYPTION_KEY format: {e}")
            raise ValueError("ENCRYPTION_KEY must be a valid Fernet key")
        
        # Get optional values with secure defaults
        config = {
            'MONGO_URL': os.environ['MONGO_URL'],
            'DB_NAME': os.environ['DB_NAME'],
            'ENCRYPTION_KEY': os.environ['ENCRYPTION_KEY'],
            'JWT_SECRET': os.environ['JWT_SECRET'],
            'JWT_ALGORITHM': os.environ.get('JWT_ALGORITHM', 'HS256'),
            'JWT_EXPIRATION_HOURS': int(os.environ.get('JWT_EXPIRATION_HOURS', 24)),
            'JWT_REFRESH_EXPIRATION_DAYS': int(os.environ.get('JWT_REFRESH_EXPIRATION_DAYS', 7)),
            'CORS_ORIGINS': [o.strip() for o in os.environ.get('CORS_ORIGINS', '*').split(',')],
            'ENVIRONMENT': os.environ.get('ENVIRONMENT', 'development'),
            'DEBUG': os.environ.get('DEBUG', 'false').lower() == 'true',
            'RATE_LIMIT_PER_MINUTE': int(os.environ.get('RATE_LIMIT_PER_MINUTE', 60)),
            'RATE_LIMIT_PER_HOUR': int(os.environ.get('RATE_LIMIT_PER_HOUR', 1000)),
        }
        
        logger.info(f"Security validation passed. Environment: {config['ENVIRONMENT']}")
        return config

class EncryptionManager:
    """Handle all encryption/decryption operations"""
    
    def __init__(self, encryption_key: str):
        self.fernet = Fernet(encryption_key.encode())
    
    def encrypt(self, value: Any) -> str:
        """Encrypt a value"""
        try:
            return self.fernet.encrypt(str(value).encode()).decode()
        except Exception as e:
            logger.error(f"Encryption error: {e}")
            raise
    
    def decrypt(self, encrypted_value: str) -> float:
        """Decrypt a value and return as float"""
        try:
            if not encrypted_value:
                return 0.0
            return float(self.fernet.decrypt(encrypted_value.encode()).decode())
        except Exception as e:
            logger.warning(f"Decryption error: {e}")
            return 0.0

class PasswordManager:
    """Handle password hashing and verification"""
    
    SALT_ROUNDS = 12
    
    @staticmethod
    def hash_password(password: str) -> str:
        """Hash a password securely"""
        if len(password) < 8:
            raise ValueError("Password must be at least 8 characters long")
        salt = bcrypt.gensalt(rounds=PasswordManager.SALT_ROUNDS)
        return bcrypt.hashpw(password.encode(), salt).decode()
    
    @staticmethod
    def verify_password(password: str, hashed: str) -> bool:
        """Verify a password against its hash"""
        try:
            return bcrypt.checkpw(password.encode(), hashed.encode())
        except Exception:
            return False

class TokenManager:
    """Manage JWT token creation and validation"""
    
    def __init__(self, secret: str, algorithm: str, expiration_hours: int, config: Dict[str, Any]):
        self.secret = secret
        self.algorithm = algorithm
        self.expiration_hours = expiration_hours
        self.config = config
    
    def create_access_token(self, user_id: str, email: str) -> str:
        """Create a short-lived access token"""
        payload = {
            'user_id': user_id,
            'email': email,
            'type': 'access',
            'exp': datetime.now(timezone.utc) + timedelta(hours=self.expiration_hours),
            'iat': datetime.now(timezone.utc),
        }
        return jwt.encode(payload, self.secret, algorithm=self.algorithm)
    
    def create_refresh_token(self, user_id: str) -> str:
        """Create a long-lived refresh token"""
        payload = {
            'user_id': user_id,
            'type': 'refresh',
            'exp': datetime.now(timezone.utc) + timedelta(days=self.config.get('JWT_REFRESH_EXPIRATION_DAYS', 7)),
            'iat': datetime.now(timezone.utc),
        }
        return jwt.encode(payload, self.secret, algorithm=self.algorithm)
    
    def verify_token(self, token: str, token_type: str = 'access') -> Dict[str, Any]:
        """Verify and decode a token"""
        try:
            payload = jwt.decode(token, self.secret, algorithms=[self.algorithm])
            if payload.get('type') != token_type:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail='Invalid token type'
                )
            return payload
        except jwt.ExpiredSignatureError:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail='Token has expired'
            )
        except jwt.InvalidTokenError:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail='Invalid token'
            )

class RateLimiter:
    """Simple in-memory rate limiting"""
    
    def __init__(self, requests_per_minute: int, requests_per_hour: int):
        self.requests_per_minute = requests_per_minute
        self.requests_per_hour = requests_per_hour
        self.requests: Dict[str, list] = defaultdict(list)
    
    def is_allowed(self, identifier: str) -> bool:
        """Check if request is allowed for identifier (IP, user_id, etc.)"""
        now = time.time()
        minute_ago = now - 60
        hour_ago = now - 3600
        
        # Clean old requests
        self.requests[identifier] = [
            req_time for req_time in self.requests[identifier]
            if req_time > hour_ago
        ]
        
        # Check limits
        recent_requests = [
            req_time for req_time in self.requests[identifier]
            if req_time > minute_ago
        ]
        
        if len(recent_requests) >= self.requests_per_minute:
            return False
        
        if len(self.requests[identifier]) >= self.requests_per_hour:
            return False
        
        # Add current request
        self.requests[identifier].append(now)
        return True

class InputValidator:
    """Validate and sanitize user inputs"""
    
    # Email regex
    EMAIL_REGEX = re.compile(r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$')
    
    # Name regex (alphanumeric, spaces, hyphens, apostrophes)
    NAME_REGEX = re.compile(r"^[a-zA-Z0-9\s\-']{2,100}$")
    
    # Container/lot name (alphanumeric, hyphens, underscores)
    CONTAINER_REGEX = re.compile(r'^[a-zA-Z0-9\-_]{2,50}$')
    
    # CBM (volume) - positive number with up to 4 decimal places
    CBM_REGEX = re.compile(r'^\d+\.?\d{0,4}$')
    
    @staticmethod
    def validate_email(email: str) -> bool:
        """Validate email format"""
        if not email or len(email) > 254:
            return False
        return bool(InputValidator.EMAIL_REGEX.match(email))
    
    @staticmethod
    def validate_password(password: str) -> bool:
        """Validate password strength"""
        # Minimum 8 chars, at least 1 uppercase, 1 lowercase, 1 number
        if len(password) < 8:
            return False
        if len(password) > 128:
            return False
        has_upper = any(c.isupper() for c in password)
        has_lower = any(c.islower() for c in password)
        has_digit = any(c.isdigit() for c in password)
        return has_upper and has_lower and has_digit
    
    @staticmethod
    def validate_name(name: str) -> bool:
        """Validate name field"""
        if not name:
            return False
        return bool(InputValidator.NAME_REGEX.match(name))
    
    @staticmethod
    def validate_container_name(container_name: str) -> bool:
        """Validate container/lot name"""
        if not container_name:
            return False
        return bool(InputValidator.CONTAINER_REGEX.match(container_name))
    
    @staticmethod
    def validate_cbm(cbm: float) -> bool:
        """Validate CBM (volume)"""
        if cbm <= 0 or cbm > 999999.99:
            return False
        return bool(InputValidator.CBM_REGEX.match(str(cbm)))
    
    @staticmethod
    def validate_amount(amount: float) -> bool:
        """Validate financial amounts"""
        if amount < 0 or amount > 999999999.99:
            return False
        return True
    
    @staticmethod
    def sanitize_string(value: str, max_length: int = 500) -> str:
        """Sanitize string input"""
        if not isinstance(value, str):
            return ""
        # Remove null bytes
        value = value.replace('\x00', '')
        # Truncate to max length
        return value[:max_length].strip()

logger.info("Security module loaded")
