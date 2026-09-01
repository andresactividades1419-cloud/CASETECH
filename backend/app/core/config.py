"""
core/config.py — Configuración global de CASETECH ERP (Pydantic Settings v2).

Principios de seguridad aplicados (Issue #48):
- Las credenciales sensibles (JWT_SECRET, POSTGRES_PASSWORD, ADMIN_INITIAL_PASSWORD)
  se declaran como ``SecretStr`` SIN valor por defecto: la aplicación falla en
  startup (ValidationError) si no están presentes en el entorno → fail-fast seguro.
- ``SecretStr`` impide que los valores aparezcan en ``repr()``, ``str()`` o logs.
- ``DEBUG`` se deriva de ``ENVIRONMENT`` para evitar exponer OpenAPI en producción.
- ``CORS_ORIGINS`` define explícitamente los orígenes permitidos (sin wildcard).
"""

from typing import Optional

from pydantic import SecretStr, computed_field
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
    # Opciones válidas: "development" | "staging" | "production"
    ENVIRONMENT: str = "development"

    @computed_field  # type: ignore[misc]
    @property
    def DEBUG(self) -> bool:
        """
        DEBUG es True en cualquier entorno excepto production.
        Derivado de ENVIRONMENT para evitar exponer docs/OpenAPI en producción.
        """
        return self.ENVIRONMENT != "production"

    # --------------------------------------------------------------------------
    # Seguridad y JWT
    # Alineados con las claves del .env / .env.example (JWT_SECRET, JWT_ALGORITHM).
    # SecretStr sin default → ValidationError en startup si no están en .env.
    # --------------------------------------------------------------------------
    JWT_SECRET: SecretStr  # Sin default: fail-fast si no está definida
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 480  # 8 horas laborales

    # --------------------------------------------------------------------------
    # Base de Datos PostgreSQL
    # POSTGRES_PASSWORD: SecretStr sin default → fail-fast si falta.
    # --------------------------------------------------------------------------
    POSTGRES_SERVER: str = "db"
    POSTGRES_PORT: int = 5432
    POSTGRES_USER: str = "casetech_user"
    POSTGRES_PASSWORD: SecretStr  # Sin default: fail-fast si no está definida
    POSTGRES_DB: str = "casetech_db"

    # Permite inyectar DATABASE_URL directamente si existe
    DATABASE_URL: str | None = None
    ASYNC_DATABASE_URL: str | None = None

    @field_validator("JWT_SECRET")
    @classmethod
    def validate_jwt_secret(cls, v: str) -> str:
        """Valida que JWT_SECRET tenga al menos 32 bytes y no sea una clave por defecto insegura."""
        if not v or len(v.encode("utf-8")) < 32:
            raise ValueError(
                "JWT_SECRET debe tener una longitud mínima de 32 bytes (256 bits) para garantizar seguridad criptográfica."
            )
        if v.strip() in INSECURE_SECRET_KEYS:
            raise ValueError(
                "JWT_SECRET no puede ser una clave predeterminada o insegura conocida."
            )
        return v

    @field_validator("CORS_ORIGINS", mode="before")
    @classmethod
    def parse_cors_origins(cls, v: Any) -> list[str]:
        """Permite recibir CORS_ORIGINS como lista o como string separado por comas."""
        if isinstance(v, str):
            return [origin.strip() for origin in v.split(",") if origin.strip()]
        if isinstance(v, list):
            return v
        return ["http://localhost:3000", "http://127.0.0.1:3000"]

    @model_validator(mode="after")
    def validate_environment_and_debug(self) -> "Settings":
        """Fuerza DEBUG = False en producción y valida contraseñas requeridas."""
        if self.ENVIRONMENT == "production":
            self.DEBUG = False
            if not self.POSTGRES_PASSWORD:
                raise ValueError("POSTGRES_PASSWORD es obligatoria en entorno de producción.")
        return self

    # Aliases para compatibilidad con código existente
    @property
    def SECRET_KEY(self) -> str:
        return self.JWT_SECRET

    @property
    def ALGORITHM(self) -> str:
        return self.JWT_ALGORITHM

    # --------------------------------------------------------------------------
    # Siembra inicial (seeding) — Issue #48
    # Las contraseñas iniciales se leen del entorno, nunca de literales.
    # ADMIN_INITIAL_PASSWORD: SecretStr sin default → fail-fast si falta.
    # OPERARIO_INITIAL_PASSWORD: SecretStr sin default → fail-fast si falta.
    # --------------------------------------------------------------------------
    ADMIN_INITIAL_PASSWORD: SecretStr   # Sin default: fail-fast si no está definida
    OPERARIO_INITIAL_PASSWORD: SecretStr  # Sin default: fail-fast si no está definida

    # --------------------------------------------------------------------------
    # CORS — Issue #48
    # Lista explícita de orígenes permitidos. NUNCA usar ["*"] con credentials.
    # --------------------------------------------------------------------------
    CORS_ORIGINS: list[str] = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ]

    # --------------------------------------------------------------------------
    # Computed fields: URLs de base de datos
    # --------------------------------------------------------------------------

    @computed_field  # type: ignore[misc]
    @property
    def SQLALCHEMY_DATABASE_URI(self) -> str:
        """
        Retorna la URL asíncrona para SQLAlchemy (asyncpg).
        """
        if self.ASYNC_DATABASE_URL:
            return self.ASYNC_DATABASE_URL
        if self.DATABASE_URL:
            if self.DATABASE_URL.startswith("postgresql://"):
                return self.DATABASE_URL.replace("postgresql://", "postgresql+asyncpg://", 1)
            return self.DATABASE_URL
        return (
            f"postgresql+asyncpg://{self.POSTGRES_USER}:"
            f"{self.POSTGRES_PASSWORD.get_secret_value()}"
            f"@{self.POSTGRES_SERVER}:{self.POSTGRES_PORT}/{self.POSTGRES_DB}"
        )

    @computed_field  # type: ignore[misc]
    @property
    def SQLALCHEMY_SYNC_DATABASE_URI(self) -> str:
        """
        Retorna la URL síncrona con psycopg2 para Alembic o tareas de mantenimiento.
        """
        if self.DATABASE_URL and not self.DATABASE_URL.startswith("postgresql+asyncpg://"):
            return self.DATABASE_URL
        return (
            f"postgresql+psycopg2://{self.POSTGRES_USER}:"
            f"{self.POSTGRES_PASSWORD.get_secret_value()}"
            f"@{self.POSTGRES_SERVER}:{self.POSTGRES_PORT}/{self.POSTGRES_DB}"
        )


settings = Settings()

