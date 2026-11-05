"""API v1 router composition."""
from fastapi import APIRouter
from app.api.v1.endpoints import auth, health, transactions

api_router = APIRouter()

api_router.include_router(health.router, tags=["System"])
api_router.include_router(auth.router, prefix="/auth", tags=["Authentication"])
api_router.include_router(transactions.router, prefix="/transactions", tags=["Transactions"])
