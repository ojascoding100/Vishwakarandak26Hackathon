"""Cloud API fallback using Google Gemini for claim extraction and explanation."""

from __future__ import annotations

import json
import logging
from typing import Any

import httpx

from app.config import settings

logger = logging.getLogger(__name__)

_GEMINI_BASE_URL = "https://generativelanguage.googleapis.com/v1beta/models"


def _ensure_api_key() -> str:
    """Ensure the Gemini API key is configured."""
    if not settings.GEMINI_API_KEY:
        raise RuntimeError(
            "GEMINI_API_KEY is not set. Cloud fallback is unavailable."
        )
    return settings.GEMINI_API_KEY


def _parse_json_from_text(text: str) -> Any:
    """Attempt to extract JSON from LLM response text."""
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        pass

    for start_char, end_char in [("[", "]"), ("{", "}")]:
        start = text.find(start_char)
        end = text.rfind(end_char)
        if start != -1 and end != -1 and end > start:
            try:
                return json.loads(text[start : end + 1])
            except json.JSONDecodeError:
                continue

    return None


async def _gemini_generate(prompt: str, *, temperature: float = 0.1) -> str:
    """Send a generation request to Gemini API."""
    api_key = _ensure_api_key()
    model = "gemini-2.5-flash-preview-05-20"
    url = f"{_GEMINI_BASE_URL}/{model}:generateContent?key={api_key}"

    payload = {
        "contents": [
            {
                "parts": [{"text": prompt}],
            }
        ],
        "generationConfig": {
            "temperature": temperature,
            "maxOutputTokens": 2048,
        },
    }

    async with httpx.AsyncClient(timeout=30.0) as client:
        resp = await client.post(url, json=payload)
        resp.raise_for_status()
        data = resp.json()

    # Extract text from Gemini response
    candidates = data.get("candidates", [])
    if candidates:
        parts = candidates[0].get("content", {}).get("parts", [])
        if parts:
            return parts[0].get("text", "")
    return ""


async def check_cloud_health() -> bool:
    """Check if the cloud Gemini API is reachable and key is valid."""
    try:
        api_key = _ensure_api_key()
        url = f"{_GEMINI_BASE_URL}?key={api_key}"
        async with httpx.AsyncClient(timeout=5.0) as client:
            resp = await client.get(url)
            return resp.status_code == 200
    except Exception:
        return False


async def extract_claims_cloud(text: str) -> list[dict]:
    """Extract ESG claims from text using Gemini.

    Parameters
    ----------
    text : str
        The source text to extract claims from.

    Returns
    -------
    list[dict]
        Each dict has keys: ``claim_text``, ``indicator``, ``metric_key``.
    """
    prompt = (
        "You are an ESG forensic analyst. Extract specific, verifiable ESG claims "
        "from the given text. For each claim, identify:\n"
        "1. claim_text: The exact or closely paraphrased claim\n"
        "2. indicator: The BRSR indicator code (EI-1 for Energy, EI-3 for Water, "
        "EI-7 for GHG Emissions, EI-9 for Waste, LI-2 for Scope 3)\n"
        "3. metric_key: The specific metric (e.g., scope1_tco2e, renewable_energy_gj, "
        "total_energy_gj, total_water_withdrawal_kl, total_waste_mt, waste_recycled_mt, "
        "ghg_intensity_per_revenue, ghg_intensity_per_tonne, scope2_tco2e, scope3_tco2e)\n\n"
        "Return ONLY a JSON array of objects. No explanation, no markdown formatting.\n\n"
        f"Text to analyze:\n{text}"
    )

    try:
        response_text = await _gemini_generate(prompt, temperature=0.05)
        parsed = _parse_json_from_text(response_text)

        if isinstance(parsed, list):
            results = []
            for item in parsed:
                if isinstance(item, dict) and "claim_text" in item:
                    results.append(
                        {
                            "claim_text": str(item.get("claim_text", "")),
                            "indicator": str(item.get("indicator", "")),
                            "metric_key": str(item.get("metric_key", "")),
                        }
                    )
            return results

        logger.warning("Gemini claim extraction returned non-list: %s", type(parsed))
        return []
    except Exception as exc:
        logger.error("Gemini claim extraction failed: %s", exc)
        raise


async def generate_explanation_cloud(
    claim: str,
    metric_data: dict,
    math_result: dict,
) -> str:
    """Generate a forensic explanation using Gemini.

    Parameters
    ----------
    claim : str
        The ESG claim being evaluated.
    metric_data : dict
        The relevant BRSR metric data.
    math_result : dict
        The output of ``rule_evaluator.evaluate_claim_against_metrics``.

    Returns
    -------
    str
        A detailed forensic explanation.
    """
    metric_summary = (
        f"Metric: {metric_data.get('metric_key', 'N/A')}\n"
        f"Indicator: {metric_data.get('indicator', 'N/A')} - {metric_data.get('indicator_name', 'N/A')}\n"
        f"FY Current: {metric_data.get('fy_current', 'N/A')} {metric_data.get('unit', '')}\n"
        f"FY Previous: {metric_data.get('fy_previous', 'N/A')} {metric_data.get('unit', '')}\n"
        f"Page: {metric_data.get('page_number', 'N/A')}\n"
    )

    math_summary = (
        f"Verdict: {math_result.get('verdict', 'N/A')}\n"
        f"Claimed Value: {math_result.get('claimed_value', 'N/A')}\n"
        f"Actual Value: {math_result.get('actual_value', 'N/A')}\n"
        f"YoY Change: {math_result.get('yoy_change_pct', 'N/A')}%\n"
        f"Math Breakdown: {math_result.get('math_breakdown', 'N/A')}\n"
    )

    prompt = (
        "You are a forensic ESG auditor. Given a claim, BRSR metric data, and "
        "a mathematical verification result, produce a clear 2-3 sentence "
        "explanation of why the verdict was reached. Be specific with numbers. "
        "Cite the BRSR page number if available.\n\n"
        f"Claim: \"{claim}\"\n\n"
        f"BRSR Data:\n{metric_summary}\n"
        f"Verification Result:\n{math_summary}\n"
        f"Provide a forensic explanation."
    )

    try:
        explanation = await _gemini_generate(prompt, temperature=0.3)
        return explanation.strip()
    except Exception as exc:
        logger.error("Gemini explanation generation failed: %s", exc)
        return math_result.get("explanation", "Explanation unavailable.")
