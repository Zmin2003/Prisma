"""Tests for the API server"""

import importlib

import pytest
from fastapi.testclient import TestClient
from unittest.mock import AsyncMock, patch

from deepthink.api.server import app, extract_query_and_context
from deepthink.api.schemas import ChatMessage
from deepthink.config import get_settings


client = TestClient(app)


def maybe_auth_headers():
    settings = get_settings()
    if settings.app_api_key:
        return {"Authorization": f"Bearer {settings.app_api_key}"}
    return {}


class TestHealthCheck:
    """Test health check endpoint"""
    
    def test_health_returns_ok(self):
        response = client.get("/health")
        assert response.status_code == 200
        
        data = response.json()
        assert data["status"] == "healthy"
        assert data["version"] == "2.0.0"
        assert "deepthink" in data["models"]


class TestListModels:
    """Test models listing endpoint"""
    
    def test_list_models(self):
        response = client.get("/v1/models", headers=maybe_auth_headers())
        assert response.status_code == 200
        
        data = response.json()
        assert data["object"] == "list"
        assert len(data["data"]) >= 1
        
        model_ids = [m["id"] for m in data["data"]]
        assert "deepthink" in model_ids


class TestAppApiKeyAuth:
    def test_requires_app_key_for_models(self, monkeypatch):
        monkeypatch.setenv("APP_API_KEY", "test-app-key")
        get_settings.cache_clear()

        import deepthink.api.server as server

        importlib.reload(server)
        authed_client = TestClient(server.app)

        assert authed_client.get("/v1/models").status_code == 401
        assert authed_client.get(
            "/v1/models", headers={"Authorization": "Bearer test-app-key"}
        ).status_code == 200

    def test_requires_app_key_for_chat_completions(self, monkeypatch):
        monkeypatch.setenv("APP_API_KEY", "test-app-key")
        get_settings.cache_clear()

        import deepthink.api.server as server

        importlib.reload(server)
        authed_client = TestClient(server.app)

        assert (
            authed_client.post(
                "/v1/chat/completions",
                json={
                    "model": "deepthink",
                    "messages": [],
                },
            ).status_code
            == 401
        )

        assert (
            authed_client.post(
                "/v1/chat/completions",
                headers={"Authorization": "Bearer test-app-key"},
                json={
                    "model": "deepthink",
                    "messages": [],
                },
            ).status_code
            == 400
        )


class TestExtractQueryAndContext:
    """Test query and context extraction"""
    
    def test_single_user_message(self):
        messages = [
            ChatMessage(role="user", content="Hello world"),
        ]
        
        query, context = extract_query_and_context(messages)
        
        assert query == "Hello world"
        assert context == ""
    
    def test_conversation_with_context(self):
        messages = [
            ChatMessage(role="user", content="First message"),
            ChatMessage(role="assistant", content="Response"),
            ChatMessage(role="user", content="Second message"),
        ]
        
        query, context = extract_query_and_context(messages)
        
        assert query == "Second message"
        assert "First message" in context
        assert "Response" in context
    
    def test_system_message_in_context(self):
        messages = [
            ChatMessage(role="system", content="You are helpful"),
            ChatMessage(role="user", content="Hello"),
        ]
        
        query, context = extract_query_and_context(messages)
        
        assert query == "Hello"
        assert "You are helpful" in context


class TestChatCompletions:
    """Test chat completions endpoint"""
    
    def test_missing_user_message(self):
        response = client.post(
            "/v1/chat/completions",
            headers=maybe_auth_headers(),
            json={
                "model": "deepthink",
                "messages": [],
            }
        )
        
        assert response.status_code == 400
    
    @patch("deepthink.api.server.run_deep_think")
    async def test_non_streaming_completion(self, mock_run):
        mock_run.return_value = {
            "final_output": "Test response",
            "round": 1,
        }
        
        response = client.post(
            "/v1/chat/completions",
            headers=maybe_auth_headers(),
            json={
                "model": "deepthink",
                "messages": [{"role": "user", "content": "Hello"}],
                "stream": False,
            }
        )
        
        assert response.status_code == 200


