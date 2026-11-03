"""SQLAlchemy models, engine, session, and database initialization."""

from __future__ import annotations

import json
import os
from datetime import datetime, timezone
from typing import Generator, Optional

from sqlalchemy import (
    Column,
    DateTime,
    Float,
    ForeignKey,
    Integer,
    String,
    Text,
    create_engine,
)
from sqlalchemy.orm import Session, declarative_base, sessionmaker

from app.config import settings

Base = declarative_base()


# ---------------------------------------------------------------------------
# ORM models
# ---------------------------------------------------------------------------

class Company(Base):
    """A publicly listed Indian company with a BRSR filing."""

    __tablename__ = "companies"

    id: str = Column(String, primary_key=True)
    name: str = Column(String, nullable=False)
    sector: str = Column(String, nullable=False)
    ticker: str = Column(String, nullable=False)
    brsr_fy: str = Column(String, nullable=False)
    brsr_status: str = Column(String, nullable=False)
    filing_pages: int = Column(Integer, nullable=False)
    credibility_grade: str = Column(String, nullable=False)
    logo_initial: str = Column(String, nullable=False)


class UploadedReport(Base):
    """A user-uploaded BRSR or sustainability PDF report."""

    __tablename__ = "uploaded_reports"

    id: str = Column(String, primary_key=True)
    filename: str = Column(String, nullable=False)
    company_name: str = Column(String, nullable=False)
    file_path: str = Column(String, nullable=False)
    file_size: int = Column(Integer, default=0)
    total_pages: int = Column(Integer, default=1)
    status: str = Column(String, default="processing")  # processing, completed, failed
    claims_count: int = Column(Integer, default=0)
    flags_count: int = Column(Integer, default=0)
    created_at: datetime = Column(
        DateTime, nullable=False, default=lambda: datetime.now(timezone.utc)
    )


class BrsrMetric(Base):
    """A single BRSR environmental metric row extracted from a filing."""

    __tablename__ = "brsr_metrics"

    id: int = Column(Integer, primary_key=True, autoincrement=True)
    company_id: Optional[str] = Column(String, nullable=True)
    upload_id: Optional[str] = Column(String, nullable=True)
    indicator: str = Column(String, nullable=False)
    indicator_name: str = Column(String, nullable=False)
    category: str = Column(String, nullable=False)
    metric_key: str = Column(String, nullable=False)
    fy_current: float = Column(Float, nullable=True)
    fy_previous: float = Column(Float, nullable=True)
    unit: str = Column(String, nullable=False)
    page_number: int = Column(Integer, nullable=True)
    table_index: int = Column(Integer, nullable=True)
    bbox: str = Column(Text, nullable=True)  # JSON string of [x0, y0, x1, y1]


class AuditClaim(Base):
    """An ESG claim that has been verified against BRSR data."""

    __tablename__ = "audit_claims"

    id: int = Column(Integer, primary_key=True, autoincrement=True)
    company_id: Optional[str] = Column(String, nullable=True)
    upload_id: Optional[str] = Column(String, nullable=True)
    claim_text: str = Column(Text, nullable=False)
    source: str = Column(String, nullable=True)
    indicator: str = Column(String, nullable=True)
    metric_key: str = Column(String, nullable=True)
    verdict: str = Column(String, nullable=False)  # SUPPORTED / CONTRADICTED / CHERRY_PICKED / UNSUBSTANTIATED
    explanation: str = Column(Text, nullable=True)
    claimed_value: Optional[str] = Column(String, nullable=True)
    actual_value: Optional[str] = Column(String, nullable=True)
    yoy_change_pct: Optional[float] = Column(Float, nullable=True)
    page_number: Optional[int] = Column(Integer, nullable=True)
    bbox: Optional[str] = Column(Text, nullable=True)  # JSON string
    web_verification_json: Optional[str] = Column(Text, nullable=True)  # JSON string of WebVerificationResult
    created_at: datetime = Column(
        DateTime, nullable=False, default=lambda: datetime.now(timezone.utc)
    )


