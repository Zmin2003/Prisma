"""LLM initialization and management"""

import os
from functools import lru_cache
from typing import Optional

from langchain_core.language_models import BaseChatModel

from .config import LLMProvider, get_settings


def create_llm(
    provider: Optional[LLMProvider] = None,
    model: Optional[str] = None,
    api_key: Optional[str] = None,
    base_url: Optional[str] = None,
    temperature: float = 0.7,
) -> BaseChatModel:
    """Create an LLM instance based on provider"""
    
    settings = get_settings()
    provider = provider or settings.default_provider
    model = model or settings.default_model
    
    if provider == LLMProvider.GOOGLE:
        from langchain_google_genai import ChatGoogleGenerativeAI
        
        return ChatGoogleGenerativeAI(
            model=model,
            google_api_key=api_key or settings.google_api_key,
            temperature=temperature,
            convert_system_message_to_human=True,
        )
    
    elif provider == LLMProvider.OPENAI:
        actual_base_url = base_url or settings.openai_base_url or None
        actual_api_key = api_key or settings.openai_api_key
        
        if actual_base_url:
            from .custom_llm import CustomChatOpenAI
            return CustomChatOpenAI(
                model=model,
                api_key=actual_api_key,
                base_url=actual_base_url,
                temperature=temperature,
                timeout=60.0,
            )
        else:
            from langchain_openai import ChatOpenAI
            return ChatOpenAI(
                model=model,
                api_key=actual_api_key,
                temperature=temperature,
                max_retries=2,
                timeout=60,
            )
    
    elif provider == LLMProvider.ANTHROPIC:
        from langchain_anthropic import ChatAnthropic
        
        return ChatAnthropic(
            model=model or "claude-3-5-sonnet-20241022",
            api_key=api_key or settings.anthropic_api_key,
            temperature=temperature,
        )
    
    elif provider == LLMProvider.DEEPSEEK:
        from langchain_openai import ChatOpenAI
        
        return ChatOpenAI(
            model=model or "deepseek-chat",
            api_key=api_key or os.getenv("DEEPSEEK_API_KEY", ""),
            base_url=base_url or "https://api.deepseek.com/v1",
            temperature=temperature,
        )
    
    else:
        from langchain_openai import ChatOpenAI
        
        if not base_url:
            raise ValueError(f"Custom provider requires base_url")
        
        return ChatOpenAI(
            model=model,
            api_key=api_key or "not-needed",
            base_url=base_url,
            temperature=temperature,
        )


@lru_cache(maxsize=4)
def get_default_llm() -> BaseChatModel:
    """Get the default LLM instance (cached)"""
    return create_llm()


def get_llm_for_node(
    node_type: str,
    provider: Optional[LLMProvider] = None,
    model: Optional[str] = None,
) -> BaseChatModel:
    """Get LLM configured for specific node type"""
    
    settings = get_settings()
    
    temperature_map = {
        "planner": 0.7,
        "expert": 0.7,
        "critic": 0.5,
        "reviewer": 0.3,
        "synthesizer": 0.6,
    }
    
    temperature = temperature_map.get(node_type, 0.7)
    
    return create_llm(
        provider=provider,
        model=model,
        temperature=temperature,
    )
