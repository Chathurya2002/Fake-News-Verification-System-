from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_env: str = "development"
    database_url: str = "sqlite:///fake_news.db"
    jwt_secret_key: str = "change-this-secret"
    jwt_expires_minutes: int = 60
    allowed_origins: str = "http://localhost:5173,http://localhost:3000"
    active_model_path: str = "app/ml/artifacts/tfidf_logreg_v1.json"
    max_news_text_length: int = 10000

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")

    @property
    def allowed_origins_list(self) -> list[str]:
        return [origin.strip() for origin in self.allowed_origins.split(",") if origin.strip()]


settings = Settings()
