"""Model Registry - Manages registered models for AI clients"""

import json
import os
import threading
import time
from datetime import datetime
from pathlib import Path
from typing import Literal, Optional

from pydantic import BaseModel, Field

DATA_DIR = Path(os.environ.get("DATA_DIR", "/app/data"))
REGISTRY_FILE = DATA_DIR / "model_registry.json"

_lock = threading.Lock()


class RegistryModel(BaseModel):
    id: str = Field(..., pattern=r"^[a-zA-Z0-9._:-]+$", min_length=1, max_length=64)
    display_name: str = Field(..., min_length=1, max_length=128)
    provider: Literal["openai", "google", "anthropic", "deepseek", "xai", "mistral", "custom"]
    upstream_model: str = Field(..., min_length=1, max_length=128)
    base_url: Optional[str] = None
    credential_ref: Optional[str] = None
    enabled: bool = True
    created_at: str = Field(default_factory=lambda: datetime.utcnow().isoformat() + "Z")
    updated_at: str = Field(default_factory=lambda: datetime.utcnow().isoformat() + "Z")


class ModelRegistry(BaseModel):
    version: int = 1
    updated_at: str = Field(default_factory=lambda: datetime.utcnow().isoformat() + "Z")
    models: list[RegistryModel] = Field(default_factory=list)


def _ensure_data_dir():
    DATA_DIR.mkdir(parents=True, exist_ok=True)


def load_registry() -> ModelRegistry:
    with _lock:
        if not REGISTRY_FILE.exists():
            return ModelRegistry()
        try:
            data = json.loads(REGISTRY_FILE.read_text(encoding="utf-8"))
            return ModelRegistry.model_validate(data)
        except Exception:
            return ModelRegistry()


def save_registry(registry: ModelRegistry):
    with _lock:
        _ensure_data_dir()
        registry.updated_at = datetime.utcnow().isoformat() + "Z"
        temp_file = REGISTRY_FILE.with_suffix(".tmp")
        temp_file.write_text(registry.model_dump_json(indent=2), encoding="utf-8")
        temp_file.replace(REGISTRY_FILE)


def list_public_models() -> list[RegistryModel]:
    registry = load_registry()
    return [m for m in registry.models if m.enabled]


def list_all_models() -> list[RegistryModel]:
    return load_registry().models


def get_model(model_id: str) -> Optional[RegistryModel]:
    registry = load_registry()
    for m in registry.models:
        if m.id == model_id:
            return m
    return None


def create_model(model: RegistryModel) -> RegistryModel:
    registry = load_registry()
    for m in registry.models:
        if m.id == model.id:
            raise ValueError(f"Model with id '{model.id}' already exists")
    now = datetime.utcnow().isoformat() + "Z"
    model.created_at = now
    model.updated_at = now
    registry.models.append(model)
    save_registry(registry)
    return model


def update_model(model_id: str, updates: dict) -> Optional[RegistryModel]:
    registry = load_registry()
    for i, m in enumerate(registry.models):
        if m.id == model_id:
            model_dict = m.model_dump()
            for k, v in updates.items():
                if k not in ("id", "created_at"):
                    model_dict[k] = v
            model_dict["updated_at"] = datetime.utcnow().isoformat() + "Z"
            updated = RegistryModel.model_validate(model_dict)
            registry.models[i] = updated
            save_registry(registry)
            return updated
    return None


def delete_model(model_id: str) -> bool:
    registry = load_registry()
    original_len = len(registry.models)
    registry.models = [m for m in registry.models if m.id != model_id]
    if len(registry.models) < original_len:
        save_registry(registry)
        return True
    return False


def resolve_model(model_id: str) -> Optional[dict]:
    model = get_model(model_id)
    if not model or not model.enabled:
        return None
    
    api_key = None
    if model.credential_ref:
        api_key = os.environ.get(model.credential_ref)
    
    return {
        "id": model.id,
        "provider": model.provider,
        "upstream_model": model.upstream_model,
        "base_url": model.base_url,
        "api_key": api_key,
    }
