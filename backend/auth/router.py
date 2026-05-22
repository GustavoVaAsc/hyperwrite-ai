from __future__ import annotations

from typing import Annotated, AsyncGenerator

from fastapi import APIRouter, Depends, FastAPI, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from fastapi_users import FastAPIUsers, BaseUserManager, IntegerIDMixin
from fastapi_users.authentication import AuthenticationBackend, BearerTransport, JWTStrategy
from fastapi_users.authentication.strategy import JWTStrategy
from fastapi_users.schemas import BaseUser, BaseUserCreate, BaseUserUpdate
from fastapi_users_db_sqlalchemy import SQLAlchemyUserDatabase
from pydantic import EmailStr

from db.database import get_user_db
from db.models import User

import os

SECRET = os.getenv("JWT_SECRET", "changeme-secret-key-min-32-chars!!")
LIFETIME = int(os.getenv("JWT_LIFETIME", "3600"))

bearer_transport = BearerTransport(tokenUrl="/auth/login")


def get_jwt_strategy() -> JWTStrategy:
    return JWTStrategy(secret=SECRET, lifetime_seconds=LIFETIME)


auth_backend = AuthenticationBackend(
    name="jwt",
    transport=bearer_transport,
    get_strategy=get_jwt_strategy,
)


class UserManager(IntegerIDMixin, BaseUserManager[User, int]):
    reset_password_token_secret = SECRET
    verification_token_secret = SECRET


async def get_user_manager(user_db=Depends(get_user_db)):
    yield UserManager(user_db)


class UserRead(BaseUser):
    username: str
    display_name: str | None = None


class UserCreate(BaseUserCreate):
    username: str
    display_name: str | None = None


class UserUpdate(BaseUserUpdate):
    display_name: str | None = None


fastapi_users = FastAPIUsers[User, int](
    get_user_manager,
    [auth_backend],
)


def create_auth_router() -> APIRouter:
    router = APIRouter()
    router.include_router(
        fastapi_users.get_auth_router(auth_backend),
        prefix="/auth",
        tags=["auth"],
    )
    router.include_router(
        fastapi_users.get_register_router(UserRead, UserCreate),
        prefix="/auth",
        tags=["auth"],
    )
    return router


def create_users_router() -> APIRouter:
    router = APIRouter()
    router.include_router(
        fastapi_users.get_users_router(UserRead, UserUpdate),
        prefix="/users",
        tags=["users"],
    )
    return router


auth_router = create_auth_router()
users_router = create_users_router()