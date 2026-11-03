"""Deterministic rule-based claim evaluator.

This module provides pure-math verification of ESG claims against BRSR metric
data.  It is the heuristic fallback when no LLM engine is available.
"""

from __future__ import annotations

import re
from typing import Optional


# ---------------------------------------------------------------------------
# Numeric computation helpers
# ---------------------------------------------------------------------------

def compute_yoy_change(current: float, previous: float) -> float:
    """Return the year-over-year percentage change.

    A positive return value means an increase; negative means a decrease.
    """
    if previous == 0:
        return 0.0
    return ((current - previous) / previous) * 100.0


def compute_renewable_ratio(renewable: float, total: float) -> float:
    """Return the renewable energy share as a percentage of total energy."""
    if total == 0:
        return 0.0
    return (renewable / total) * 100.0


def compute_intensity_change(current: float, previous: float) -> float:
    """Return the percentage change in an intensity metric."""
    return compute_yoy_change(current, previous)


# ---------------------------------------------------------------------------
# Regex pattern sets
# ---------------------------------------------------------------------------

_REDUCTION_PATTERN = re.compile(
    r"(\d+(?:\.\d+)?)\s*%\s*(?:reduction|decrease|cut|decline|fell|drop|lower|reduced|decreased)",
    re.IGNORECASE,
)

_INCREASE_PATTERN = re.compile(
    r"(\d+(?:\.\d+)?)\s*%\s*(?:increase|grew|growth|rise|rose|expanded|higher|increased|growing)",
    re.IGNORECASE,
)

_INCREASE_PATTERN_ALT = re.compile(
    r"(?:increase|grew|growth|rise|rose|expanded|growing|grew\s+by)\s+(?:by\s+)?(?:approximately\s+|nearly\s+|about\s+|around\s+|roughly\s+)?(\d+(?:\.\d+)?)\s*%",
    re.IGNORECASE,
)

_REDUCTION_PATTERN_ALT = re.compile(
    r"(?:reduction|decrease|cut|decline|fell|drop|reduced|decreased|lower)\s+(?:of\s+|by\s+)?(?:approximately\s+|nearly\s+|about\s+|around\s+|roughly\s+)?(\d+(?:\.\d+)?)\s*%",
    re.IGNORECASE,
)

_ZERO_EMISSION_PATTERN = re.compile(
    r"(zero[- ]?emission|carbon[- ]?neutral|net[- ]?zero|eliminated|eliminate)",
    re.IGNORECASE,
)

_FULL_RENEWABLE_PATTERN = re.compile(
    r"(100%|completely|fully)\s*(renewable|clean)",
    re.IGNORECASE,
)

_OVER_PERCENT_PATTERN = re.compile(
    r"(over|more\s+than|exceeds?|exceeded)\s*(\d+(?:\.\d+)?)\s*%",
    re.IGNORECASE,
)

_EXACT_PERCENT_PATTERN = re.compile(
    r"(\d+(?:\.\d+)?)\s*%\s*(renewable|clean|recycl)",
    re.IGNORECASE,
)

_APPROX_PERCENT_CHANGE = re.compile(
    r"(?:approximately|about|nearly|roughly|around|close\s+to)\s*(\d+(?:\.\d+)?)\s*%",
    re.IGNORECASE,
)

_HALVED_PATTERN = re.compile(
    r"(halved|half|50%\s*reduction)",
    re.IGNORECASE,
)

_DRAMATIC_PATTERN = re.compile(
    r"(dramatically?\s+(?:cut|reduced|decreased|lowered))",
    re.IGNORECASE,
)

_ZERO_WASTE_PATTERN = re.compile(
    r"(zero\s+waste|eliminated\s+(?:all\s+)?waste)",
    re.IGNORECASE,
)


# ---------------------------------------------------------------------------
# Helper: build a metric lookup dict
# ---------------------------------------------------------------------------

def _build_metric_map(metrics: list[dict]) -> dict[str, dict]:
    """Key metrics by metric_key for quick lookup."""
    result: dict[str, dict] = {}
    for m in metrics:
        key = m.get("metric_key", "")
        if key:
            result[key] = m
    return result


