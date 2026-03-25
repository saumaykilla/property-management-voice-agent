from functools import lru_cache
from pathlib import Path

from pydantic import AliasChoices, Field, PostgresDsn
from pydantic_settings import BaseSettings, SettingsConfigDict

SERVICE_ROOT = Path(__file__).resolve().parents[2]
REPO_ROOT = Path(__file__).resolve().parents[4]
ENV_FILES = (
    SERVICE_ROOT / ".env.local",
    SERVICE_ROOT / ".env",
    REPO_ROOT / ".env.local",
    REPO_ROOT / ".env",
)


def _normalize_public_url(value: str | None) -> str | None:
    if not value:
        return None

    normalized = value.strip().rstrip("/")

    if not normalized:
        return None

    if normalized.startswith(("http://", "https://")):
        return normalized

    return f"https://{normalized}"


class Settings(BaseSettings):
    environment: str = Field(
        default="development",
        validation_alias=AliasChoices("ENVIRONMENT", "NODE_ENV", "VERCEL_ENV"),
    )
    supabase_direct_postgres_url: PostgresDsn
    supabase_url: str = Field(validation_alias="NEXT_PUBLIC_SUPABASE_URL")
    supabase_service_role_key: str
    vapi_api_key: str | None = None
    voice_api_base_url: str | None = Field(
        default=None,
        validation_alias=AliasChoices("VOICE_API_BASE_URL", "VAPI_WEBHOOK_BASE_URL"),
    )
    vapi_public_base_url: str | None = Field(
        default=None,
        validation_alias=AliasChoices("VAPI_PUBLIC_BASE_URL", "VAPI_WEBHOOK_BASE_URL"),
    )
    gemini_api_key: str | None = None
    vercel_env: str | None = Field(default=None, validation_alias="VERCEL_ENV")
    vercel_url: str | None = Field(default=None, validation_alias="VERCEL_URL")
    vercel_project_production_url: str | None = Field(
        default=None,
        validation_alias="VERCEL_PROJECT_PRODUCTION_URL",
    )

    model_config = SettingsConfigDict(
        env_file=ENV_FILES,
        env_file_encoding="utf-8",
        extra="ignore",
    )

    @property
    def public_base_url(self) -> str | None:
        for candidate in (self.vapi_public_base_url, self.voice_api_base_url):
            normalized = _normalize_public_url(candidate)
            if normalized:
                return normalized

        if self.vercel_env == "production":
            for candidate in (self.vercel_project_production_url, self.vercel_url):
                normalized = _normalize_public_url(candidate)
                if normalized:
                    return normalized

        for candidate in (self.vercel_url, self.vercel_project_production_url):
            normalized = _normalize_public_url(candidate)
            if normalized:
                return normalized

        return None


@lru_cache
def get_settings() -> Settings:
    return Settings()
