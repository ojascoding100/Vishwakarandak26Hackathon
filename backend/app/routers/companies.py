"""Company directory and BRSR metrics router."""

from __future__ import annotations

import json
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.database import AuditClaim, BrsrMetric, Company, get_session

router = APIRouter(prefix="/api/companies", tags=["companies"])


@router.get("")
async def list_companies(
    search: Optional[str] = Query(None, description="Search query by company name or ticker"),
    sector: Optional[str] = Query(None, description="Filter by sector category"),
    session: Session = Depends(get_session),
):
    """Retrieve all 20 indexed companies with aggregated audit statistics."""
    query = session.query(Company)

    if sector and sector.lower() != "all":
        query = query.filter(Company.sector == sector)

    if search:
        search_term = f"%{search.lower()}%"
        query = query.filter(
            (Company.name.ilike(search_term)) | (Company.ticker.ilike(search_term))
        )

    companies = query.all()
    results = []

    for c in companies:
        claims = session.query(AuditClaim).filter(AuditClaim.company_id == c.id).all()
        claims_audited = len(claims)
        discrepancy_flags = sum(
            1 for cl in claims if cl.verdict in ("CONTRADICTED", "CHERRY_PICKED", "UNSUBSTANTIATED")
        )

        results.append({
            "id": c.id,
            "name": c.name,
            "sector": c.sector,
            "ticker": c.ticker,
            "brsr_fy": c.brsr_fy,
            "brsr_status": c.brsr_status,
            "filing_pages": c.filing_pages,
            "credibility_grade": c.credibility_grade,
            "logo_initial": c.logo_initial,
            "claims_audited": claims_audited,
            "discrepancy_flags": discrepancy_flags,
        })

    return results


@router.get("/{company_id}")
async def get_company(company_id: str, session: Session = Depends(get_session)):
    """Get metadata for a specific company."""
    company = session.query(Company).filter(Company.id == company_id).first()
    if not company:
        raise HTTPException(status_code=404, detail="Company not found")

    claims = session.query(AuditClaim).filter(AuditClaim.company_id == company.id).all()
    return {
        "id": company.id,
        "name": company.name,
        "sector": company.sector,
        "ticker": company.ticker,
        "brsr_fy": company.brsr_fy,
        "brsr_status": company.brsr_status,
        "filing_pages": company.filing_pages,
        "credibility_grade": company.credibility_grade,
        "logo_initial": company.logo_initial,
        "claims_audited": len(claims),
        "discrepancy_flags": sum(1 for cl in claims if cl.verdict != "SUPPORTED"),
    }


@router.get("/{company_id}/metrics")
async def get_company_metrics(company_id: str, session: Session = Depends(get_session)):
    """Retrieve all Principle 6 BRSR metrics for a company with bounding boxes."""
    metrics = session.query(BrsrMetric).filter(BrsrMetric.company_id == company_id).all()
    if not metrics:
        raise HTTPException(status_code=404, detail="Metrics not found for company")

    results = []
    for m in metrics:
        bbox = json.loads(m.bbox) if m.bbox else None
        results.append({
            "id": m.id,
            "company_id": m.company_id,
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
    return results


@router.get("/{company_id}/claims")
async def get_company_claims(company_id: str, session: Session = Depends(get_session)):
    """Retrieve all audited claims and citations for a company."""
    claims = (
        session.query(AuditClaim)
        .filter(AuditClaim.company_id == company_id)
        .order_by(AuditClaim.id.asc())
        .all()
    )

    results = []
    for cl in claims:
        bbox = json.loads(cl.bbox) if cl.bbox else None
        results.append({
            "id": cl.id,
            "company_id": cl.company_id,
            "claim_text": cl.claim_text,
            "source": cl.source,
            "indicator": cl.indicator,
            "metric_key": cl.metric_key,
            "verdict": cl.verdict,
            "explanation": cl.explanation,
            "claimed_value": cl.claimed_value,
            "actual_value": cl.actual_value,
            "yoy_change_pct": cl.yoy_change_pct,
            "page_number": cl.page_number,
            "bbox": bbox,
            "created_at": cl.created_at.isoformat() if cl.created_at else None,
        })
    return results
