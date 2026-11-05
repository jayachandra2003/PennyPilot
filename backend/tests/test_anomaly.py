"""Unit tests for Median Absolute Deviation (MAD) anomaly detection."""
from datetime import date
from types import SimpleNamespace
from app.domain.anomaly import detect_anomalies_mad


def _make_tx(amount_paise: int, desc: str = "Test", day: int = 1):
    return SimpleNamespace(
        id=f"tx-{day}-{amount_paise}",
        amount_paise=amount_paise,
        description=desc,
        occurred_on=date(2026, 11, day),
        kind="expense",
        deleted_at=None,
    )


def test_mad_cold_start_suppression():
    # Fewer than min_history (e.g. 3 transactions when min is 5)
    txs = [_make_tx(10000), _make_tx(12000), _make_tx(50000)]
    res = detect_anomalies_mad(txs, min_history=5)
    assert res["status"] == "insufficient_history"
    assert res["anomalies_count"] == 0
    assert len(res["anomalies"]) == 0


def test_mad_anomaly_detection_with_spike():
    # Baseline transactions around ₹200–₹350 (20000–35000 paise)
    txs = [
        _make_tx(20000, "Lunch", 1),
        _make_tx(25000, "Dinner", 2),
        _make_tx(22000, "Breakfast", 3),
        _make_tx(28000, "Groceries", 4),
        _make_tx(30000, "Snacks", 5),
        _make_tx(24000, "Coffee", 6),
        # Outlier: ₹5,000 (500000 paise) — 20x median!
        _make_tx(500000, "Luxury Feast", 7),
    ]

    res = detect_anomalies_mad(txs, threshold_multiplier=3.0, min_history=5)
    assert res["status"] == "evaluated"
    assert res["sample_size"] == 7
    assert res["anomalies_count"] == 1

    outlier = res["anomalies"][0]
    assert outlier["description"] == "Luxury Feast"
    assert outlier["amount_paise"] == 500000
    assert outlier["modified_z_score"] >= 3.0
    assert "higher than your typical median" in outlier["evidence"]


def test_mad_normal_distribution_no_outliers():
    # All expenses within normal variation
    txs = [
        _make_tx(10000, "A", 1),
        _make_tx(11000, "B", 2),
        _make_tx(12000, "C", 3),
        _make_tx(10500, "D", 4),
        _make_tx(11500, "E", 5),
        _make_tx(12500, "F", 6),
    ]
    res = detect_anomalies_mad(txs, threshold_multiplier=3.0, min_history=5)
    assert res["status"] == "evaluated"
    assert res["anomalies_count"] == 0
