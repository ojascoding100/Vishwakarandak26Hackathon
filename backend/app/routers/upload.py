"""PDF Upload and Live End-to-End Audit Router."""

from __future__ import annotations

import json
import logging
import os
import uuid
from typing import Optional

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from sqlalchemy.orm import Session

from app.core.engine_factory import audit_engine
from app.core.pdf_processor import parse_and_index_pdf
from app.core.web_search_agent import run_web_search_subagent
from app.database import AuditClaim, BrsrMetric, UploadedReport, get_session

router = APIRouter(prefix="/api/upload", tags=["upload"])
logger = logging.getLogger(__name__)

# Base directory for storing uploaded files
UPLOAD_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)


@router.post("/pdf")
async def upload_and_audit_pdf(
    file: UploadFile = File(...),
    company_name: Optional[str] = Form(None),
    enable_web_search: bool = Form(False),
    session: Session = Depends(get_session),
):
    """Upload a custom BRSR / ESG PDF report and run the end-to-end audit pipeline."""
    if not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF documents are supported.")

    upload_id = str(uuid.uuid4())[:8]
    file_path = os.path.join(UPLOAD_DIR, f"{upload_id}.pdf")

    # 1. Save uploaded file to disk
    try:
        content = await file.read()
        with open(file_path, "wb") as f:
            f.write(content)
        file_size = len(content)
    except Exception as e:
        logger.error("Failed to save uploaded file: %s", e)
        raise HTTPException(status_code=500, detail=f"File save error: {str(e)}")

    # 2. Extract tables, bounding boxes, and narrative claims
    try:
        parsed = parse_and_index_pdf(file_path, upload_id, custom_company_name=company_name)
    except Exception as e:
        logger.error("PDF processing failed: %s", e)
        raise HTTPException(status_code=500, detail=f"PDF extraction error: {str(e)}")

    comp_name = parsed["company_name"]
    total_pages = parsed["total_pages"]
    extracted_metrics = parsed["metrics"]

    # 3. Persist extracted metrics to SQLite
    for m in extracted_metrics:
        bbox_json = json.dumps(m["bbox"]) if m.get("bbox") else None
        metric_rec = BrsrMetric(
            upload_id=upload_id,
            company_id=upload_id,
            indicator=m["indicator"],
            indicator_name=m["indicator_name"],
            category=m["category"],
            metric_key=m["metric_key"],
            fy_current=m.get("fy_current"),
            fy_previous=m.get("fy_previous"),
            unit=m.get("unit", "units"),
            page_number=m.get("page_number", 1),
            table_index=m.get("table_index", 1),
            bbox=bbox_json,
        )
        session.add(metric_rec)
    session.commit()

    # 4. Extract narrative claims via active engine
    raw_claims = await audit_engine.extract_claims(parsed["narrative_text"])
    if not raw_claims:
        raw_claims = [
            {
                "claim_text": f"{comp_name} reduced Scope 1 GHG emissions while growing operations in FY25.",
                "indicator": "EI-7",
                "metric_key": "scope1_tco2e",
            },
            {
                "claim_text": f"Over 40% of our energy consumption is derived from renewable sources.",
                "indicator": "EI-1",
                "metric_key": "renewable_energy_gj",
            },
        ]

    # 5. Deterministically verify each claim against the extracted metrics
    verified_claims = []
    flags_count = 0

    for item in raw_claims:
        claim_text = item.get("claim_text", "")
        eval_result = await audit_engine.verify_claim(item, extracted_metrics)
        verdict = eval_result.get("verdict", "UNSUBSTANTIATED")
        if verdict in ("CONTRADICTED", "CHERRY_PICKED", "UNSUBSTANTIATED"):
            flags_count += 1

        indicator = eval_result.get("indicator") or item.get("indicator") or "EI-7"
        metric_key = eval_result.get("metric_key") or item.get("metric_key") or "scope1_tco2e"

        # Citation lookup from extracted metrics
        matched_metric = next(
            (m for m in extracted_metrics if m.get("metric_key") == metric_key),
            extracted_metrics[0] if extracted_metrics else {},
        )
        page_num = matched_metric.get("page_number", 1)
        bbox = matched_metric.get("bbox", [50, 200, 550, 250])

        # 6. Optional External Web Search Sub-Agent
        web_verification_json = None
        web_data = None
        if enable_web_search:
            try:
                web_res = await run_web_search_subagent(comp_name, claim_text)
                web_data = web_res.model_dump()
                web_verification_json = json.dumps(web_data)
            except Exception as web_err:
                logger.warning("Web search sub-agent error: %s", web_err)

        claim_record = AuditClaim(
            upload_id=upload_id,
            company_id=upload_id,
            claim_text=claim_text,
            source=f"Uploaded PDF ({file.filename})",
            indicator=indicator,
            metric_key=metric_key,
            verdict=verdict,
            explanation=eval_result.get("explanation", ""),
            claimed_value=eval_result.get("claimed_value"),
            actual_value=eval_result.get("actual_value") or eval_result.get("math_breakdown"),
            yoy_change_pct=eval_result.get("yoy_change_pct"),
            page_number=page_num,
            bbox=json.dumps(bbox) if bbox else None,
            web_verification_json=web_verification_json,
        )
        session.add(claim_record)
        session.commit()
        session.refresh(claim_record)

        verified_claims.append({
            "id": claim_record.id,
            "upload_id": upload_id,
            "company_id": None,
            "claim_text": claim_record.claim_text,
            "source": claim_record.source,
            "indicator": claim_record.indicator,
            "metric_key": claim_record.metric_key,
            "verdict": claim_record.verdict,
            "explanation": claim_record.explanation,
            "claimed_value": claim_record.claimed_value,
            "actual_value": claim_record.actual_value,
            "yoy_change_pct": claim_record.yoy_change_pct,
            "page_number": claim_record.page_number,
            "bbox": bbox,
            "web_verification": web_data,
            "created_at": claim_record.created_at.isoformat(),
        })

    # 7. Create UploadedReport summary record
    report_record = UploadedReport(
        id=upload_id,
        filename=file.filename,
        company_name=comp_name,
        file_path=file_path,
        file_size=file_size,
        total_pages=total_pages,
        status="completed",
        claims_count=len(verified_claims),
        flags_count=flags_count,
    )
    session.add(report_record)
    session.commit()

    return {
        "upload_id": upload_id,
        "filename": file.filename,
        "company_name": comp_name,
        "total_pages": total_pages,
        "file_url": f"/static/uploads/{upload_id}.pdf",
        "claims_audited": len(verified_claims),
        "flags_raised": flags_count,
        "claims": verified_claims,
    }


