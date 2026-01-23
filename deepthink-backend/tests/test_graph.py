"""Tests for the LangGraph pipeline"""

import pytest
from unittest.mock import AsyncMock, MagicMock, patch

from deepthink.state import create_initial_state, AgentState
from deepthink.graph import should_continue


class TestShouldContinue:
    """Test the should_continue decision function"""
    
    def test_satisfied_returns_synthesize(self):
        state = create_initial_state("test query")
        state["satisfied"] = True
        
        result = should_continue(state)
        assert result == "synthesize"
    
    def test_max_rounds_reached_returns_synthesize(self):
        state = create_initial_state("test query", max_rounds=3)
        state["round"] = 3
        state["satisfied"] = False
        
        result = should_continue(state)
        assert result == "synthesize"
    
    def test_high_score_returns_synthesize(self):
        state = create_initial_state("test query")
        state["round"] = 1
        state["satisfied"] = False
        state["review_score"] = {
            "completeness": 0.9,
            "consistency": 0.9,
            "confidence": 0.9,
            "overall": 0.9,
        }
        
        result = should_continue(state)
        assert result == "synthesize"
    
    def test_low_score_returns_continue(self):
        state = create_initial_state("test query")
        state["round"] = 1
        state["satisfied"] = False
        state["review_score"] = {
            "completeness": 0.5,
            "consistency": 0.5,
            "confidence": 0.5,
            "overall": 0.5,
        }
        
        result = should_continue(state)
        assert result == "continue"


class TestCreateInitialState:
    """Test initial state creation"""
    
    def test_creates_valid_state(self):
        state = create_initial_state("test query", "some context")
        
        assert state["query"] == "test query"
        assert state["context"] == "some context"
        assert state["round"] == 0
        assert state["satisfied"] is False
        assert state["experts_output"] == []
        assert state["critic_feedback"] == []
    
    def test_default_max_rounds(self):
        state = create_initial_state("test")
        assert state["max_rounds"] == 5
    
    def test_custom_max_rounds(self):
        state = create_initial_state("test", max_rounds=10)
        assert state["max_rounds"] == 10


class TestStateTypes:
    """Test state type definitions"""
    
    def test_expert_output_structure(self):
        from deepthink.state import ExpertOutput
        
        expert = ExpertOutput(
            id="test-1",
            role="Test Expert",
            description="A test expert",
            temperature=0.7,
            prompt="Test prompt",
            variant="balanced",
            content="Test content",
            thoughts="Test thoughts",
            round=1,
            status="completed",
            start_time=None,
            end_time=None,
        )
        
        assert expert["role"] == "Test Expert"
        assert expert["status"] == "completed"
    
    def test_review_score_structure(self):
        from deepthink.state import ReviewScore
        
        score = ReviewScore(
            completeness=0.8,
            consistency=0.9,
            confidence=0.7,
            overall=0.8,
        )
        
        assert score["overall"] == 0.8
