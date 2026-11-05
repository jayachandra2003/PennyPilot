"""Token-bucket rate limiter for AI Copilot endpoints to ensure zero-cost API compliance."""
import time
from typing import Dict, Tuple
from fastapi import HTTPException, status
from app.core.errors import AppException


class TokenBucketRateLimiter:
    """
    In-memory Token Bucket rate limiter per user_id.
    Ensures free-tier AI endpoints and local compute are not overwhelmed.
    """

    def __init__(self, capacity: int = 15, refill_rate_per_sec: float = 15.0 / 60.0):
        """
        :param capacity: Maximum burst tokens (default: 15 queries)
        :param refill_rate_per_sec: Refill rate (default: 15 queries per minute = 0.25 tokens/sec)
        """
        self.capacity = capacity
        self.refill_rate = refill_rate_per_sec
        # Maps user_id -> (current_tokens: float, last_updated_time: float)
        self._buckets: Dict[str, Tuple[float, float]] = {}

    def is_allowed(self, user_id: str, cost: float = 1.0) -> Tuple[bool, int]:
        """
        Check if request is allowed.
        Returns:
            (allowed: bool, retry_after_seconds: int)
        """
        now = time.time()
        if user_id not in self._buckets:
            # First request: initialize bucket at capacity - cost
            self._buckets[user_id] = (self.capacity - cost, now)
            return True, 0

        tokens, last_time = self._buckets[user_id]
        elapsed = now - last_time
        # Add refilled tokens capped at capacity
        tokens = min(self.capacity, tokens + elapsed * self.refill_rate)

        if tokens >= cost:
            self._buckets[user_id] = (tokens - cost, now)
            return True, 0
        else:
            self._buckets[user_id] = (tokens, now)
            missing = cost - tokens
            retry_after = int(missing / self.refill_rate) + 1
            return False, retry_after

    def check(self, user_id: str, cost: float = 1.0) -> None:
        """Raise HTTP 429 if limit is exceeded."""
        allowed, retry_after = self.is_allowed(user_id, cost)
        if not allowed:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail={
                    "error": {
                        "message": f"Rate limit exceeded for AI Copilot. Please wait {retry_after} seconds before sending another question.",
                        "code": "RATE_LIMIT_EXCEEDED",
                        "retry_after_seconds": retry_after,
                    }
                },
                headers={"Retry-After": str(retry_after)},
            )


# Global instance: 15 requests per minute
copilot_rate_limiter = TokenBucketRateLimiter(capacity=15, refill_rate_per_sec=15.0 / 60.0)