def _fmt(val: float) -> str:
    """Format a number for display."""
    if abs(val) >= 1_000_000:
        return f"{val:,.0f}"
    if abs(val) >= 1:
        return f"{val:,.2f}"
    return f"{val:.4f}"


# ---------------------------------------------------------------------------
# Main evaluator
# ---------------------------------------------------------------------------

def evaluate_claim_against_metrics(
    claim_text: str,
    metrics: list[dict],
    indicator: str | None = None,
    metric_key: str | None = None,
) -> dict:
    """Evaluate a single claim against BRSR metric data.

    Parameters
    ----------
    claim_text : str
        The ESG claim to verify.
    metrics : list[dict]
        BRSR metrics for the relevant company. Each dict should contain at
        least ``metric_key``, ``fy_current``, ``fy_previous``, ``unit``.
    indicator : str | None
        The BRSR indicator code (e.g. ``"EI-7"``).
    metric_key : str | None
        The specific metric key to check the claim against.

    Returns
    -------
    dict
        ``{"verdict", "claimed_value", "actual_value", "yoy_change_pct",
        "math_breakdown", "explanation"}``
    """
    mmap = _build_metric_map(metrics)
    claim_lower = claim_text.lower()

    # If a specific metric_key is provided, try to use it directly
    target_metric: dict | None = None
    if metric_key and metric_key in mmap:
        target_metric = mmap[metric_key]

    # Default result
    result: dict = {
        "verdict": "UNSUBSTANTIATED",
        "claimed_value": None,
        "actual_value": None,
        "yoy_change_pct": None,
        "math_breakdown": "",
        "explanation": "Could not match the claim to available BRSR data.",
    }

    if not target_metric and not metrics:
        return result

    # If no target_metric but we have metrics, try to find a reasonable one
    if not target_metric:
        # Try to infer from claim keywords
        if any(kw in claim_lower for kw in ["renewable", "clean energy"]):
            target_metric = mmap.get("renewable_energy_gj") or mmap.get("total_energy_gj")
        elif any(kw in claim_lower for kw in ["scope 1", "scope1"]):
            target_metric = mmap.get("scope1_tco2e")
        elif any(kw in claim_lower for kw in ["scope 2", "scope2"]):
            target_metric = mmap.get("scope2_tco2e")
        elif any(kw in claim_lower for kw in ["scope 3", "scope3"]):
            target_metric = mmap.get("scope3_tco2e")
        elif any(kw in claim_lower for kw in ["ghg", "greenhouse", "carbon", "emission"]):
            target_metric = mmap.get("scope1_tco2e") or mmap.get("ghg_intensity_per_revenue")
        elif any(kw in claim_lower for kw in ["water"]):
            target_metric = mmap.get("total_water_withdrawal_kl") or mmap.get("water_consumption_kl")
        elif any(kw in claim_lower for kw in ["waste", "recycl", "circular"]):
            target_metric = mmap.get("waste_recycled_mt") or mmap.get("total_waste_mt")
        elif any(kw in claim_lower for kw in ["energy", "consumption"]):
            target_metric = mmap.get("total_energy_gj")
        elif any(kw in claim_lower for kw in ["intensity"]):
            target_metric = mmap.get("ghg_intensity_per_revenue") or mmap.get("ghg_intensity_per_tonne")
        else:
            # Fall back to the first available metric
            target_metric = metrics[0] if metrics else None

    if not target_metric:
        return result

    current = target_metric.get("fy_current", 0) or 0
    previous = target_metric.get("fy_previous", 0) or 0
    unit = target_metric.get("unit", "")
    mk = target_metric.get("metric_key", "")

    yoy = compute_yoy_change(current, previous)

    result["actual_value"] = f"{_fmt(current)} {unit}"
    result["yoy_change_pct"] = round(yoy, 2)

    # -----------------------------------------------------------------------
    # Pattern: zero emission / carbon neutral / net-zero
    # -----------------------------------------------------------------------
    if _ZERO_EMISSION_PATTERN.search(claim_text):
        result["claimed_value"] = "Zero emissions / Carbon neutral"
        if current > 0:
            result["verdict"] = "CONTRADICTED"
            result["math_breakdown"] = (
                f"Current {mk}: {_fmt(current)} {unit}. "
                f"Non-zero emissions contradict the zero-emission claim."
            )
            result["explanation"] = (
                f"BRSR data shows {_fmt(current)} {unit} in the current period. "
                f"The claim of zero emissions or carbon neutrality is not supported by the filing data. "
                f"Carbon neutrality requires offset documentation not present in BRSR."
            )
        else:
            result["verdict"] = "SUPPORTED"
            result["math_breakdown"] = f"Current {mk}: 0 {unit}. Claim verified."
            result["explanation"] = "Zero emissions confirmed by BRSR data."
        return result

    # -----------------------------------------------------------------------
    # Pattern: 100% / completely / fully renewable
    # -----------------------------------------------------------------------
    if _FULL_RENEWABLE_PATTERN.search(claim_text):
        renewable_m = mmap.get("renewable_energy_gj")
        total_m = mmap.get("total_energy_gj")
        if renewable_m and total_m:
            ratio = compute_renewable_ratio(
                renewable_m.get("fy_current", 0),
                total_m.get("fy_current", 0),
            )
            result["claimed_value"] = "100% renewable"
            result["actual_value"] = f"{ratio:.1f}% renewable"
            if ratio >= 99.0:
                result["verdict"] = "SUPPORTED"
            else:
                result["verdict"] = "CONTRADICTED"
            result["math_breakdown"] = (
                f"Renewable: {_fmt(renewable_m.get('fy_current', 0))} GJ, "
                f"Total: {_fmt(total_m.get('fy_current', 0))} GJ → {ratio:.1f}%"
            )
            result["explanation"] = (
                f"Renewable energy is {ratio:.1f}% of total consumption. "
                f"{'Claim is supported.' if ratio >= 99.0 else 'Claim of 100% renewable is contradicted by the data.'}"
            )
        else:
            result["verdict"] = "UNSUBSTANTIATED"
            result["explanation"] = "Renewable and/or total energy data not available in BRSR to verify 100% renewable claim."
        return result

    # -----------------------------------------------------------------------
    # Pattern: zero waste
    # -----------------------------------------------------------------------
    if _ZERO_WASTE_PATTERN.search(claim_text):
        total_waste = mmap.get("total_waste_mt")
        recycled = mmap.get("waste_recycled_mt")
        if total_waste:
            tw = total_waste.get("fy_current", 0) or 0
            rw = recycled.get("fy_current", 0) if recycled else 0
            unrecycled = tw - rw
            result["claimed_value"] = "Zero waste to landfill"
            result["actual_value"] = f"{_fmt(tw)} MT total, {_fmt(unrecycled)} MT unrecycled"
            if unrecycled <= 0:
                result["verdict"] = "SUPPORTED"
            else:
                result["verdict"] = "CONTRADICTED"
            result["math_breakdown"] = (
                f"Total waste: {_fmt(tw)} MT, Recycled: {_fmt(rw)} MT, "
                f"Unrecycled: {_fmt(unrecycled)} MT"
            )
            result["explanation"] = (
                f"Total waste was {_fmt(tw)} MT with {_fmt(rw)} MT recycled, "
                f"leaving {_fmt(unrecycled)} MT unrecycled. "
                f"{'Zero waste claim is verified.' if unrecycled <= 0 else 'Zero waste to landfill is false.'}"
            )
        else:
            result["verdict"] = "UNSUBSTANTIATED"
            result["explanation"] = "Waste data not available in BRSR to verify zero waste claim."
        return result

    # -----------------------------------------------------------------------
    # Pattern: halved / 50% reduction
    # -----------------------------------------------------------------------
    if _HALVED_PATTERN.search(claim_text):
        result["claimed_value"] = "50% reduction"
        if previous > 0:
            if yoy <= -45:
                result["verdict"] = "SUPPORTED"
            else:
                result["verdict"] = "CONTRADICTED"
            result["math_breakdown"] = (
                f"Previous: {_fmt(previous)} {unit}, Current: {_fmt(current)} {unit}, "
                f"YoY change: {yoy:+.1f}%"
            )
            result["explanation"] = (
                f"The metric changed from {_fmt(previous)} to {_fmt(current)} {unit} ({yoy:+.1f}%). "
                f"{'Claim of halving is approximately correct.' if yoy <= -45 else 'The claim of halving is completely false.'}"
            )
        return result

    # -----------------------------------------------------------------------
    # Pattern: dramatic cut (vague claim)
    # -----------------------------------------------------------------------
    if _DRAMATIC_PATTERN.search(claim_text):
        result["claimed_value"] = "Dramatic reduction"
        if yoy >= 0:
            result["verdict"] = "CONTRADICTED"
            result["math_breakdown"] = (
                f"Previous: {_fmt(previous)} {unit}, Current: {_fmt(current)} {unit}, "
                f"YoY change: {yoy:+.1f}% (increased, not decreased)"
            )
            result["explanation"] = (
                f"The metric actually increased from {_fmt(previous)} to {_fmt(current)} {unit} "
                f"({yoy:+.1f}%). The claim of dramatic cuts is false."
            )
        elif yoy > -10:
            result["verdict"] = "CHERRY_PICKED"
            result["math_breakdown"] = (
                f"Previous: {_fmt(previous)} {unit}, Current: {_fmt(current)} {unit}, "
                f"YoY change: {yoy:+.1f}% (modest decrease)"
            )
            result["explanation"] = (
                f"The metric decreased by only {abs(yoy):.1f}%. 'Dramatic' is a misleading characterization."
            )
        else:
            result["verdict"] = "SUPPORTED"
            result["math_breakdown"] = (
                f"Previous: {_fmt(previous)} {unit}, Current: {_fmt(current)} {unit}, "
                f"YoY change: {yoy:+.1f}%"
            )
            result["explanation"] = f"A {abs(yoy):.1f}% decrease can reasonably be called dramatic."
        return result

    # -----------------------------------------------------------------------
    # Pattern: "over X%" / "more than X%" / "exceeds X%"
    # -----------------------------------------------------------------------
    m_over = _OVER_PERCENT_PATTERN.search(claim_text)
    if m_over:
        claimed_pct = float(m_over.group(2))
        result["claimed_value"] = f"Over {claimed_pct}%"

        # Determine what percentage to compare against
        actual_pct = _determine_actual_percentage(claim_lower, claimed_pct, mmap, target_metric, yoy, mk)
        if actual_pct is not None:
            result["actual_value"] = f"{actual_pct:.1f}%"
            if actual_pct >= claimed_pct:
                result["verdict"] = "SUPPORTED"
                result["explanation"] = f"Actual value is {actual_pct:.1f}%, which is over {claimed_pct}%. Claim is supported."
            elif actual_pct >= claimed_pct * 0.95:
                result["verdict"] = "CHERRY_PICKED"
                result["explanation"] = f"Actual value is {actual_pct:.1f}%, slightly below the claimed {claimed_pct}%. Claim overstates the figure."
            else:
                result["verdict"] = "CONTRADICTED"
                result["explanation"] = f"Actual value is {actual_pct:.1f}%, significantly below the claimed {claimed_pct}%. Claim is false."
            result["math_breakdown"] = f"Computed percentage: {actual_pct:.1f}% vs claimed: over {claimed_pct}%"
        return result

    # -----------------------------------------------------------------------
    # Pattern: exact "X% renewable/recycled/clean"
    # -----------------------------------------------------------------------
    m_exact_share = _EXACT_PERCENT_PATTERN.search(claim_text)
    if m_exact_share:
        claimed_pct = float(m_exact_share.group(1))
        share_type = m_exact_share.group(2).lower()
        result["claimed_value"] = f"{claimed_pct}%"

        actual_pct: float | None = None
        breakdown_parts = ""

        if "renewable" in share_type or "clean" in share_type:
            renewable_m = mmap.get("renewable_energy_gj")
            total_m = mmap.get("total_energy_gj")
            if renewable_m and total_m:
                actual_pct = compute_renewable_ratio(
                    renewable_m.get("fy_current", 0),
                    total_m.get("fy_current", 0),
                )
                breakdown_parts = (
                    f"Renewable: {_fmt(renewable_m.get('fy_current', 0))} GJ / "
                    f"Total: {_fmt(total_m.get('fy_current', 0))} GJ = {actual_pct:.1f}%"
                )
        elif "recycl" in share_type:
            recycled_m = mmap.get("waste_recycled_mt")
            total_w = mmap.get("total_waste_mt")
            if recycled_m and total_w:
                tw = total_w.get("fy_current", 0) or 1
                actual_pct = (recycled_m.get("fy_current", 0) / tw) * 100
                breakdown_parts = (
                    f"Recycled: {_fmt(recycled_m.get('fy_current', 0))} MT / "
                    f"Total: {_fmt(tw)} MT = {actual_pct:.1f}%"
                )

        if actual_pct is not None:
            result["actual_value"] = f"{actual_pct:.1f}%"
            result["math_breakdown"] = breakdown_parts
            tolerance = 2.0  # percentage points
            if abs(actual_pct - claimed_pct) <= tolerance:
                result["verdict"] = "SUPPORTED"
                result["explanation"] = f"Actual share is {actual_pct:.1f}%, claimed {claimed_pct}%. Claim is accurately stated."
            elif actual_pct < claimed_pct:
                if claimed_pct - actual_pct <= 7.0:
                    result["verdict"] = "CHERRY_PICKED"
                    result["explanation"] = f"Actual share is {actual_pct:.1f}%, but claim states {claimed_pct}%. Overstated by {claimed_pct - actual_pct:.1f} percentage points."
                else:
                    result["verdict"] = "CONTRADICTED"
                    result["explanation"] = f"Actual share is {actual_pct:.1f}%, significantly below claimed {claimed_pct}%."
            else:
                result["verdict"] = "SUPPORTED"
                result["explanation"] = f"Actual share is {actual_pct:.1f}%, which meets or exceeds the claimed {claimed_pct}%."
        return result

    # -----------------------------------------------------------------------
    # Pattern: "X% reduction/decrease"
    # -----------------------------------------------------------------------
    m_red = _REDUCTION_PATTERN.search(claim_text) or _REDUCTION_PATTERN_ALT.search(claim_text)
    if m_red:
        claimed_pct = float(m_red.group(1))
        result["claimed_value"] = f"{claimed_pct}% reduction"

        # Check if this is about a ratio/share (e.g. "recycled over X%") or absolute change
        actual_change = abs(yoy) if yoy < 0 else yoy
        actual_direction = "decrease" if yoy < 0 else "increase"

        # Handle scope 1+2 combined claims
        combined_change = _check_combined_scope_change(claim_lower, mmap, mk)
        if combined_change is not None:
            actual_change = abs(combined_change) if combined_change < 0 else combined_change
            actual_direction = "decrease" if combined_change < 0 else "increase"
            yoy = combined_change
            result["yoy_change_pct"] = round(combined_change, 2)

        result["actual_value"] = f"{actual_change:.1f}% {actual_direction}"
        result["math_breakdown"] = (
            f"Previous: {_fmt(previous)} {unit}, Current: {_fmt(current)} {unit}, "
            f"YoY change: {yoy:+.1f}%"
        )

        if actual_direction == "increase":
            result["verdict"] = "CONTRADICTED"
            result["explanation"] = (
                f"BRSR data shows the metric increased by {actual_change:.1f}%, "
                f"not decreased by {claimed_pct}%. The claim is false."
            )
        else:
            tolerance = max(claimed_pct * 0.15, 1.5)
            if abs(actual_change - claimed_pct) <= tolerance:
                result["verdict"] = "SUPPORTED"
                result["explanation"] = (
                    f"BRSR data shows a {actual_change:.1f}% decrease. "
                    f"The claimed {claimed_pct}% reduction is accurate."
                )
            elif actual_change < claimed_pct:
                result["verdict"] = "CHERRY_PICKED"
                result["explanation"] = (
                    f"BRSR data shows only a {actual_change:.1f}% decrease, "
                    f"not the claimed {claimed_pct}%. The claim overstates the reduction."
                )
            else:
                result["verdict"] = "SUPPORTED"
                result["explanation"] = (
                    f"BRSR data shows a {actual_change:.1f}% decrease, "
                    f"which meets or exceeds the claimed {claimed_pct}% reduction."
                )
        return result

    # -----------------------------------------------------------------------
    # Pattern: "X% increase/growth"
    # -----------------------------------------------------------------------
    m_inc = _INCREASE_PATTERN.search(claim_text) or _INCREASE_PATTERN_ALT.search(claim_text)
    if m_inc:
        claimed_pct = float(m_inc.group(1))
        result["claimed_value"] = f"{claimed_pct}% increase"

        actual_change = abs(yoy)
        actual_direction = "increase" if yoy > 0 else "decrease"

        result["actual_value"] = f"{actual_change:.1f}% {actual_direction}"
        result["math_breakdown"] = (
            f"Previous: {_fmt(previous)} {unit}, Current: {_fmt(current)} {unit}, "
            f"YoY change: {yoy:+.1f}%"
        )

        if actual_direction == "decrease":
            result["verdict"] = "CONTRADICTED"
            result["explanation"] = (
                f"BRSR data shows a {actual_change:.1f}% decrease, not the "
                f"claimed {claimed_pct}% increase. The claim is false."
            )
        else:
            tolerance = max(claimed_pct * 0.15, 1.5)
            if abs(actual_change - claimed_pct) <= tolerance:
                result["verdict"] = "SUPPORTED"
                result["explanation"] = (
                    f"BRSR data shows a {actual_change:.1f}% increase. "
                    f"The claimed {claimed_pct}% increase is accurate."
                )
            elif actual_change < claimed_pct:
                result["verdict"] = "CHERRY_PICKED"
                result["explanation"] = (
                    f"BRSR data shows only a {actual_change:.1f}% increase, "
                    f"below the claimed {claimed_pct}%. The claim overstates growth."
                )
            else:
                result["verdict"] = "SUPPORTED"
                result["explanation"] = (
                    f"BRSR data shows a {actual_change:.1f}% increase, "
                    f"meeting the claimed {claimed_pct}%."
                )
        return result

    # -----------------------------------------------------------------------
    # Pattern: approximate percentage with context
    # -----------------------------------------------------------------------
    m_approx = _APPROX_PERCENT_CHANGE.search(claim_text)
    if m_approx:
        claimed_pct = float(m_approx.group(1))
        result["claimed_value"] = f"~{claimed_pct}%"

        # Determine direction from context
        is_reduction = any(
            kw in claim_lower
            for kw in ["reduc", "decreas", "cut", "decline", "fell", "drop", "lower"]
        )

        # Handle combined scope claims
        combined_change = _check_combined_scope_change(claim_lower, mmap, mk)
        effective_yoy = combined_change if combined_change is not None else yoy

        actual_change = abs(effective_yoy)
        actual_direction = "decrease" if effective_yoy < 0 else "increase"

        result["actual_value"] = f"{actual_change:.1f}% {actual_direction}"
        result["math_breakdown"] = (
            f"Previous: {_fmt(previous)} {unit}, Current: {_fmt(current)} {unit}, "
            f"YoY change: {effective_yoy:+.1f}%"
        )

        if is_reduction:
            if actual_direction == "increase":
                result["verdict"] = "CONTRADICTED"
                result["explanation"] = f"Metric increased by {actual_change:.1f}%, contradicting the claimed ~{claimed_pct}% reduction."
            else:
                tolerance = max(claimed_pct * 0.2, 2.0)
                if abs(actual_change - claimed_pct) <= tolerance:
                    result["verdict"] = "SUPPORTED"
                    result["explanation"] = f"Actual {actual_change:.1f}% decrease is approximately {claimed_pct}%. Claim is accurate."
                else:
                    result["verdict"] = "CHERRY_PICKED"
                    result["explanation"] = f"Actual {actual_change:.1f}% decrease differs from claimed ~{claimed_pct}%."
        else:
            if actual_direction == "decrease":
                result["verdict"] = "CONTRADICTED"
                result["explanation"] = f"Metric decreased by {actual_change:.1f}%, contradicting the claimed ~{claimed_pct}% increase."
            else:
                tolerance = max(claimed_pct * 0.2, 2.0)
                if abs(actual_change - claimed_pct) <= tolerance:
                    result["verdict"] = "SUPPORTED"
                    result["explanation"] = f"Actual {actual_change:.1f}% increase is approximately {claimed_pct}%. Claim is accurate."
                else:
                    result["verdict"] = "CHERRY_PICKED"
                    result["explanation"] = f"Actual {actual_change:.1f}% increase differs from claimed ~{claimed_pct}%."
        return result

    # -----------------------------------------------------------------------
    # Fallback: generic direction check
    # -----------------------------------------------------------------------
    is_claiming_reduction = any(
        kw in claim_lower
        for kw in [
            "reduc", "decreas", "cut", "decline", "fell", "drop", "lower",
            "improved", "improvement",
        ]
    )
    is_claiming_increase = any(
        kw in claim_lower
        for kw in ["increase", "grew", "growth", "rise", "rose", "expanded", "growing"]
    )

    if is_claiming_reduction:
        result["claimed_value"] = "Reduction claimed"
        result["math_breakdown"] = (
            f"Previous: {_fmt(previous)} {unit}, Current: {_fmt(current)} {unit}, "
            f"YoY change: {yoy:+.1f}%"
        )
        if yoy > 0:
            result["verdict"] = "CONTRADICTED"
            result["explanation"] = (
                f"BRSR data shows the metric increased by {abs(yoy):.1f}% "
                f"(from {_fmt(previous)} to {_fmt(current)} {unit}). The reduction claim is false."
            )
        else:
            result["verdict"] = "SUPPORTED"
            result["explanation"] = (
                f"BRSR data confirms a {abs(yoy):.1f}% decrease "
                f"(from {_fmt(previous)} to {_fmt(current)} {unit})."
            )
        return result

    if is_claiming_increase:
        result["claimed_value"] = "Increase claimed"
        result["math_breakdown"] = (
            f"Previous: {_fmt(previous)} {unit}, Current: {_fmt(current)} {unit}, "
            f"YoY change: {yoy:+.1f}%"
        )
        if yoy < 0:
            result["verdict"] = "CONTRADICTED"
            result["explanation"] = (
                f"BRSR data shows the metric decreased by {abs(yoy):.1f}% "
                f"(from {_fmt(previous)} to {_fmt(current)} {unit}). The increase claim is false."
            )
        else:
            result["verdict"] = "SUPPORTED"
            result["explanation"] = (
                f"BRSR data confirms a {abs(yoy):.1f}% increase "
                f"(from {_fmt(previous)} to {_fmt(current)} {unit})."
            )
        return result

    # Truly unmatched claim
    result["math_breakdown"] = (
        f"Current: {_fmt(current)} {unit}, Previous: {_fmt(previous)} {unit}, "
        f"YoY change: {yoy:+.1f}%"
    )
    result["explanation"] = (
        f"Cannot conclusively verify this claim from available BRSR data. "
        f"The relevant metric ({mk}) shows {_fmt(current)} {unit} (current) vs "
        f"{_fmt(previous)} {unit} (previous), a {yoy:+.1f}% change."
    )
    return result


