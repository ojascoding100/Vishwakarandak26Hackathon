"""Audit verification endpoints for claims against BRSR filings."""

from __future__ import annotations

import json
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.core.engine_factory import audit_engine
from app.core.pdf_indexer import get_company_metrics, get_metric_for_claim
from app.database import AuditClaim, Company, get_session

router = APIRouter(prefix="/api/audits", tags=["audits"])


class VerifyRequest(BaseModel):
    text: str
    company_id: str
    demo_mode: Optional[bool] = False


@router.get("/demo-presets")
async def get_demo_presets():
    """Return pre-configured, offline-resilient forensic audit demo scenarios for judge presentations."""
    return [
        {
            "id": "demo-1-contradicted",
            "company_id": "reliance",
            "company_name": "Reliance Industries Limited",
            "ticker": "RELIANCE.NS",
            "sector": "Energy & Materials",
            "claim_text": "In FY25, Reliance achieved an 18% absolute reduction in our total greenhouse gas emissions, reflecting our net-zero operational pledge.",
            "source": "Corporate Press Release & MD&A Summary",
            "indicator": "EI-7",
            "indicator_name": "Scope 1 & 2 GHG Emissions",
            "metric_key": "scope1_tco2e",
            "verdict": "CONTRADICTED",
            "claimed_value": "-18% Absolute Reduction",
            "actual_value": "Scope 1: 51.8M → 54.2M tCO2e (+4.6% YoY Increase)",
            "yoy_change_pct": 4.63,
            "page_number": 92,
            "bbox": [52, 180, 558, 225],
            "explanation": "Deterministic audit reveals Scope 1 GHG emissions increased from 51,800,000 to 54,200,000 tCO2e (+4.63%). The public claim of an 18% absolute reduction is mathematically contradicted by the audited BRSR Principle 6 filing.",
            "web_verification": {
                "web_corroboration_status": "EXTERNAL_DISCREPANCY_FOUND",
                "web_summary": "Environmental watchdog reports and industry analysis corroborate that gross emissions expanded at Jamnagar refining assets, disputing claims of footprint shrinkage.",
                "articles": [
                    {
                        "title": "Watchdog Scrutiny: Decarbonization Claims vs Audited Industrial Realities",
                        "url": "https://www.environmentalwatchdog.org/reports/reliance-emissions-scrutiny",
                        "source_name": "Environmental Watchdog India",
                        "published_date": "2025-08-14",
                        "snippet": "Independent analysts questioned corporate assertions regarding emission drops after state BRSR disclosures confirmed continuous gross throughput increases.",
                        "stance": "CONTRADICTS"
                    },
                    {
                        "title": "Industrial GHG Footprint Analysis FY25: Top Indian Emitters",
                        "url": "https://economictimes.indiatimes.com/industry/energy/industrial-emissions-fy25",
                        "source_name": "The Economic Times",
                        "published_date": "2025-06-20",
                        "snippet": "Audited SEBI filings indicate emissions trajectory followed refining expansion rather than immediate absolute net decline.",
                        "stance": "CONTRADICTS"
                    }
                ]
            }
        },
        {
            "id": "demo-2-cherrypicked",
            "company_id": "tata_steel",
            "company_name": "Tata Steel Limited",
            "ticker": "TATASTEEL.NS",
            "sector": "Energy & Materials",
            "claim_text": "Tata Steel achieved a benchmark carbon intensity of 2.42 tCO2e per tonne of crude steel, showcasing industry-leading decarbonization progress.",
            "source": "Annual ESG Highlights Brochure",
            "indicator": "EI-7",
            "indicator_name": "GHG Emission Intensity",
            "metric_key": "ghg_intensity_per_tonne",
            "verdict": "CHERRY_PICKED",
            "claimed_value": "Decarbonization Progress at 2.42 tCO2e/tonne",
            "actual_value": "Intensity: 2.38 → 2.42 tCO2e/tonne (+1.68% YoY Rise)",
            "yoy_change_pct": 1.68,
            "page_number": 78,
            "bbox": [48, 310, 550, 350],
            "explanation": "While the 2.42 intensity value exists in the report, the prior year figure was 2.38. Intensity rose by +1.68% YoY. Framing an increased emission rate as 'progress' cherry-picks the absolute number while omitting the worsening trend direction.",
            "web_verification": {
                "web_corroboration_status": "EXTERNAL_DISCREPANCY_FOUND",
                "web_summary": "Steel sector sustainability reviews confirm blast-furnace maintenance schedules temporarily increased specific emission intensity across eastern plants.",
                "articles": [
                    {
                        "title": "Steel Decarbonization Watch: Tracking Crude Steel Specific Emissions",
                        "url": "https://www.cseindia.org/ratings/steel-decarbonization-benchmark",
                        "source_name": "Center for Science & Environment",
                        "published_date": "2025-05-19",
                        "snippet": "Blast-furnace coal blend transitions led to marginal increases in carbon intensity across domestic steel producers during the reported period.",
                        "stance": "CONTRADICTS"
                    }
                ]
            }
        },
        {
            "id": "demo-3-unsubstantiated",
            "company_id": "ultratech",
            "company_name": "UltraTech Cement Limited",
            "ticker": "ULTRACEMCO.NS",
            "sector": "Energy & Materials",
            "claim_text": "UltraTech achieved the lowest clinker factor and highest circular material integration in the Indian cement manufacturing sector.",
            "source": "Investor Presentation & MD Address",
            "indicator": "EI-7",
            "indicator_name": "Cement Emission & Clinker Disclosures",
            "metric_key": "ghg_intensity_per_tonne",
            "verdict": "UNSUBSTANTIATED",
            "claimed_value": "Sector-Lowest Clinker Factor",
            "actual_value": "BRSR reports 0.548 tCO2e/tonne (No industry peer clinker data)",
            "yoy_change_pct": -2.32,
            "page_number": 72,
            "bbox": [50, 310, 555, 350],
            "explanation": "While intensity declined to 0.548 tCO2e/tonne, the BRSR filing provides no comparative industry clinker factor data. Sector-wide superiority assertions cannot be substantiated from the audited document alone.",
            "web_verification": {
                "web_corroboration_status": "NO_PUBLIC_RECORDS_FOUND",
                "web_summary": "No verified peer-comparative clinker index published under official regulatory oversight corroborates the claim of achieving the lowest clinker ratio.",
                "articles": [
                    {
                        "title": "Cement Industry Decarbonization & Clinker Factor Disclosures",
                        "url": "https://www.livemint.com/market/cement-sustainability-ratings",
                        "source_name": "Livemint Industry Desk",
                        "published_date": "2025-04-11",
                        "snippet": "Clinker factor disclosures remain voluntary and unstandardized across Indian cement producers under standard BRSR guidelines.",
                        "stance": "NEUTRAL_MENTION"
                    }
                ]
            }
        },
        {
            "id": "demo-4-supported",
            "company_id": "infosys",
            "company_name": "Infosys Limited",
            "ticker": "INFY.NS",
            "sector": "IT & Services",
            "claim_text": "Infosys reduced total operational energy consumption by 5.4% while growing revenue, and sourced 60% of our power from renewable assets.",
            "source": "Integrated Annual Report & ESG Factsheet",
            "indicator": "EI-1",
            "indicator_name": "Energy Consumption & Clean Energy",
            "metric_key": "total_energy_gj",
            "verdict": "SUPPORTED",
            "claimed_value": "-5.4% Total Energy | 60% Renewable Share",
            "actual_value": "Total: 6.15M → 5.82M GJ (-5.37%) | Renewable: 3.49M/5.82M GJ (59.97%)",
            "yoy_change_pct": -5.37,
            "page_number": 52,
            "bbox": [55, 280, 545, 365],
            "explanation": "Verified with 100% mathematical precision. Energy consumption fell from 6,150,000 to 5,820,000 GJ (-5.37%, accurately stated as 5.4%). Renewable energy accounted for 3,490,000 GJ (59.97%, accurately rounded to 60%). Claim is fully supported.",
            "web_verification": {
                "web_corroboration_status": "EXTERNALLY_CORROBORATED",
                "web_summary": "RE100 annual compliance data and external solar PPA verification confirm Infosys achieved stated campus solar procurement milestones.",
                "articles": [
                    {
                        "title": "RE100 Global Leadership: Indian IT Sector Clean Energy Milestones",
                        "url": "https://www.there100.org/news/indian-it-clean-energy-procurement",
                        "source_name": "RE100 Climate Group",
                        "published_date": "2025-07-28",
                        "snippet": "Independent solar farm power purchase agreements in Karnataka and Tamil Nadu verified 60% renewable electricity coverage for campus facilities.",
                        "stance": "CORROBORATES"
                    }
                ]
            }
        }
    ]


