"""
PennyPilot — Vercel Serverless Function Entry Point.
Bridges Vercel Serverless HTTP requests directly to the FastAPI application.
"""
import sys
from pathlib import Path

# Resolve directory paths relative to this file
API_DIR = Path(__file__).resolve().parent
ROOT_DIR = API_DIR.parent
BACKEND_DIR = ROOT_DIR / "backend"

# Ensure backend package is in Python module search path
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))

from app.main import create_application

# Vercel ASGI application handler
app = create_application()
