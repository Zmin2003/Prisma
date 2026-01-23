"""Configuration management for DeepThink"""

import os
from enum import Enum
from functools import lru_cache
from typing import Literal

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class ThinkingLevel(str, Enum):
    MINIMAL = "minimal"
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"


class LLMProvider(str, Enum):
    GOOGLE = "google"
    OPENAI = "openai"
    ANTHROPIC = "anthropic"
    DEEPSEEK = "deepseek"


THINKING_BUDGETS = {
    ThinkingLevel.MINIMAL: 128,
    ThinkingLevel.LOW: 1024,
    ThinkingLevel.MEDIUM: 8192,
    ThinkingLevel.HIGH: 24576,
}


class Settings(BaseSettings):
    google_api_key: str = Field(default="", alias="GOOGLE_API_KEY")
    openai_api_key: str = Field(default="", alias="OPENAI_API_KEY")
    anthropic_api_key: str = Field(default="", alias="ANTHROPIC_API_KEY")
    deepseek_api_key: str = Field(default="", alias="DEEPSEEK_API_KEY")
    xai_api_key: str = Field(default="", alias="XAI_API_KEY")
    mistral_api_key: str = Field(default="", alias="MISTRAL_API_KEY")
    openai_base_url: str = Field(default="", alias="OPENAI_BASE_URL")
    
    admin_api_key: str = Field(default="", alias="ADMIN_API_KEY")
    app_api_key: str = Field(default="", alias="APP_API_KEY")
    
    default_provider: LLMProvider = Field(default=LLMProvider.GOOGLE, alias="DEFAULT_PROVIDER")
    default_model: str = Field(default="gemini-3-flash-preview", alias="DEFAULT_MODEL")
    
    planning_level: ThinkingLevel = ThinkingLevel.MEDIUM
    expert_level: ThinkingLevel = ThinkingLevel.MEDIUM
    synthesis_level: ThinkingLevel = ThinkingLevel.HIGH
    
    max_rounds: int = 5
    quality_threshold: float = 0.85
    
    enable_tools: bool = True
    enable_debate: bool = True
    
    database_url: str = Field(default="sqlite:///deepthink_sessions.db", alias="DATABASE_URL")
    
    api_host: str = Field(default="0.0.0.0", alias="API_HOST")
    api_port: int = Field(default=8080, alias="API_PORT")
    
    cors_allow_origins: str = Field(default="http://localhost:3000", alias="CORS_ALLOW_ORIGINS")
    
    base_url_allowlist: str = Field(
        default="https://api.openai.com,https://api.anthropic.com,https://api.deepseek.com,https://generativelanguage.googleapis.com,https://api.x.ai,https://api.mistral.ai",
        alias="BASE_URL_ALLOWLIST"
    )
    
    model_config = SettingsConfigDict(
        env_file=".env",
        extra="ignore",
    )


@lru_cache
def get_settings() -> Settings:
    return Settings()


def get_thinking_budget(level: ThinkingLevel) -> int:
    return THINKING_BUDGETS.get(level, 8192)
