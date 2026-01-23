"""Tool implementations for DeepThink"""

from .web_search import web_search_tool, create_web_search
from .code_executor import code_executor_tool, create_code_executor
from .calculator import calculator_tool

__all__ = [
    "web_search_tool",
    "create_web_search",
    "code_executor_tool",
    "create_code_executor",
    "calculator_tool",
]
