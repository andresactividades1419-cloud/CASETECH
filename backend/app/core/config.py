"""
core/config.py — Configuración global de CASETECH ERP (Pydantic Settings v2).

Principios de seguridad aplicados:
- SecretStr / validación de JWT_SECRET (mínimo 32 bytes y rechazo de claves inseguras).
- Derivación automática de DEBUG según ENVIRONMENT.
- Parsing estricto de CORS_ORIGINS.
- Soporte para variables PostgreSQL y SQLite en pruebas.
"""

from typing import Any

from pydantic import SecretStr, computed_field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

INSECURE_SECRET_KEYS = {
    "super-secret-change-in-production",
    "SUPER_SECRET_KEY_CHANGE_IN_PRODUCTION_MIN_32_BYTES_12345",
    "changeme",
    "secret",
    "password",
    "12345678901234567890123456789012",
}


class Settings(BaseSettings):
    """
    Configuración global de la aplicación CASETECH ERP usando Pydantic Settings v2.
    Lee automáticamente las variables de entorno o el archivo .env.
    """

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore",
    )

    # --------------------------------------------------------------------------
    # Identificación y Entorno
    # --------------------------------------------------------------------------
    PROJECT_NAME: str = "CASETECH ERP"
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/api/v1"
    ENVIRONMENT: str = "development"

    # --------------------------------------------------------------------------
    # Seguridad y JWT
    # --------------------------------------------------------------------------
    JWT_SECRET: SecretStr = SecretStr(
        "super-secret-casetech-erp-jwt-token-key-minimum-32-bytes-long"
    )
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30

    @field_validator("JWT_SECRET")
    @classmethod
    def validate_jwt_secret(cls, v: SecretStr | str) -> SecretStr:
        """Valida que JWT_SECRET tenga al menos 32 bytes y no sea una clave por defecto insegura."""
        val = v.get_secret_value() if isinstance(v, SecretStr) else v
        if not val or len(val.encode("utf-8")) < 32:
            raise ValueError(
                "JWT_SECRET debe tener una longitud mínima de 32 bytes (256 bits) para garantizar seguridad criptográfica."
            )
        if val.strip() in INSECURE_SECRET_KEYS:
            raise ValueError(
                "JWT_SECRET no puede ser una clave predeterminada o insegura conocida."
            )
        return SecretStr(val) if isinstance(v, str) else v

    # --------------------------------------------------------------------------
    # Base de Datos PostgreSQL
    # --------------------------------------------------------------------------
    POSTGRES_SERVER: str = "localhost"
    POSTGRES_PORT: int = 5432
    POSTGRES_USER: str = "casetech"
    POSTGRES_PASSWORD: SecretStr = SecretStr("testpassword123")
    POSTGRES_DB: str = "casetech_db"

    DATABASE_URL: str | None = None
    ASYNC_DATABASE_URL: str | None = None

    # --------------------------------------------------------------------------
    # Siembra inicial (seeding)
    # --------------------------------------------------------------------------
    ADMIN_INITIAL_PASSWORD: SecretStr = SecretStr("Admin1234")
    OPERARIO_INITIAL_PASSWORD: SecretStr = SecretStr("Operario1234")

    # --------------------------------------------------------------------------
    # CORS
    # --------------------------------------------------------------------------
    CORS_ORIGINS: list[str] = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ]

    @field_validator("CORS_ORIGINS", mode="before")
    @classmethod
    def parse_cors_origins(cls, v: Any) -> list[str]:
        """Permite recibir CORS_ORIGINS como lista o como string separado por comas."""
        if isinstance(v, str):
            return [origin.strip() for origin in v.split(",") if origin.strip()]
        if isinstance(v, list):
            return v
        return [
            "http://localhost:3000",
            "http://127.0.0.1:3000",
            "http://localhost:5173",
            "http://127.0.0.1:5173",
        ]

    @computed_field  # type: ignore[misc]
    @property
    def DEBUG(self) -> bool:
        """DEBUG es True en desarrollo/test, False en producción."""
        return self.ENVIRONMENT != "production"

    @computed_field  # type: ignore[misc]
    @property
    def SQLALCHEMY_DATABASE_URI(self) -> str:
        """Retorna la URL asíncrona para SQLAlchemy (asyncpg)."""
        if self.ASYNC_DATABASE_URL:
            return self.ASYNC_DATABASE_URL
        if self.DATABASE_URL:
            if self.DATABASE_URL.startswith("postgresql://"):
                return self.DATABASE_URL.replace(
                    "postgresql://", "postgresql+asyncpg://", 1
                )
            return self.DATABASE_URL
        return (
            f"postgresql+asyncpg://{self.POSTGRES_USER}:"
            f"{self.POSTGRES_PASSWORD.get_secret_value()}"
            f"@{self.POSTGRES_SERVER}:{self.POSTGRES_PORT}/{self.POSTGRES_DB}"
        )

    @computed_field  # type: ignore[misc]
    @property
    def SQLALCHEMY_SYNC_DATABASE_URI(self) -> str:
        """Retorna la URL síncrona con psycopg2 para Alembic."""
        if self.DATABASE_URL and not self.DATABASE_URL.startswith(
            "postgresql+asyncpg://"
        ):
            return self.DATABASE_URL
        return (
            f"postgresql+psycopg2://{self.POSTGRES_USER}:"
            f"{self.POSTGRES_PASSWORD.get_secret_value()}"
            f"@{self.POSTGRES_SERVER}:{self.POSTGRES_PORT}/{self.POSTGRES_DB}"
        )


settings = Settings()
