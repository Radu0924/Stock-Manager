from pydantic import model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_prefix="STOCK_")

    DoS_target: int = 15
    safety_factor: float = 0.20
    lambda_decay: float = 0.05
    stockout_threshold: int = 5
    z_slow_threshold: float = -0.5
    z_fast_threshold: float = 0.5
    w1: float = 0.50
    w2: float = 0.30
    w3: float = 0.20
    min_roi: float = 1.5
    auto_threshold: int = 20

    @model_validator(mode="after")
    def _weights_must_sum_to_one(self) -> "Settings":
        total = self.w1 + self.w2 + self.w3
        if abs(total - 1.0) > 1e-6:
            raise ValueError(
                f"Scoring weights w1+w2+w3 must sum to 1.0, got {total}"
            )
        return self


CONFIG = Settings()