class BenchmarkItem(Base):
    """An expert-labeled ground-truth item for benchmarking system accuracy."""

    __tablename__ = "benchmark_items"

    id: int = Column(Integer, primary_key=True)
    company_id: str = Column(String, nullable=False)
    claim_text: str = Column(Text, nullable=False)
    source: str = Column(String, nullable=True)
    indicator: str = Column(String, nullable=True)
    metric_key: str = Column(String, nullable=True)
    ground_truth: str = Column(String, nullable=False)  # verdict enum string
    explanation: str = Column(Text, nullable=True)


# ---------------------------------------------------------------------------
# Engine & session helpers
# ---------------------------------------------------------------------------

_engine = None
_SessionLocal = None


def get_engine():
    """Return the singleton SQLAlchemy engine."""
    global _engine
    if _engine is None:
        _engine = create_engine(
            settings.DATABASE_URL,
            connect_args={"check_same_thread": False} if "sqlite" in settings.DATABASE_URL else {},
            echo=False,
        )
    return _engine


def get_session_factory():
    """Return the singleton sessionmaker."""
    global _SessionLocal
    if _SessionLocal is None:
        _SessionLocal = sessionmaker(
            autocommit=False, autoflush=False, bind=get_engine()
        )
    return _SessionLocal


def get_session() -> Generator[Session, None, None]:
    """FastAPI dependency that yields a database session."""
    session_factory = get_session_factory()
    session = session_factory()
    try:
        yield session
    finally:
        session.close()


# ---------------------------------------------------------------------------
# Seed helpers
# ---------------------------------------------------------------------------

def _seed_data_path(filename: str) -> str:
    """Resolve an absolute path to a seed data file."""
    return os.path.join(os.path.dirname(__file__), "seed_data", filename)


def seed_database(session: Session) -> None:
    """Load seed JSON files into the database if tables are empty."""

    # --- Companies ---
    if session.query(Company).count() == 0:
        with open(_seed_data_path("companies.json"), "r", encoding="utf-8") as fh:
            companies = json.load(fh)
        for c in companies:
            session.add(Company(**c))
        session.commit()

    # --- BRSR Metrics ---
    if session.query(BrsrMetric).count() == 0:
        with open(_seed_data_path("sample_brsr_metrics.json"), "r", encoding="utf-8") as fh:
            metrics = json.load(fh)
        for m in metrics:
            bbox_val = m.pop("bbox", None)
            session.add(BrsrMetric(**m, bbox=json.dumps(bbox_val) if bbox_val is not None else None))
        session.commit()

    # --- Benchmark Ground Truth ---
    if session.query(BenchmarkItem).count() == 0:
        with open(_seed_data_path("benchmark_groundtruth.json"), "r", encoding="utf-8") as fh:
            items = json.load(fh)
        for item in items:
            session.add(BenchmarkItem(**item))
        session.commit()

    # --- Seed initial AuditClaim records from benchmark data ---
    if session.query(AuditClaim).count() == 0:
        with open(_seed_data_path("benchmark_groundtruth.json"), "r", encoding="utf-8") as fh:
            items = json.load(fh)
        for item in items:
            metric = (
                session.query(BrsrMetric)
                .filter(
                    BrsrMetric.company_id == item["company_id"],
                    BrsrMetric.indicator == item["indicator"],
                    BrsrMetric.metric_key == item["metric_key"],
                )
                .first()
            )
            page_number = metric.page_number if metric else None
            bbox = metric.bbox if metric else None

            session.add(
                AuditClaim(
                    company_id=item["company_id"],
                    claim_text=item["claim_text"],
                    source=item.get("source"),
                    indicator=item.get("indicator"),
                    metric_key=item.get("metric_key"),
                    verdict=item["ground_truth"],
                    explanation=item.get("explanation"),
                    claimed_value=None,
                    actual_value=None,
                    yoy_change_pct=None,
                    page_number=page_number,
                    bbox=bbox,
                )
            )
        session.commit()


def init_db() -> None:
    """Create all tables and seed initial data."""
    engine = get_engine()
    Base.metadata.create_all(bind=engine)
    session_factory = get_session_factory()
    session = session_factory()
    try:
        seed_database(session)
    finally:
        session.close()
