"""API v1 router composition."""
from fastapi import APIRouter
from app.api.v1.endpoints import account, auth, budgets, categories, copilot, health, income, notifications, onboarding, receipts, transactions

api_router = APIRouter()

api_router.include_router(health.router, tags=["System"])
api_router.include_router(account.router, prefix="/account", tags=["Account"])
api_router.include_router(account.router, prefix="/auth/account", tags=["Account"])
api_router.include_router(auth.router, prefix="/auth", tags=["Authentication"])
api_router.include_router(categories.router, prefix="/categories", tags=["Categories"])
api_router.include_router(budgets.router, prefix="/budgets", tags=["Budgets"])
api_router.include_router(income.router, prefix="/income", tags=["Income"])
api_router.include_router(onboarding.router, prefix="/onboarding", tags=["Onboarding"])
api_router.include_router(notifications.router, prefix="/notifications", tags=["Notifications"])
api_router.include_router(transactions.router, prefix="/transactions", tags=["Transactions"])
api_router.include_router(receipts.router, prefix="/receipts", tags=["Receipts"])
api_router.include_router(copilot.router, prefix="/copilot", tags=["AI Copilot"])
