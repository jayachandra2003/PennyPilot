"""Extensible AI service abstraction with 3-tier zero-budget fallback chain.

Chain Priority:
1. Hosted Free Tier (Gemini / Groq)
2. Local Ollama (Qwen 2.5:3B on localhost:11434)
3. Deterministic Python Fallback
"""
import json
from abc import ABC, abstractmethod
from typing import Any, Dict, Optional, Tuple
import httpx
from app.core.config import settings
from app.core.logging import logger
from app.domain.copilot import DeterministicNarrativeGenerator, FactBundleVerifier


class BaseLLMClient(ABC):
    """Abstract interface for LLM inference providers."""

    @abstractmethod
    async def generate(self, prompt: str, system_prompt: Optional[str] = None) -> Optional[str]:
        """Generate a response text from prompt. Returns None on failure."""
        pass

    @abstractmethod
    async def is_available(self) -> bool:
        """Check if provider is online and ready."""
        pass


class OllamaClient(BaseLLMClient):
    """Tier 2: Local Ollama instance using existing Qwen 2.5:3B model."""

    def __init__(self, base_url: str = settings.OLLAMA_BASE_URL, model: str = settings.OLLAMA_MODEL):
        self.base_url = base_url.rstrip("/")
        self.model = model

    async def is_available(self) -> bool:
        try:
            async with httpx.AsyncClient(timeout=2.0) as client:
                res = await client.get(f"{self.base_url}/api/tags")
                if res.status_code == 200:
                    models = [m.get("name", "") for m in res.json().get("models", [])]
                    return any(self.model in m for m in models)
        except Exception:
            pass
        return False

    async def generate(self, prompt: str, system_prompt: Optional[str] = None) -> Optional[str]:
        payload: Dict[str, Any] = {
            "model": self.model,
            "prompt": prompt,
            "stream": False,
            "options": {
                "temperature": 0.2,  # Low temperature for factual precision
                "top_p": 0.9,
            },
        }
        if system_prompt:
            payload["system"] = system_prompt

        try:
            async with httpx.AsyncClient(timeout=12.0) as client:
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

    async def is_available(self) -> bool:
        return bool(self.api_key and len(self.api_key) > 10)

    async def generate(self, prompt: str, system_prompt: Optional[str] = None) -> Optional[str]:
        if not self.api_key:
            return None

        url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key={self.api_key}"
        parts = [{"text": prompt}]
        if system_prompt:
            parts.insert(0, {"text": f"SYSTEM: {system_prompt}\n\nUSER:"})

        payload = {
            "contents": [{"parts": parts}],
            "generationConfig": {"temperature": 0.2},
        }

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

    async def is_available(self) -> bool:
        return True

    async def generate(self, prompt: str, system_prompt: Optional[str] = None) -> str:
        return "[Rule Engine Fallback] Deterministic calculation verified. AI offline mode active."


