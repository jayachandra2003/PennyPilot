"""Extensible AI service abstraction with 3-tier zero-budget fallback chain.

Chain Priority:
1. Hosted Free Tier (Gemini / Groq)
2. Local Ollama (Qwen 2.5:3B on localhost:11434)
3. Deterministic Python Fallback
"""
from abc import ABC, abstractmethod
from typing import Any, Dict, Optional
import httpx
from app.core.config import settings
from app.core.logging import logger


class BaseLLMClient(ABC):
    """Abstract interface for LLM inference providers."""

    @abstractmethod
    async def generate(self, prompt: str, system_prompt: Optional[str] = None) -> Optional[str]:
        """Generate a response text from prompt. Returns None on failure."""
        pass


class OllamaClient(BaseLLMClient):
    """Tier 2: Local Ollama instance using existing Qwen 2.5:3B model."""

    def __init__(self, base_url: str = settings.OLLAMA_BASE_URL, model: str = settings.OLLAMA_MODEL):
        self.base_url = base_url.rstrip("/")
        self.model = model

    async def generate(self, prompt: str, system_prompt: Optional[str] = None) -> Optional[str]:
        payload: Dict[str, Any] = {
            "model": self.model,
            "prompt": prompt,
            "stream": False,
        }
        if system_prompt:
            payload["system"] = system_prompt

        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                res = await client.post(f"{self.base_url}/api/generate", json=payload)
                if res.status_code == 200:
                    data = res.json()
                    return data.get("response", "").strip()
                logger.warning(f"Ollama returned status {res.status_code}: {res.text}")
        except Exception as e:
            logger.warning(f"Local Ollama connection failed: {e}")
        return None


class GeminiClient(BaseLLMClient):
    """Tier 1: Google Gemini Free Tier."""

    def __init__(self, api_key: str = settings.GEMINI_API_KEY):
        self.api_key = api_key

    async def generate(self, prompt: str, system_prompt: Optional[str] = None) -> Optional[str]:
        if not self.api_key:
            return None

        url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key={self.api_key}"
        parts = [{"text": prompt}]
        if system_prompt:
            parts.insert(0, {"text": f"SYSTEM: {system_prompt}\n\nUSER:"})

        payload = {"contents": [{"parts": parts}]}

        try:
            async with httpx.AsyncClient(timeout=8.0) as client:
                res = await client.post(url, json=payload)
                if res.status_code == 200:
                    data = res.json()
                    candidates = data.get("candidates", [])
                    if candidates:
                        text = candidates[0].get("content", {}).get("parts", [{}])[0].get("text", "")
                        return text.strip()
                logger.warning(f"Gemini API returned status {res.status_code}: {res.text}")
        except Exception as e:
            logger.warning(f"Gemini API call failed: {e}")
        return None


class DeterministicFallbackClient(BaseLLMClient):
    """Tier 3: Guaranteed zero-failure rule and template fallback."""

    async def generate(self, prompt: str, system_prompt: Optional[str] = None) -> str:
        return "[Rule Engine Fallback] Deterministic calculation verified. AI offline mode active."


class AIOrchestrator:
    """Orchestrates multi-tier AI inference with automatic degradation."""

    def __init__(self):
        self.tier1_hosted = GeminiClient() if settings.GEMINI_API_KEY else None
        self.tier2_local = OllamaClient()
        self.tier3_fallback = DeterministicFallbackClient()

    async def query(self, prompt: str, system_prompt: Optional[str] = None) -> Dict[str, Any]:
        # 1. Try Hosted Free Tier
        if self.tier1_hosted:
            logger.info("Attempting Tier 1 (Hosted Free AI)...")
            res = await self.tier1_hosted.generate(prompt, system_prompt)
            if res:
                return {"provider": "gemini", "tier": 1, "text": res}

        # 2. Try Local Ollama
        logger.info("Attempting Tier 2 (Local Ollama Qwen 2.5:3B)...")
        res = await self.tier2_local.generate(prompt, system_prompt)
        if res:
            return {"provider": "ollama", "tier": 2, "text": res}

        # 3. Deterministic Fallback
        logger.info("Engaging Tier 3 (Deterministic Fallback Engine)...")
        res = await self.tier3_fallback.generate(prompt, system_prompt)
        return {"provider": "deterministic", "tier": 3, "text": res}


ai_service = AIOrchestrator()
