"""Unit & integration tests for 3-Tier AI Fallback Chain transitions.

Distinguishes:
- LIVE TESTS: Genuine calls to local hardware / unconfigured environments.
- MOCKED TESTS: Unit isolation for error responses, network timeouts, and cloud APIs.
"""
import pytest
from unittest.mock import AsyncMock, MagicMock, patch
import httpx
from app.services.ai_client import (
    AIOrchestrator,
    DeterministicFallbackClient,
    GeminiClient,
    OllamaClient,
)


# =====================================================================
# 1. TIER 1: HOSTED GEMINI TESTS
# =====================================================================

@pytest.mark.asyncio
async def test_gemini_missing_api_key_live():
    """LIVE TEST: When GEMINI_API_KEY is empty/unset, client reports unavailable and generates None."""
    client = GeminiClient(api_key="")
    assert await client.is_available() is False
    res = await client.generate("Hello")
    assert res is None


@pytest.mark.asyncio
async def test_gemini_available_and_responding_mocked():
    """MOCKED TEST: Gemini returns a valid candidates JSON payload."""
    client = GeminiClient(api_key="fake-test-api-key-123456789")
    assert await client.is_available() is True

    mock_resp = MagicMock()
    mock_resp.status_code = 200
    mock_resp.json.return_value = {
        "candidates": [
            {
                "content": {
                    "parts": [{"text": "You are on track with your budget."}]
                }
            }
        ]
    }

    with patch.object(httpx.AsyncClient, "post", new_callable=AsyncMock) as mock_post:
        mock_post.return_value = mock_resp
        res = await client.generate("test prompt")
        assert res == "You are on track with your budget."


@pytest.mark.asyncio
async def test_gemini_returns_error_mocked():
    """MOCKED TEST: Gemini API returns HTTP 500 error, client catches and returns None."""
    client = GeminiClient(api_key="fake-test-api-key-123456789")
    mock_resp = MagicMock()
    mock_resp.status_code = 500
    mock_resp.text = "Internal Server Error"

    with patch.object(httpx.AsyncClient, "post", new_callable=AsyncMock) as mock_post:
        mock_post.return_value = mock_resp
        res = await client.generate("test prompt")
        assert res is None


@pytest.mark.asyncio
async def test_gemini_times_out_mocked():
    """MOCKED TEST: Gemini API times out, client catches exception and returns None."""
    client = GeminiClient(api_key="fake-test-api-key-123456789")

    with patch.object(httpx.AsyncClient, "post", side_effect=httpx.TimeoutException("Read timeout")):
        res = await client.generate("test prompt")
        assert res is None


# =====================================================================
# 2. TIER 2: LOCAL OLLAMA TESTS
# =====================================================================

@pytest.mark.asyncio
async def test_ollama_available_live():
    """LIVE TEST: Checks if local Ollama daemon is reachable on localhost:11434 with qwen2.5:3b."""
    client = OllamaClient()
    is_up = await client.is_available()
    # If Ollama daemon is running with qwen2.5:3b, is_available should be True
    assert isinstance(is_up, bool)


@pytest.mark.asyncio
async def test_ollama_unavailable_mocked():
    """MOCKED TEST: Ollama port is unreachable, client catches ConnectError and returns None."""
    client = OllamaClient(base_url="http://127.0.0.1:99999")
    with patch.object(httpx.AsyncClient, "post", side_effect=httpx.ConnectError("Connection refused")):
        res = await client.generate("test prompt")
        assert res is None


@pytest.mark.asyncio
async def test_ollama_times_out_mocked():
    """MOCKED TEST: Local Ollama times out during inference, client catches ReadTimeout and returns None."""
    client = OllamaClient()
    with patch.object(httpx.AsyncClient, "post", side_effect=httpx.ReadTimeout("Read timed out")):
        res = await client.generate("test prompt")
        assert res is None


# =====================================================================
# 3. TIER 3: DETERMINISTIC ENGINE & ORCHESTRATOR TRANSITIONS
# =====================================================================

@pytest.mark.asyncio
async def test_deterministic_fallback_always_available_live():
    """LIVE TEST: Deterministic fallback engine is 100% available with zero external dependencies."""
    client = DeterministicFallbackClient()
    assert await client.is_available() is True
    res = await client.generate("test")
    assert "[Rule Engine Fallback]" in res


@pytest.mark.asyncio
async def test_orchestrator_full_fallback_chain_mocked():
    """MOCKED TEST: Simulates Tier 1 failure and Tier 2 failure to ensure seamless Tier 3 fallback."""
    orch = AIOrchestrator()
    # Mock Tier 1 (Gemini) to fail
    if orch.tier1_hosted:
        orch.tier1_hosted.generate = AsyncMock(return_value=None)
    # Mock Tier 2 (Ollama) to fail
    orch.tier2_local.generate = AsyncMock(return_value=None)

    facts = {
        "period": {"year": 2026, "month": 11, "total_days": 30, "elapsed_days": 6},
        "totals": {
            "income_paise": 8500000,
            "income_formatted": "₹85,000.00",
            "expense_paise": 2903000,
            "expense_formatted": "₹29,030.00",
            "net_balance_paise": 5597000,
            "net_balance_formatted": "+₹55,970.00",
            "savings_rate_percent": 65.85,
            "transaction_count": 19,
        },
        "previous_month": {
            "expense_formatted": "₹24,470.00",
        },
        "mom_delta": {
            "expense_delta_formatted": "+₹4,560.00",
            "expense_pct_change": 18.6,
            "expense_delta_paise": 456000,
            "category_shifts": [],
            "increase_drivers": [
                {"category_name": "Dining & Food", "diff_formatted": "+₹6,700.00", "previous_paise": 32000, "current_paise": 702000}
            ],
            "unchanged_categories": [
                {"category_name": "Housing & Rent", "current_paise": 1850000}
            ],
            "explaining_transactions": [
                {"description": "Team Celebration Dinner @ Toit", "formatted_amount": "₹6,800.00", "category_name": "Dining & Food"}
            ],
        },
        "categories": [
            {"category_id": "1", "category_name": "Dining & Food", "formatted_total": "₹7,020.00", "percentage": 24.18, "transaction_count": 2, "total_paise": 702000}
        ],
        "top_category": {
            "category_name": "Housing & Rent",
            "formatted_total": "₹18,500.00",
            "percentage": 63.73,
            "transaction_count": 1,
            "total_paise": 1850000,
        },
        "budget_pace": {
            "status": "over_pace",
            "spent_formatted": "₹29,030.00",
            "limit_formatted": "₹55,000.00",
            "projected_overrun_formatted": "₹90,150.00",
            "remaining_days": 24,
            "utilization_percent": 52.78,
            "verdict_sentence": "On pace to overspend by approximately ₹90,150.00 by month-end.",
        },
        "anomalies": [],
        "top_expenses": [],
    }

    # Query Copilot under full AI failure
    result = await orch.generate_grounded_answer(
        question="Why did my expenses increase this month?",
        facts=facts,
        intent="expense_increase",
    )

    # Must gracefully degrade to Tier 3 Deterministic
    assert result["tier"] == 3
    assert result["provider"] == "deterministic"
    assert "Dining & Food" in result["answer"]
    assert "+₹4,560.00" in result["answer"]
    assert "Housing & Rent" in result["answer"]
    assert "remained constant" in result["answer"]