# ---------------------------------------------------------------------------
# Helpers for combined scope analysis
# ---------------------------------------------------------------------------

def _check_combined_scope_change(
    claim_lower: str,
    mmap: dict[str, dict],
    current_mk: str,
) -> float | None:
    """If the claim mentions scope 1+2 combined, compute combined YoY change."""
    if "scope 1" in claim_lower and "2" in claim_lower:
        pass  # explicit scope 1+2
    elif "scope 1+2" in claim_lower or "scope 1 and 2" in claim_lower:
        pass
    elif any(kw in claim_lower for kw in ["combined", "total ghg", "total emission"]):
        pass
    else:
        return None

    s1 = mmap.get("scope1_tco2e")
    s2 = mmap.get("scope2_tco2e")
    if s1 and s2:
        cur = (s1.get("fy_current", 0) or 0) + (s2.get("fy_current", 0) or 0)
        prev = (s1.get("fy_previous", 0) or 0) + (s2.get("fy_previous", 0) or 0)
        if prev > 0:
            return compute_yoy_change(cur, prev)
    return None


def _determine_actual_percentage(
    claim_lower: str,
    claimed_pct: float,
    mmap: dict[str, dict],
    target_metric: dict,
    yoy: float,
    mk: str,
) -> float | None:
    """Try to determine the actual percentage for 'over X%' claims."""
    # Check if it's about recycling/waste share
    if any(kw in claim_lower for kw in ["recycl", "waste", "circular"]):
        recycled = mmap.get("waste_recycled_mt")
        total = mmap.get("total_waste_mt")
        if recycled and total:
            tw = total.get("fy_current", 0) or 1
            return (recycled.get("fy_current", 0) / tw) * 100

    # Check if it's about renewable share
    if any(kw in claim_lower for kw in ["renewable", "clean"]):
        renewable = mmap.get("renewable_energy_gj")
        total = mmap.get("total_energy_gj")
        if renewable and total:
            te = total.get("fy_current", 0) or 1
            return (renewable.get("fy_current", 0) / te) * 100

    # Default to YoY change
    return abs(yoy)


