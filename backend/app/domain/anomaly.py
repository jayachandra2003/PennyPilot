"""Pure deterministic anomaly detection using Median Absolute Deviation (MAD)."""
import statistics
from typing import Any, Dict, List, Sequence
from app.domain.currency import format_inr, paise_to_rupees


def detect_anomalies_mad(
    transactions: Sequence[Any],
    threshold_multiplier: float = 3.0,
    min_history: int = 5,
) -> Dict[str, Any]:
    """
    Detect statistical outliers in transaction amounts using Median Absolute Deviation (MAD).
    Robust against extreme spikes compared to standard deviation.

    Requirements from Blueprint:
    - Requires at least `min_history` transactions; suppresses alerts if insufficient history.
    - Zero LLM used for calculation; output includes exact evidence numbers.
    """
    # Filter active expense transactions
    active_txs = [
        tx for tx in transactions
        if getattr(tx, "deleted_at", None) is None
        and getattr(tx, "kind", "expense") == "expense"
        and getattr(tx, "amount_paise", 0) > 0
    ]

    count = len(active_txs)
    if count < min_history:
        return {
            "status": "insufficient_history",
            "message": f"Requires at least {min_history} transactions to establish a statistical baseline (found {count}).",
            "baseline_median_paise": None,
            "mad_paise": None,
            "anomalies_count": 0,
            "anomalies": [],
        }

    amounts = [tx.amount_paise for tx in active_txs]
    med = statistics.median(amounts)

    # Calculate absolute deviations from median
    deviations = [abs(x - med) for x in amounts]
    mad = statistics.median(deviations)

    # Avoid division by zero if all values are identical or MAD is 0
    effective_mad = mad
    if effective_mad == 0:
        effective_mad = max(int(med * 0.1), 1000)  # Min ₹10 deviation buffer

    anomalies: List[Dict[str, Any]] = []

    for tx in active_txs:
        amt = tx.amount_paise
        # Only flag upward spending spikes
        if amt > med:
            diff = amt - med
            # 0.6745 * (x - median) / MAD approximates standard normal z-score
            modified_z_score = round(0.6745 * diff / effective_mad, 2)

            if modified_z_score >= threshold_multiplier:
                multiple = round(amt / med, 1) if med > 0 else 0.0
                desc = getattr(tx, "description", "Expense")
                date_str = str(getattr(tx, "occurred_on", ""))
                tx_id = str(getattr(tx, "id", ""))

                evidence = (
                    f"{format_inr(amt)} on '{desc}' ({date_str}) is "
                    f"{multiple}x higher than your typical median of {format_inr(int(med))}."
                )

                anomalies.append({
                    "transaction_id": tx_id,
                    "description": desc,
                    "date": date_str,
                    "amount_paise": amt,
                    "amount_formatted": format_inr(amt),
                    "baseline_median_paise": int(med),
                    "baseline_median_formatted": format_inr(int(med)),
                    "modified_z_score": modified_z_score,
                    "multiple_of_median": multiple,
                    "evidence": evidence,
                })

    # Sort anomalies with highest severity first
    anomalies.sort(key=lambda a: a["amount_paise"], reverse=True)

    return {
        "status": "evaluated",
        "sample_size": count,
        "baseline_median_paise": int(med),
        "baseline_median_formatted": format_inr(int(med)),
        "mad_paise": int(mad),
        "anomalies_count": len(anomalies),
        "anomalies": anomalies,
    }
