from functools import lru_cache
from zoneinfo import ZoneInfo

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    database_url: str = "postgresql+asyncpg://coffee:coffee@localhost:5432/coffeemetrics"
    test_database_url: str = "postgresql+asyncpg://coffee:coffee@localhost:5432/coffeemetrics_test"
    app_timezone: str = "Asia/Almaty"
    cors_origins: list[str] = ["http://localhost:5173", "http://127.0.0.1:5173"]
    sql_echo: bool = False

    @property
    def tz(self) -> ZoneInfo:
        return ZoneInfo(self.app_timezone)


@lru_cache
def get_settings() -> Settings:
    return Settings()