# ---------------------------------------------------------------------------
# Heuristic Claim Extraction
# ---------------------------------------------------------------------------

def extract_claims_heuristic(text: str) -> list[dict]:
    """Extract atomic ESG claims from arbitrary text using heuristics and regex."""
    sentences = re.split(r"(?<=[.!?])\s+|\n+", text.strip())
    extracted: list[dict] = []

    esg_keywords = [
        ("emission", "EI-7", "scope1_tco2e"),
        ("carbon", "EI-7", "scope1_tco2e"),
        ("ghg", "EI-7", "scope1_tco2e"),
        ("scope 1", "EI-7", "scope1_tco2e"),
        ("scope 2", "EI-7", "scope2_tco2e"),
        ("scope 3", "EI-7", "scope3_tco2e"),
        ("renewable", "EI-1", "renewable_energy_gj"),
        ("solar", "EI-1", "renewable_energy_gj"),
        ("wind", "EI-1", "renewable_energy_gj"),
        ("energy", "EI-1", "total_energy_gj"),
        ("electricity", "EI-1", "total_energy_gj"),
        ("water", "EI-3", "total_water_withdrawal_kl"),
        ("effluent", "EI-3", "total_water_withdrawal_kl"),
        ("waste", "EI-9", "total_waste_mt"),
        ("recycled", "EI-9", "waste_recycled_mt"),
        ("recycling", "EI-9", "waste_recycled_mt"),
        ("intensity", "EI-7", "ghg_intensity_per_revenue"),
        ("net-zero", "EI-7", "scope1_tco2e"),
        ("net zero", "EI-7", "scope1_tco2e"),
        ("neutral", "EI-7", "scope1_tco2e"),
    ]

    for sentence in sentences:
        s = sentence.strip()
        if len(s) < 15:
            continue
        s_lower = s.lower()
        matched = False
        for kw, ind, mk in esg_keywords:
            if kw in s_lower:
                extracted.append({
                    "claim_text": s,
                    "indicator": ind,
                    "metric_key": mk,
                })
                matched = True
                break

    # If no specific sentences matched but text exists, treat entire text as claim
    if not extracted and len(text.strip()) > 10:
        extracted.append({
            "claim_text": text.strip(),
            "indicator": "EI-7",
            "metric_key": "scope1_tco2e",
        })

    return extracted
