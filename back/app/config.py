from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    # Данные для подключения к БД
    DB_HOST: str
    DB_PORT: int
    DB_USER: str
    DB_PASS: str
    DB_NAME: str

    @property
    def DATABASE_URL_sync(self): 
        return f"postgresql://{self.DB_USER}:{self.DB_PASS}@{self.DB_HOST}:{self.DB_PORT}/{self.DB_NAME}"
    
    # Берём переменные из .env файла
    model_config = SettingsConfigDict(env_file=".env")

settings = Settings()