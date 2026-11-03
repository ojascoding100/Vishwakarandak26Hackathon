"""VeritasESG FastAPI master application."""

from __future__ import annotations

import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.engine_factory import audit_engine
from app.database import init_db
from app.routers import audits, benchmark, companies

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("veritas_esg")


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application startup and shutdown lifecycle."""
    logger.info("Initializing SQLite database and seeding default BRSR datasets...")
    init_db()
    logger.info("Database initialized successfully.")

    logger.info("Probing and initializing audit engine...")
    mode = await audit_engine.initialize()
    logger.info("Audit engine active in mode: %s", mode.value)
    yield
    logger.info("Shutting down VeritasESG backend.")


app = FastAPI(
    title="VeritasESG® API",
    description="Autonomous Sustainability Claim & BRSR Audit Platform",
    version="1.0.0",
    lifespan=lifespan,
)

# Enable CORS for Next.js frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routers
app.include_router(companies.router)
app.include_router(audits.router)
app.include_router(benchmark.router)


@app.get("/")
async def root():
    """Root metadata endpoint."""
    return {
        "service": "VeritasESG® Forensic Audit Engine",
        "version": "1.0.0",
        "regulation": "SEBI BRSR Principle 6 (India)",
        "docs_url": "/docs",
    }


@app.get("/api/health")
async def health_check():
    """Health check endpoint including engine telemetry."""
    status = await audit_engine.get_status()
    return {
        "status": "healthy",
        "engine": status,
    }


@app.get("/api/engine-status")
async def get_engine_status():
    """Current engine mode and status for the UI pill badge."""
    return await audit_engine.get_status()
