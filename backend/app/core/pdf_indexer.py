"""BRSR metric and PDF citation indexing and bounding box lookup."""

from __future__ import annotations

import json
from typing import Any, Optional
from sqlalchemy.orm import Session

from app.database import BrsrMetric


def get_company_metrics(session: Session, company_id: str) -> list[dict[str, Any]]:
    """Retrieve all indexed BRSR metrics for a specific company."""
    records = session.query(BrsrMetric).filter(BrsrMetric.company_id == company_id).all()
    results = []
    for r in records:
        bbox = json.loads(r.bbox) if r.bbox else None
        results.append({
            "id": r.id,
            "company_id": r.company_id,
            "indicator": r.indicator,
            "indicator_name": r.indicator_name,
            "category": r.category,
            "metric_key": r.metric_key,
            "fy_current": r.fy_current,
            "fy_previous": r.fy_previous,
            "unit": r.unit,
            "page_number": r.page_number,
            "table_index": r.table_index,
            "bbox": bbox,
        })
    return results


def get_metric_for_claim(
    session: Session, company_id: str, indicator: str, metric_key: str
) -> dict[str, Any] | None:
    """Retrieve the exact BRSR metric citation corresponding to a claim."""
    record = (
        session.query(BrsrMetric)
        .filter(
            BrsrMetric.company_id == company_id,
            BrsrMetric.indicator == indicator,
            BrsrMetric.metric_key == metric_key,
        )
        .first()
    )
    if not record:
        # Fallback to any metric in the indicator
        record = (
            session.query(BrsrMetric)
            .filter(
                BrsrMetric.company_id == company_id,
                BrsrMetric.indicator == indicator,
            )
            .first()
        )
    if not record:
        return None

    bbox = json.loads(record.bbox) if record.bbox else None
    return {
        "id": record.id,
        "company_id": record.company_id,
        "indicator": record.indicator,
        "indicator_name": record.indicator_name,
        "category": record.category,
        "metric_key": record.metric_key,
        "fy_current": record.fy_current,
        "fy_previous": record.fy_previous,
        "unit": record.unit,
        "page_number": record.page_number,
        "table_index": record.table_index,
        "bbox": bbox,
    }


def get_bounding_box(
    session: Session, company_id: str, indicator: str, metric_key: str
) -> dict[str, Any] | None:
    """Get the page number and pixel bounding box coordinates [x0, y0, x1, y1]."""
    metric = get_metric_for_claim(session, company_id, indicator, metric_key)
    if not metric:
        return None
    return {
        "page_number": metric.get("page_number", 1),
        "table_index": metric.get("table_index", 1),
        "bbox": metric.get("bbox", [50, 200, 550, 250]),
        "indicator": metric.get("indicator"),
        "indicator_name": metric.get("indicator_name"),
    }

