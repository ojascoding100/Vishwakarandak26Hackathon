"""Benchmark evaluation endpoints comparing automated audits against 60 expert-labeled claims."""

from __future__ import annotations

import logging
from typing import Any
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.engine_factory import audit_engine
from app.core.pdf_indexer import get_company_metrics
from app.database import BenchmarkItem, get_session

router = APIRouter(prefix="/api/benchmark", tags=["benchmark"])
logger = logging.getLogger(__name__)

# Cached evaluation results
_cached_results: dict[str, Any] | None = None


@router.get("/groundtruth")
async def get_groundtruth(session: Session = Depends(get_session)):
    """Retrieve all 60 annotated ground-truth claims used for the accuracy benchmark."""
    items = session.query(BenchmarkItem).order_by(BenchmarkItem.id.asc()).all()
    return [
        {
            "id": it.id,
            "company_id": it.company_id,
            "claim_text": it.claim_text,
            "source": it.source,
            "indicator": it.indicator,
            "metric_key": it.metric_key,
            "ground_truth": it.ground_truth,
            "explanation": it.explanation,
        }
        for it in items
    ]


@router.post("/evaluate")
async def run_benchmark_evaluation(session: Session = Depends(get_session)):
    """Evaluate system precision, recall, and F1-score against the 60 ground-truth claims."""
    global _cached_results
    items = session.query(BenchmarkItem).order_by(BenchmarkItem.id.asc()).all()

    # Pre-cache company metrics
    company_ids = list({it.company_id for it in items})
    metrics_by_company = {cid: get_company_metrics(session, cid) for cid in company_ids}

    evaluated_items = []
    tp = 0  # Flagged discrepancy correctly (Contradicted, Cherry-picked, Unsubstantiated)
    fp = 0  # Flagged discrepancy when actually Supported
    tn = 0  # Confirmed Supported correctly
    fn = 0  # Marked Supported when actually a Discrepancy

    for it in items:
        metrics = metrics_by_company.get(it.company_id, [])
        claim_dict = {
            "claim_text": it.claim_text,
            "indicator": it.indicator,
            "metric_key": it.metric_key,
        }

        # Run verification using the active engine
        res = await audit_engine.verify_claim(claim_dict, metrics)
        predicted = res.get("verdict", "UNSUBSTANTIATED")
        ground_truth = it.ground_truth

        # Binary discrepancy classification:
        # Positive = Flag raised (CONTRADICTED, CHERRY_PICKED, UNSUBSTANTIATED)
        # Negative = Claim verified (SUPPORTED)
        is_pred_flag = predicted in ("CONTRADICTED", "CHERRY_PICKED", "UNSUBSTANTIATED")
        is_gt_flag = ground_truth in ("CONTRADICTED", "CHERRY_PICKED", "UNSUBSTANTIATED")

        if is_pred_flag and is_gt_flag:
            tp += 1
        elif is_pred_flag and not is_gt_flag:
            fp += 1
        elif not is_pred_flag and not is_gt_flag:
            tn += 1
        else:
            fn += 1

        exact_match = (predicted == ground_truth)

        evaluated_items.append({
            "id": it.id,
            "company_id": it.company_id,
            "claim_text": it.claim_text,
            "source": it.source,
            "indicator": it.indicator,
            "metric_key": it.metric_key,
            "ground_truth": ground_truth,
            "predicted": predicted,
            "agreed": exact_match,
            "flag_agreement": (is_pred_flag == is_gt_flag),
            "explanation": res.get("explanation") or it.explanation,
        })

    total = len(items)
    precision = (tp / (tp + fp)) if (tp + fp) > 0 else 0.0
    recall = (tp / (tp + fn)) if (tp + fn) > 0 else 0.0
    f1_score = (2 * precision * recall / (precision + recall)) if (precision + recall) > 0 else 0.0
    accuracy = ((tp + tn) / total) if total > 0 else 0.0

    _cached_results = {
        "true_positives": tp,
        "false_positives": fp,
        "true_negatives": tn,
        "false_negatives": fn,
        "precision": round(precision, 4),
        "recall": round(recall, 4),
        "f1_score": round(f1_score, 4),
        "accuracy": round(accuracy, 4),
        "total_items": total,
        "engine_mode": audit_engine.current_mode.value,
        "items": evaluated_items,
    }

    return _cached_results


@router.get("/metrics")
async def get_benchmark_metrics(session: Session = Depends(get_session)):
    """Retrieve the latest accuracy evaluation metrics."""
    global _cached_results
    if _cached_results is None:
        return await run_benchmark_evaluation(session)
    return _cached_results