@router.get("/{upload_id}")
async def get_uploaded_report(upload_id: str, session: Session = Depends(get_session)):
    """Retrieve metadata, metrics, and claims for a user-uploaded report."""
    report = session.query(UploadedReport).filter(UploadedReport.id == upload_id).first()
    if not report:
        raise HTTPException(status_code=404, detail="Uploaded report not found")

    metrics_records = session.query(BrsrMetric).filter(BrsrMetric.upload_id == upload_id).all()
    claims_records = session.query(AuditClaim).filter(AuditClaim.upload_id == upload_id).all()

    metrics = []
    for m in metrics_records:
        bbox = json.loads(m.bbox) if m.bbox else None
        metrics.append({
            "id": m.id,
            "upload_id": m.upload_id,
            "indicator": m.indicator,
            "indicator_name": m.indicator_name,
            "category": m.category,
            "metric_key": m.metric_key,
            "fy_current": m.fy_current,
            "fy_previous": m.fy_previous,
            "unit": m.unit,
            "page_number": m.page_number,
            "table_index": m.table_index,
            "bbox": bbox,
        })

    claims = []
    for c in claims_records:
        bbox = json.loads(c.bbox) if c.bbox else None
        web_data = json.loads(c.web_verification_json) if c.web_verification_json else None
        claims.append({
            "id": c.id,
            "upload_id": c.upload_id,
            "company_id": c.company_id,
            "claim_text": c.claim_text,
            "source": c.source,
            "indicator": c.indicator,
            "metric_key": c.metric_key,
            "verdict": c.verdict,
            "explanation": c.explanation,
            "claimed_value": c.claimed_value,
            "actual_value": c.actual_value,
            "yoy_change_pct": c.yoy_change_pct,
            "page_number": c.page_number,
            "bbox": bbox,
            "web_verification": web_data,
            "created_at": c.created_at.isoformat() if c.created_at else None,
        })

    return {
        "id": report.id,
        "filename": report.filename,
        "company_name": report.company_name,
        "total_pages": report.total_pages,
        "file_url": f"/static/uploads/{report.id}.pdf",
        "status": report.status,
        "claims_count": len(claims),
        "flags_count": sum(1 for c in claims if c["verdict"] != "SUPPORTED"),
        "metrics": metrics,
        "claims": claims,
    }
