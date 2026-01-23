"""Tests for the API server"""

import pytest
from fastapi.testclient import TestClient
from unittest.mock import AsyncMock, patch

from deepthink.api.server import app, extract_query_and_context
from deepthink.api.schemas import ChatMessage


client = TestClient(app)


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
        response = client.get("/v1/models")
        assert response.status_code == 200
        
        data = response.json()
        assert data["object"] == "list"
        assert len(data["data"]) >= 1
        
        model_ids = [m["id"] for m in data["data"]]
        assert "deepthink" in model_ids


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
