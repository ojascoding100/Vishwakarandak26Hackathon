"""Ollama (local LLM) client for claim extraction and explanation generation."""

from __future__ import annotations

import json
import logging
from typing import Any

import httpx

from app.config import settings

logger = logging.getLogger(__name__)


async def check_ollama_health() -> bool:
    """Check if Ollama is running and responsive.

    Returns True if the Ollama server at ``OLLAMA_BASE_URL`` is healthy.
    """
    try:
        async with httpx.AsyncClient(
            timeout=settings.OLLAMA_TIMEOUT_MS / 1000
        ) as client:
            resp = await client.get(f"{settings.OLLAMA_BASE_URL}/api/tags")
            return resp.status_code == 200
    except Exception:
        return False


async def _chat(
    messages: list[dict[str, str]],
    *,
    temperature: float = 0.1,
    timeout: float | None = None,
) -> str:
    """Send a chat completion request to Ollama and return the response text."""
    effective_timeout = timeout or (settings.OLLAMA_TIMEOUT_MS / 1000) * 20
    payload: dict[str, Any] = {
        "model": settings.OLLAMA_MODEL,
        "messages": messages,
        "stream": False,
        "options": {
            "temperature": temperature,
        },
    }

    async with httpx.AsyncClient(timeout=effective_timeout) as client:
        resp = await client.post(
            f"{settings.OLLAMA_BASE_URL}/api/chat",
            json=payload,
        )
        resp.raise_for_status()
        data = resp.json()
        return data.get("message", {}).get("content", "")


def _parse_json_from_text(text: str) -> Any:
    """Attempt to extract JSON from LLM response text."""
    # Try direct parse first
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        pass

    # Try to find JSON array or object in the response
    for start_char, end_char in [("[", "]"), ("{", "}")]:
        start = text.find(start_char)
        end = text.rfind(end_char)
        if start != -1 and end != -1 and end > start:
            try:
                return json.loads(text[start : end + 1])
            except json.JSONDecodeError:
                continue

    return None


async def extract_claims_ollama(text: str) -> list[dict]:
    """Extract ESG claims from text using Qwen3-8B with /no_think prefix.

    Parameters
    ----------
    text : str
        The source text (press release, report excerpt, etc.)

    Returns
    -------
    list[dict]
        Each dict has keys: ``claim_text``, ``indicator``, ``metric_key``.
    """
    system_prompt = (
        "You are an ESG forensic analyst. Extract specific, verifiable ESG claims "
        "from the given text. For each claim, identify:\n"
        "1. claim_text: The exact or closely paraphrased claim\n"
        "2. indicator: The BRSR indicator code (EI-1 for Energy, EI-3 for Water, "
        "EI-7 for GHG Emissions, EI-9 for Waste, LI-2 for Scope 3)\n"
        "3. metric_key: The specific metric (e.g., scope1_tco2e, renewable_energy_gj, "
        "total_energy_gj, total_water_withdrawal_kl, total_waste_mt, waste_recycled_mt, "
        "ghg_intensity_per_revenue, ghg_intensity_per_tonne, scope2_tco2e, scope3_tco2e, "
        "water_consumption_kl, non_renewable_energy_gj)\n\n"
        "Return ONLY a JSON array. No explanation."
    )

    user_message = f"/no_think\nExtract all ESG claims from this text:\n\n{text}"

    messages = [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": user_message},
    ]

    try:
        response_text = await _chat(messages, temperature=0.05)
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

        logger.warning("Ollama claim extraction returned non-list: %s", type(parsed))
        return []
    except Exception as exc:
        logger.error("Ollama claim extraction failed: %s", exc)
        raise


async def generate_explanation_ollama(
    claim: str,
    metric_data: dict,
    math_result: dict,
) -> str:
    """Generate a forensic explanation using Qwen3-8B with reasoning enabled.

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
    system_prompt = (
        "You are a forensic ESG auditor. Given a claim, BRSR metric data, and "
        "a mathematical verification result, produce a clear 2-3 sentence "
        "explanation of why the verdict was reached. Be specific with numbers. "
        "Cite the BRSR page number if available."
    )

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

    user_message = (
        f"Claim: \"{claim}\"\n\n"
        f"BRSR Data:\n{metric_summary}\n"
        f"Verification Result:\n{math_summary}\n"
        f"Provide a forensic explanation."
    )

    messages = [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": user_message},
    ]

    try:
        explanation = await _chat(messages, temperature=0.3)
        return explanation.strip()
    except Exception as exc:
        logger.error("Ollama explanation generation failed: %s", exc)
        # Fall back to the math result's explanation
        return math_result.get("explanation", "Explanation unavailable.")