class AIOrchestrator:
    """Orchestrates multi-tier AI inference with automatic degradation."""

    def __init__(self):
        self.tier1_hosted = GeminiClient() if settings.GEMINI_API_KEY else None
        self.tier2_local = OllamaClient()
        self.tier3_fallback = DeterministicFallbackClient()

    async def get_provider_status(self) -> Dict[str, Any]:
        """Check live availability of all inference providers."""
        gemini_ready = await self.tier1_hosted.is_available() if self.tier1_hosted else False
        ollama_ready = await self.tier2_local.is_available()

        if gemini_ready:
            active = "gemini"
            tier = 1
            display = "Gemini Free Tier (Hosted)"
        elif ollama_ready:
            active = "ollama"
            tier = 2
            display = "Ollama Qwen 2.5:3B (Local)"
        else:
            active = "deterministic"
            tier = 3
            display = "Deterministic Python Engine"

        return {
            "active_provider": active,
            "active_tier": tier,
            "display_name": display,
            "providers": {
                "gemini_hosted": {"available": gemini_ready, "tier": 1},
                "ollama_local": {"available": ollama_ready, "tier": 2, "model": settings.OLLAMA_MODEL},
                "deterministic_engine": {"available": True, "tier": 3},
            },
        }

    async def generate_grounded_answer(
        self,
        question: str,
        facts: Dict[str, Any],
        intent: str,
        target_cat: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Produce a grounded answer supported by verified FactBundle.
        Guarantees fallback to DeterministicNarrativeGenerator if AI fails or hallucinates.
        """
        # 1. Precompute guaranteed rule-based answer
        deterministic_answer = DeterministicNarrativeGenerator.generate(
            intent=intent,
            target_cat=target_cat,
            facts=facts,
        )

        # 2. Build strict grounding prompt for LLMs
        system_prompt = (
            "You are PennyPilot's Senior Financial Intelligence Analyst. "
            "Your highest directive is: Compute, Then Explain (Zero Financial Hallucination). "
            "You are provided with a verified Fact Bundle containing exact ledger figures. "
            "STRICT RULES:\n"
            "1. ONLY state facts and numbers that appear in the Fact Bundle.\n"
            "2. NEVER invent, calculate, or extrapolate unverified totals.\n"
            "3. Format currency with Indian Rupee symbol (e.g., ₹12,500.00) in bold.\n"
            "4. Keep your answer concise (2-4 sentences), professional, empathetic, and actionable.\n"
            "5. Do NOT provide speculative investment advice.\n"
            "6. When explaining why expenses increased, ONLY attribute the increase to categories that actually grew (under 'increase_drivers'). "
            "NEVER claim that a fixed recurring expense (like rent) caused the increase if its amount was unchanged.\n"
            "7. Clearly distinguish percentage of total expenses from percentage of total income; do NOT confuse them."
        )

        # Compact facts payload for token efficiency
        context_payload = {
            "period": f"{facts['period']['year']}-{facts['period']['month']:02d}",
            "totals": facts["totals"],
            "top_category": facts["top_category"],
            "budget_pace": {
                "status": facts["budget_pace"]["status"],
                "spent": facts["budget_pace"]["spent_formatted"],
                "limit": facts["budget_pace"]["limit_formatted"],
                "projected_overrun": facts["budget_pace"]["projected_overrun_formatted"],
            },
            "top_anomalies": [
                {"desc": a["description"], "amount": a["amount_formatted"], "evidence": a["evidence"]}
                for a in facts.get("anomalies", [])[:2]
            ],
            "mom_delta": {
                "expense_delta": facts["mom_delta"]["expense_delta_formatted"],
                "pct_change": facts["mom_delta"]["expense_pct_change"],
                "categories_driving_increase": [
                    {"category": s["category_name"], "increase": s["diff_formatted"]}
                    for s in facts["mom_delta"].get("increase_drivers", [])[:2]
                ],
                "unchanged_baseline": [
                    {"category": s["category_name"], "amount": s.get("diff_formatted", "₹0.00"), "note": "constant in both months, did NOT cause increase"}
                    for s in facts["mom_delta"].get("unchanged_categories", [])[:1]
                ],
            },
        }

        user_prompt = (
            f"User Question: \"{question}\"\n"
            f"Detected Intent: {intent}\n\n"
            f"Verified Fact Bundle:\n{json.dumps(context_payload, indent=2)}\n\n"
            f"Answer the user's question directly using ONLY the facts above."
        )

        # 3. Attempt Tier 1 (Hosted Free)
        if self.tier1_hosted:
            try:
                ai_text = await self.tier1_hosted.generate(user_prompt, system_prompt)
                if ai_text:
                    sanitized, is_valid = FactBundleVerifier.verify(ai_text, facts)
                    if is_valid:
                        return {"answer": sanitized, "provider": "gemini", "tier": 1}
            except Exception as e:
                logger.warning(f"Tier 1 error: {e}")

        # 4. Attempt Tier 2 (Local Ollama Qwen 2.5:3B)
        try:
            ai_text = await self.tier2_local.generate(user_prompt, system_prompt)
            if ai_text:
                sanitized, is_valid = FactBundleVerifier.verify(ai_text, facts)
                if is_valid:
                    return {"answer": sanitized, "provider": "ollama", "tier": 2}
        except Exception as e:
            logger.warning(f"Tier 2 error: {e}")

        # 5. Fallback to Tier 3 (Deterministic Engine)
        return {
            "answer": deterministic_answer,
            "provider": "deterministic",
            "tier": 3,
        }


ai_service = AIOrchestrator()
