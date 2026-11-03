"""Application configuration using Pydantic Settings."""

from __future__ import annotations

import os
from enum import Enum
from typing import Optional

from pydantic_settings import BaseSettings


class EngineMode(str, Enum):
    """Available engine modes for claim verification."""

    LOCAL = "LOCAL"
    CLOUD = "CLOUD"
    HEURISTIC = "HEURISTIC"


class Settings(BaseSettings):
    """Global application settings loaded from environment variables."""

    OLLAMA_BASE_URL: str = "http://localhost:11434"
    OLLAMA_MODEL: str = "qwen3:8b"
    GEMINI_API_KEY: Optional[str] = None
    OLLAMA_TIMEOUT_MS: int = 1500
    DATABASE_URL: str = "sqlite:///./veritas_esg.db"
    ENGINE_MODE: EngineMode = EngineMode.HEURISTIC

    model_config = {
        "env_file": ".env",
        "env_file_encoding": "utf-8",
        "extra": "ignore",
    }


settings = Settings()