class VerifySingleRequest(BaseModel):
    claim_text: str
    company_id: str
    indicator: Optional[str] = None
    metric_key: Optional[str] = None


@router.post("/verify")
async def verify_claims(payload: VerifyRequest, session: Session = Depends(get_session)):
    """Extract claims from text and verify each deterministically against BRSR data."""
    company = session.query(Company).filter(Company.id == payload.company_id).first()
    if not company:
        raise HTTPException(status_code=404, detail=f"Company '{payload.company_id}' not found")

    # 1. Fetch all BRSR metrics for this company
    metrics = get_company_metrics(session, payload.company_id)
    if not metrics:
        raise HTTPException(status_code=400, detail="No BRSR metrics indexed for this company")

    # 2. Extract claims using active engine (Ollama -> Cloud -> Heuristic)
    extracted = await audit_engine.extract_claims(payload.text)
    if not extracted:
        # Fallback to entire text as single claim
        extracted = [{
            "claim_text": payload.text.strip(),
            "indicator": "EI-7",
            "metric_key": "scope1_tco2e",
        }]

    verified_claims = []
    for item in extracted:
        claim_text = item.get("claim_text", "")
        # Verification with deterministic math
        result = await audit_engine.verify_claim(item, metrics)

        indicator = result.get("indicator") or item.get("indicator") or "EI-7"
        metric_key = result.get("metric_key") or item.get("metric_key") or "scope1_tco2e"

        # Citation lookup
        citation = get_metric_for_claim(session, payload.company_id, indicator, metric_key)
        page_number = citation.get("page_number") if citation else 1
        bbox = citation.get("bbox") if citation else [50, 200, 550, 250]

        audit_record = AuditClaim(
            company_id=payload.company_id,
            claim_text=claim_text,
            source="Live Auditor Input",
            indicator=indicator,
            metric_key=metric_key,
            verdict=result.get("verdict", "UNSUBSTANTIATED"),
            explanation=result.get("explanation", ""),
            claimed_value=result.get("claimed_value"),
            actual_value=result.get("actual_value") or result.get("math_breakdown"),
            yoy_change_pct=result.get("yoy_change_pct"),
            page_number=page_number,
            bbox=json.dumps(bbox) if bbox else None,
        )
        session.add(audit_record)
        session.commit()
        session.refresh(audit_record)

        verified_claims.append({
            "id": audit_record.id,
            "company_id": audit_record.company_id,
            "claim_text": audit_record.claim_text,
            "source": audit_record.source,
            "indicator": audit_record.indicator,
            "metric_key": audit_record.metric_key,
            "verdict": audit_record.verdict,
            "explanation": audit_record.explanation,
            "claimed_value": audit_record.claimed_value,
            "actual_value": audit_record.actual_value,
            "yoy_change_pct": audit_record.yoy_change_pct,
            "page_number": audit_record.page_number,
            "bbox": bbox,
            "created_at": audit_record.created_at.isoformat() if audit_record.created_at else None,
        })

    return {
        "claims": verified_claims,
        "engine_mode": audit_engine.current_mode.value,
    }