class TestSchemas:
    """Test OpenAI-compatible schemas"""
    
    def test_chat_message_validation(self):
        msg = ChatMessage(role="user", content="test")
        assert msg.role == "user"
        assert msg.content == "test"
    
    def test_invalid_role_fails(self):
        with pytest.raises(Exception):
            ChatMessage(role="invalid", content="test")


class TestCredentialsApi:
    """Test credentials management endpoints"""

    def test_list_credentials_requires_admin_key(self, monkeypatch):
        monkeypatch.setenv("ADMIN_API_KEY", "admin-key")
        get_settings.cache_clear()

        import deepthink.api.server as server
        importlib.reload(server)
        test_client = TestClient(server.app)

        assert test_client.get("/admin/credentials").status_code == 401
        assert test_client.get(
            "/admin/credentials", headers={"X-Admin-Key": "admin-key"}
        ).status_code == 200

    def test_create_credential_requires_enc_key(self, monkeypatch, tmp_path):
        monkeypatch.setenv("ADMIN_API_KEY", "admin-key")
        monkeypatch.setenv("DATA_DIR", str(tmp_path))
        monkeypatch.delenv("CREDENTIALS_ENC_KEY", raising=False)
        get_settings.cache_clear()

        import deepthink.api.server as server
        importlib.reload(server)
        test_client = TestClient(server.app)

        resp = test_client.post(
            "/admin/credentials",
            headers={"X-Admin-Key": "admin-key"},
            json={"provider": "openai", "name": "test", "api_key": "sk-test"},
        )
        assert resp.status_code == 500
        assert "CREDENTIALS_ENC_KEY" in resp.json()["detail"]

    def test_create_and_list_credentials(self, monkeypatch, tmp_path):
        monkeypatch.setenv("ADMIN_API_KEY", "admin-key")
        monkeypatch.setenv("CREDENTIALS_ENC_KEY", "test-encryption-key-32chars!")
        monkeypatch.setenv("DATA_DIR", str(tmp_path))
        get_settings.cache_clear()

        import deepthink.credentials_store as creds_store
        creds_store.DATA_DIR = tmp_path
        creds_store.CREDENTIALS_FILE = tmp_path / "credentials.json"

        import deepthink.api.server as server
        importlib.reload(server)
        test_client = TestClient(server.app)

        resp = test_client.post(
            "/admin/credentials",
            headers={"X-Admin-Key": "admin-key"},
            json={"provider": "openai", "name": "OpenAI Prod", "api_key": "sk-test1234"},
        )
        assert resp.status_code == 200
        cred_id = resp.json()["id"]
        assert cred_id.startswith("cred_")

        resp = test_client.get(
            "/admin/credentials",
            headers={"X-Admin-Key": "admin-key"},
        )
        assert resp.status_code == 200
        creds = resp.json()["credentials"]
        assert len(creds) == 1
        assert creds[0]["id"] == cred_id
        assert creds[0]["masked"] == "last4:1234"
        assert "api_key" not in creds[0]

    def test_update_credential(self, monkeypatch, tmp_path):
        monkeypatch.setenv("ADMIN_API_KEY", "admin-key")
        monkeypatch.setenv("CREDENTIALS_ENC_KEY", "test-encryption-key-32chars!")
        monkeypatch.setenv("DATA_DIR", str(tmp_path))
        get_settings.cache_clear()

        import deepthink.credentials_store as creds_store
        creds_store.DATA_DIR = tmp_path
        creds_store.CREDENTIALS_FILE = tmp_path / "credentials.json"

        import deepthink.api.server as server
        importlib.reload(server)
        test_client = TestClient(server.app)

        resp = test_client.post(
            "/admin/credentials",
            headers={"X-Admin-Key": "admin-key"},
            json={"provider": "openai", "name": "Test", "api_key": "sk-original"},
        )
        cred_id = resp.json()["id"]

        resp = test_client.put(
            f"/admin/credentials/{cred_id}",
            headers={"X-Admin-Key": "admin-key"},
            json={"name": "Updated Name", "disabled": True},
        )
        assert resp.status_code == 200
        assert resp.json()["updated"] is True

    def test_delete_credential_soft(self, monkeypatch, tmp_path):
        monkeypatch.setenv("ADMIN_API_KEY", "admin-key")
        monkeypatch.setenv("CREDENTIALS_ENC_KEY", "test-encryption-key-32chars!")
        monkeypatch.setenv("DATA_DIR", str(tmp_path))
        get_settings.cache_clear()

        import deepthink.credentials_store as creds_store
        creds_store.DATA_DIR = tmp_path
        creds_store.CREDENTIALS_FILE = tmp_path / "credentials.json"

        import deepthink.api.server as server
        importlib.reload(server)
        test_client = TestClient(server.app)

        resp = test_client.post(
            "/admin/credentials",
            headers={"X-Admin-Key": "admin-key"},
            json={"provider": "openai", "name": "ToDelete", "api_key": "sk-delete"},
        )
        cred_id = resp.json()["id"]

        resp = test_client.delete(
            f"/admin/credentials/{cred_id}",
            headers={"X-Admin-Key": "admin-key"},
        )
        assert resp.status_code == 200
        assert resp.json()["deleted"] is True
        assert resp.json()["hard"] is False

        resp = test_client.get(
            "/admin/credentials",
            headers={"X-Admin-Key": "admin-key"},
        )
        creds = resp.json()["credentials"]
        assert any(c["id"] == cred_id and c["disabled"] for c in creds)


