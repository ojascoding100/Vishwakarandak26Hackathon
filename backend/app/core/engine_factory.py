"""Dual-engine router implementing Ollama -> Cloud API -> Offline Deterministic Fallback."""

from __future__ import annotations

import logging
from enum import Enum
from typing import Any, Optional

from app.config import settings
from app.core.cloud_fallback import (
    check_cloud_health,
    extract_claims_cloud,
    generate_explanation_cloud,
)
from app.core.ollama_client import (
    check_ollama_health,
    extract_claims_ollama,
    generate_explanation_ollama,
)
from app.core.rule_evaluator import (
    evaluate_claim_against_metrics,
    extract_claims_heuristic,
)

logger = logging.getLogger(__name__)


class EngineMode(str, Enum):
    """Execution mode of the VeritasESG audit engine."""

    LOCAL = "Qwen3-8B (Local Ollama)"
    CLOUD = "Gemini 2.5 Flash (Cloud)"
    HEURISTIC = "Deterministic Rule Fallback (Offline)"


class AuditEngine:
    """Provider-Agnostic Audit Engine Interface with triple-tier fallback."""

    def __init__(self) -> None:
        self.current_mode: EngineMode = EngineMode.HEURISTIC
        self.is_healthy: bool = True
        self.status_detail: str = "Initialized"

    async def initialize(self) -> EngineMode:
        """Probe engines in priority order: Local Ollama -> Cloud Gemini -> Offline Rule."""
        logger.info("Probing Ollama local instance at %s...", settings.OLLAMA_BASE_URL)
        if await check_ollama_health():
            self.current_mode = EngineMode.LOCAL
            self.is_healthy = True
            self.status_detail = f"Local Ollama online ({settings.OLLAMA_MODEL})"
            logger.info("Engine initialized: %s", self.current_mode.value)
            return self.current_mode

        logger.info("Ollama unreachable. Probing Cloud Gemini fallback...")
        if settings.GEMINI_API_KEY and await check_cloud_health():
            self.current_mode = EngineMode.CLOUD
            self.is_healthy = True
            self.status_detail = "Cloud Gemini 2.5 Flash active"
            logger.info("Engine initialized: %s", self.current_mode.value)
            return self.current_mode

        self.current_mode = EngineMode.HEURISTIC
        self.is_healthy = True
        self.status_detail = "Deterministic Rule Fallback (Offline Active)"
        logger.info("Engine initialized: %s", self.current_mode.value)
        return self.current_mode

    async def extract_claims(self, text: str) -> list[dict]:
        """Extract atomic ESG claims from text with automatic fallback."""
        if self.current_mode == EngineMode.LOCAL:
            try:
                claims = await extract_claims_ollama(text)
                if claims:
                    return claims
            except Exception as e:
                logger.warning("Local Ollama extraction failed (%s). Attempting Cloud fallback...", e)

        if self.current_mode in (EngineMode.LOCAL, EngineMode.CLOUD) and settings.GEMINI_API_KEY:
            try:
                claims = await extract_claims_cloud(text)
                if claims:
                    return claims
            except Exception as e:
                logger.warning("Cloud extraction failed (%s). Falling back to heuristic...", e)

        # Tertiary fallback: Heuristic regex extraction
        logger.info("Using deterministic regex extraction.")
        return extract_claims_heuristic(text)

    async def verify_claim(self, claim: dict, metrics: list[dict]) -> dict:
        """Verify an individual claim against company BRSR metrics.
        
        Deterministic verification is always used for the math and initial verdict,
        guaranteeing zero LLM hallucination for numbers. LLM is used to enhance
        forensic explanations if available.
        """
        claim_text = claim.get("claim_text", "")
        # Rule evaluator provides deterministic ground truth math
        eval_result = evaluate_claim_against_metrics(claim_text, metrics)

        # Enhance explanation if local or cloud LLM is active and has non-empty explanation
        explanation = eval_result.get("explanation", "")
        if self.current_mode == EngineMode.LOCAL:
            try:
                matched_metric = next(
                    (m for m in metrics if m.get("metric_key") == eval_result.get("metric_key")),
                    metrics[0] if metrics else {}
                )
                llm_explanation = await generate_explanation_ollama(claim_text, matched_metric, eval_result)
                if llm_explanation and len(llm_explanation.strip()) > 10:
                    explanation = llm_explanation
            except Exception as e:
                logger.debug("Ollama explanation generation skipped: %s", e)
        elif self.current_mode == EngineMode.CLOUD and settings.GEMINI_API_KEY:
            try:
                matched_metric = next(
                    (m for m in metrics if m.get("metric_key") == eval_result.get("metric_key")),
                    metrics[0] if metrics else {}
                )
                llm_explanation = await generate_explanation_cloud(claim_text, matched_metric, eval_result)
                if llm_explanation and len(llm_explanation.strip()) > 10:
                    explanation = llm_explanation
            except Exception as e:
                logger.debug("Cloud explanation generation skipped: %s", e)

        eval_result["explanation"] = explanation
        return eval_result

    async def get_status(self) -> dict:
        """Return real-time engine telemetry."""
        # Quick re-probe if in local mode to detect if Ollama shut down
        if self.current_mode == EngineMode.LOCAL:
            is_local_alive = await check_ollama_health()
            if not is_local_alive:
                await self.initialize()

        return {
            "mode": self.current_mode.name,
            "label": self.current_mode.value,
            "healthy": self.is_healthy,
            "detail": self.status_detail,
            "model": settings.OLLAMA_MODEL if self.current_mode == EngineMode.LOCAL else "gemini-2.5-flash" if self.current_mode == EngineMode.CLOUD else "heuristic-math-v1",
        }


audit_engine = AuditEngine()
