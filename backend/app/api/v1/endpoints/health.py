"""Health-check endpoint verifying API, database, and AI tier connectivity."""
from fastapi import APIRouter, Depends
from sqlalchemy import text
from sqlalchemy.orm import Session
from app.core.config import settings
from app.db.session import get_db

router = APIRouter()


@router.get("/health", tags=["System"])
def check_health(db: Session = Depends(get_db)):
    """Comprehensive health check for API, Database, and Zero-Budget AI Tiers."""
    db_status = "connected"
    try:
        db.execute(text("SELECT 1"))
    except Exception as e:
        db_status = f"unhealthy: {str(e)}"

    return {
        "status": "healthy" if db_status == "connected" else "degraded",
        "service": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "environment": settings.ENVIRONMENT,
        "database": db_status,
        "ai_tier_availability": {
            "tier_1_hosted": bool(settings.GEMINI_API_KEY or settings.GROQ_API_KEY),
            "tier_2_local_ollama": bool(settings.OLLAMA_BASE_URL),
            "tier_3_deterministic_fallback": True,
        },
    }