class TestModelWithCredentialId:
    """Test model creation with credential_id"""

    def test_create_model_with_credential_id(self, monkeypatch, tmp_path):
        monkeypatch.setenv("ADMIN_API_KEY", "admin-key")
        monkeypatch.setenv("CREDENTIALS_ENC_KEY", "test-encryption-key-32chars!")
        monkeypatch.setenv("DATA_DIR", str(tmp_path))
        get_settings.cache_clear()

        import deepthink.credentials_store as creds_store
        creds_store.DATA_DIR = tmp_path
        creds_store.CREDENTIALS_FILE = tmp_path / "credentials.json"

        import deepthink.model_registry as registry
        registry.DATA_DIR = tmp_path
        registry.REGISTRY_FILE = tmp_path / "model_registry.json"

        import deepthink.api.server as server
        importlib.reload(server)
        test_client = TestClient(server.app)

        cred_resp = test_client.post(
            "/admin/credentials",
            headers={"X-Admin-Key": "admin-key"},
            json={"provider": "openai", "name": "OpenAI", "api_key": "sk-test"},
        )
        cred_id = cred_resp.json()["id"]

        model_resp = test_client.post(
            "/admin/models",
            headers={"X-Admin-Key": "admin-key"},
            json={
                "id": "dt-gpt-4o",
                "display_name": "GPT-4o via DeepThink",
                "provider": "openai",
                "upstream_model": "gpt-4o",
                "credential_id": cred_id,
            },
        )
        assert model_resp.status_code == 200
        assert model_resp.json()["credential_id"] == cred_id

    def test_cannot_use_both_credential_id_and_ref(self, monkeypatch, tmp_path):
        monkeypatch.setenv("ADMIN_API_KEY", "admin-key")
        monkeypatch.setenv("CREDENTIALS_ENC_KEY", "test-encryption-key-32chars!")
        monkeypatch.setenv("DATA_DIR", str(tmp_path))
        get_settings.cache_clear()

        import deepthink.credentials_store as creds_store
        creds_store.DATA_DIR = tmp_path
        creds_store.CREDENTIALS_FILE = tmp_path / "credentials.json"

        import deepthink.model_registry as registry
        registry.DATA_DIR = tmp_path
        registry.REGISTRY_FILE = tmp_path / "model_registry.json"

        import deepthink.api.server as server
        importlib.reload(server)
        test_client = TestClient(server.app)

        cred_resp = test_client.post(
            "/admin/credentials",
            headers={"X-Admin-Key": "admin-key"},
            json={"provider": "openai", "name": "OpenAI", "api_key": "sk-test"},
        )
        cred_id = cred_resp.json()["id"]

        model_resp = test_client.post(
            "/admin/models",
            headers={"X-Admin-Key": "admin-key"},
            json={
                "id": "dt-conflict",
                "display_name": "Conflict Model",
                "provider": "openai",
                "upstream_model": "gpt-4o",
                "credential_id": cred_id,
                "credential_ref": "OPENAI_API_KEY",
            },
        )
        assert model_resp.status_code == 400
        assert "both" in model_resp.json()["detail"].lower()