@router.get("/claims/{company_id}")
async def get_claims_by_company(company_id: str, session: Session = Depends(get_session)):
    """Retrieve all claims and forensic verdicts for a specific company."""
    claims = (
        session.query(AuditClaim)
        .filter(AuditClaim.company_id == company_id)
        .order_by(AuditClaim.id.desc())
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


@router.post("/verify-single")
async def verify_single_claim(payload: VerifySingleRequest, session: Session = Depends(get_session)):
    """Verify an individual claim with explicit indicator and metric metadata."""
    metrics = get_company_metrics(session, payload.company_id)
    if not metrics:
        raise HTTPException(status_code=400, detail="No BRSR metrics indexed for company")

    claim_dict = {
        "claim_text": payload.claim_text,
        "indicator": payload.indicator or "EI-7",
        "metric_key": payload.metric_key or "scope1_tco2e",
    }
    result = await audit_engine.verify_claim(claim_dict, metrics)

    citation = get_metric_for_claim(
        session, payload.company_id, claim_dict["indicator"], claim_dict["metric_key"]
    )
    page_number = citation.get("page_number") if citation else 1
    bbox = citation.get("bbox") if citation else [50, 200, 550, 250]

    record = AuditClaim(
        company_id=payload.company_id,
        claim_text=payload.claim_text,
        source="Direct API Verification",
        indicator=claim_dict["indicator"],
        metric_key=claim_dict["metric_key"],
        verdict=result.get("verdict", "UNSUBSTANTIATED"),
        explanation=result.get("explanation", ""),
        claimed_value=result.get("claimed_value"),
        actual_value=result.get("actual_value") or result.get("math_breakdown"),
        yoy_change_pct=result.get("yoy_change_pct"),
        page_number=page_number,
        bbox=json.dumps(bbox) if bbox else None,
    )
    session.add(record)
    session.commit()
    session.refresh(record)

    return {
        "id": record.id,
        "company_id": record.company_id,
        "claim_text": record.claim_text,
        "source": record.source,
        "indicator": record.indicator,
        "metric_key": record.metric_key,
        "verdict": record.verdict,
        "explanation": record.explanation,
        "claimed_value": record.claimed_value,
        "actual_value": record.actual_value,
        "yoy_change_pct": record.yoy_change_pct,
        "page_number": record.page_number,
        "bbox": bbox,
        "created_at": record.created_at.isoformat() if record.created_at else None,
    }



@router.post("/{claim_id}/web-verify")
async def web_verify_claim(claim_id: int, session: Session = Depends(get_session)):
    """Run on-demand Web Search Sub-Agent check for an individual claim card."""
    claim = session.query(AuditClaim).filter(AuditClaim.id == claim_id).first()
    if not claim:
        raise HTTPException(status_code=404, detail="Claim not found")

    # Resolve company name
    company_name = "Corporate Entity"
    if claim.upload_id:
        from app.database import UploadedReport
        rep = session.query(UploadedReport).filter(UploadedReport.id == claim.upload_id).first()
        if rep:
            company_name = rep.company_name
    elif claim.company_id:
        company = session.query(Company).filter(Company.id == claim.company_id).first()
        if company:
            company_name = company.name
        else:
            from app.database import UploadedReport
            rep = session.query(UploadedReport).filter(UploadedReport.id == claim.company_id).first()
            if rep:
                company_name = rep.company_name

    from app.core.web_search_agent import run_web_search_subagent
    web_result = await run_web_search_subagent(company_name, claim.claim_text)
    web_data = web_result.model_dump()

    claim.web_verification_json = json.dumps(web_data)
    session.commit()
    session.refresh(claim)

    bbox = json.loads(claim.bbox) if claim.bbox else None
    return {
        "id": claim.id,
        "company_id": claim.company_id,
        "upload_id": claim.upload_id,
        "claim_text": claim.claim_text,
        "source": claim.source,
        "indicator": claim.indicator,
        "metric_key": claim.metric_key,
        "verdict": claim.verdict,
        "explanation": claim.explanation,
        "claimed_value": claim.claimed_value,
        "actual_value": claim.actual_value,
        "yoy_change_pct": claim.yoy_change_pct,
        "page_number": claim.page_number,
        "bbox": bbox,
        "web_verification": web_data,
        "created_at": claim.created_at.isoformat() if claim.created_at else None,
    }


@router.get("/{entity_id}/export")
async def export_audit_dossier(entity_id: str, session: Session = Depends(get_session)):
    """Export an executive sustainability audit dossier combining internal BRSR table checks and external web findings."""
    claims = (
        session.query(AuditClaim)
        .filter((AuditClaim.company_id == entity_id) | (AuditClaim.upload_id == entity_id))
        .all()
    )
    if not claims:
        raise HTTPException(status_code=404, detail="No audit claims found for this entity.")

    company_name = entity_id.replace("_", " ").title()
    company = session.query(Company).filter(Company.id == entity_id).first()
    if company:
        company_name = company.name
    else:
        from app.database import UploadedReport
        rep = session.query(UploadedReport).filter(UploadedReport.id == entity_id).first()
        if rep:
            company_name = rep.company_name

    contradictions = sum(1 for c in claims if c.verdict == "CONTRADICTED")
    cherry_picked = sum(1 for c in claims if c.verdict == "CHERRY_PICKED")
    unsubstantiated = sum(1 for c in claims if c.verdict == "UNSUBSTANTIATED")
    supported = sum(1 for c in claims if c.verdict == "SUPPORTED")

    export_claims = []
    for c in claims:
        web_info = json.loads(c.web_verification_json) if c.web_verification_json else None
        export_claims.append({
            "claim_text": c.claim_text,
            "verdict": c.verdict,
            "indicator": c.indicator,
            "metric_key": c.metric_key,
            "math_recheck": c.actual_value,
            "explanation": c.explanation,
            "pdf_citation": f"Page {c.page_number or 1}",
            "web_corroboration": web_info.get("web_corroboration_status") if web_info else "NOT_SEARCHED",
            "web_articles_count": len(web_info.get("articles", [])) if web_info else 0,
        })

    return {
        "title": f"VeritasESG® Forensic Audit Dossier — {company_name}",
        "entity_id": entity_id,
        "company_name": company_name,
        "audited_standard": "SEBI BRSR Principle 6 (India)",
        "summary": {
            "total_claims": len(claims),
            "contradicted": contradictions,
            "cherry_picked": cherry_picked,
            "unsubstantiated": unsubstantiated,
            "supported": supported,
            "credibility_score": round((supported / len(claims)) * 100, 1) if claims else 0,
        },
        "claims": export_claims,
    }
