"""Credentials Store - Securely manages encrypted API credentials"""

import base64
import hashlib
import json
import secrets
import threading
from datetime import datetime
from pathlib import Path
from typing import Optional

from cryptography.fernet import Fernet, InvalidToken
from pydantic import BaseModel, Field

from .config import get_settings

DATA_DIR = Path(__import__("os").environ.get("DATA_DIR", "/app/data"))
CREDENTIALS_FILE = DATA_DIR / "credentials.json"

_lock = threading.Lock()


class Credential(BaseModel):
    id: str = Field(..., pattern=r"^cred_[a-zA-Z0-9_-]+$")
    provider: str
    name: str = Field(..., min_length=1, max_length=128)
    encrypted_api_key: str
    key_fingerprint: str
    created_at: str = Field(default_factory=lambda: datetime.utcnow().isoformat() + "Z")
    updated_at: str = Field(default_factory=lambda: datetime.utcnow().isoformat() + "Z")
    disabled: bool = False
    last_used_at: Optional[str] = None


class CredentialsStore(BaseModel):
    version: int = 1
    updated_at: str = Field(default_factory=lambda: datetime.utcnow().isoformat() + "Z")
    credentials: list[Credential] = Field(default_factory=list)


def _ensure_data_dir():
    DATA_DIR.mkdir(parents=True, exist_ok=True)


def _get_fernet() -> Fernet:
    settings = get_settings()
    if not settings.credentials_enc_key:
        raise ValueError("CREDENTIALS_ENC_KEY not configured")
    
    key = settings.credentials_enc_key.encode()
    if len(key) == 44:
        return Fernet(key)
    
    derived = hashlib.sha256(key).digest()
    fernet_key = base64.urlsafe_b64encode(derived)
    return Fernet(fernet_key)


def _generate_credential_id() -> str:
    return f"cred_{secrets.token_urlsafe(16)}"


def _generate_fingerprint(api_key: str) -> str:
    if len(api_key) >= 4:
        return f"last4:{api_key[-4:]}"
    return f"last{len(api_key)}:{api_key}"


def _encrypt_key(api_key: str) -> str:
    fernet = _get_fernet()
    encrypted = fernet.encrypt(api_key.encode("utf-8"))
    return base64.b64encode(encrypted).decode("utf-8")


def _decrypt_key(encrypted_api_key: str) -> str:
    fernet = _get_fernet()
    encrypted = base64.b64decode(encrypted_api_key.encode("utf-8"))
    decrypted = fernet.decrypt(encrypted)
    return decrypted.decode("utf-8")


def load_credentials() -> CredentialsStore:
    with _lock:
        if not CREDENTIALS_FILE.exists():
            return CredentialsStore()
        try:
            data = json.loads(CREDENTIALS_FILE.read_text(encoding="utf-8"))
            return CredentialsStore.model_validate(data)
        except Exception:
            return CredentialsStore()


def save_credentials(store: CredentialsStore):
    with _lock:
        _ensure_data_dir()
        store.updated_at = datetime.utcnow().isoformat() + "Z"
        temp_file = CREDENTIALS_FILE.with_suffix(".tmp")
        temp_file.write_text(store.model_dump_json(indent=2), encoding="utf-8")
        temp_file.replace(CREDENTIALS_FILE)


def list_credentials(masked: bool = True) -> list[dict]:
    store = load_credentials()
    result = []
    for cred in store.credentials:
        item = {
            "id": cred.id,
            "provider": cred.provider,
            "name": cred.name,
            "masked": cred.key_fingerprint if masked else None,
            "disabled": cred.disabled,
            "created_at": cred.created_at,
            "updated_at": cred.updated_at,
        }
        result.append(item)
    return result


def get_credential(credential_id: str) -> Optional[Credential]:
    store = load_credentials()
    for cred in store.credentials:
        if cred.id == credential_id:
            return cred
    return None


def create_credential(provider: str, name: str, api_key: str) -> str:
    store = load_credentials()
    
    cred_id = _generate_credential_id()
    fingerprint = _generate_fingerprint(api_key)
    encrypted = _encrypt_key(api_key)
    
    now = datetime.utcnow().isoformat() + "Z"
    credential = Credential(
        id=cred_id,
        provider=provider,
        name=name,
        encrypted_api_key=encrypted,
        key_fingerprint=fingerprint,
        created_at=now,
        updated_at=now,
    )
    
    store.credentials.append(credential)
    save_credentials(store)
    
    return cred_id


def update_credential(
    credential_id: str,
    name: Optional[str] = None,
    api_key: Optional[str] = None,
    disabled: Optional[bool] = None,
) -> bool:
    store = load_credentials()
    
    for i, cred in enumerate(store.credentials):
        if cred.id == credential_id:
            cred_dict = cred.model_dump()
            
            if name is not None:
                cred_dict["name"] = name
            
            if api_key is not None:
                cred_dict["encrypted_api_key"] = _encrypt_key(api_key)
                cred_dict["key_fingerprint"] = _generate_fingerprint(api_key)
            
            if disabled is not None:
                cred_dict["disabled"] = disabled
            
            cred_dict["updated_at"] = datetime.utcnow().isoformat() + "Z"
            store.credentials[i] = Credential.model_validate(cred_dict)
            save_credentials(store)
            return True
    
    return False


def delete_credential(credential_id: str, soft: bool = True) -> bool:
    store = load_credentials()
    
    if soft:
        return update_credential(credential_id, disabled=True)
    
    original_len = len(store.credentials)
    store.credentials = [c for c in store.credentials if c.id != credential_id]
    
    if len(store.credentials) < original_len:
        save_credentials(store)
        return True
    return False


def decrypt_api_key(credential_id: str) -> Optional[str]:
    cred = get_credential(credential_id)
    if not cred or cred.disabled:
        return None
    
    try:
        api_key = _decrypt_key(cred.encrypted_api_key)
        
        store = load_credentials()
        for i, c in enumerate(store.credentials):
            if c.id == credential_id:
                c_dict = c.model_dump()
                c_dict["last_used_at"] = datetime.utcnow().isoformat() + "Z"
                store.credentials[i] = Credential.model_validate(c_dict)
                save_credentials(store)
                break
        
        return api_key
    except InvalidToken:
        return None


def is_encryption_configured() -> bool:
    settings = get_settings()
    return bool(settings.credentials_enc_key)
