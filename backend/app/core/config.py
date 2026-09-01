from pydantic import computed_field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """
    Configuración global de la aplicación CASETECH ERP usando Pydantic Settings v2.
    Lee automáticamente las variables de entorno o el archivo .env.
    """
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore"
    )

    # Identificación y Entorno
    PROJECT_NAME: str = "CASETECH ERP"
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/api/v1"
    ENVIRONMENT: str = "development"
    DEBUG: bool = True

    # Seguridad y JWT
    SECRET_KEY: str = "SUPER_SECRET_KEY_CHANGE_IN_PRODUCTION_MIN_32_BYTES_12345"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 480  # 8 horas laborales

    # Base de Datos PostgreSQL
    POSTGRES_SERVER: str = "db"
    POSTGRES_PORT: int = 5432
    POSTGRES_USER: str = "casetech_user"
    POSTGRES_PASSWORD: str = "casetech_secure_pass_2026"
    POSTGRES_DB: str = "casetech_db"

    # Permite inyectar DATABASE_URL directamente si existe
    DATABASE_URL: str | None = None
    ASYNC_DATABASE_URL: str | None = None

    @computed_field  # type: ignore[misc]
    @property
    def SQLALCHEMY_DATABASE_URI(self) -> str:
        """
        Retorna la URL asíncrona para SQLAlchemy (asyncpg / psycopg).
        """
        if self.ASYNC_DATABASE_URL:
            return self.ASYNC_DATABASE_URL
        if self.DATABASE_URL:
            if self.DATABASE_URL.startswith("postgresql://"):
                return self.DATABASE_URL.replace("postgresql://", "postgresql+asyncpg://", 1)
            return self.DATABASE_URL
        return (
            f"postgresql+asyncpg://{self.POSTGRES_USER}:{self.POSTGRES_PASSWORD}"
            f"@{self.POSTGRES_SERVER}:{self.POSTGRES_PORT}/{self.POSTGRES_DB}"
        )

    @computed_field  # type: ignore[misc]
    @property
    def SQLALCHEMY_SYNC_DATABASE_URI(self) -> str:
        """
        Retorna la URL síncrona estándar con psycopg2 para Alembic o tareas de mantenimiento.
        """
        if self.DATABASE_URL and not self.DATABASE_URL.startswith("postgresql+asyncpg://"):
            return self.DATABASE_URL
        return (
            f"postgresql+psycopg2://{self.POSTGRES_USER}:{self.POSTGRES_PASSWORD}"
            f"@{self.POSTGRES_SERVER}:{self.POSTGRES_PORT}/{self.POSTGRES_DB}"
        )


settings = Settings()
