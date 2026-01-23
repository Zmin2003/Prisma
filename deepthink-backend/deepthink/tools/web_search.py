"""Web search tool integration"""

import os
from typing import Optional

from langchain_core.tools import tool


def create_web_search(api_key: Optional[str] = None):
    """Create web search tool with optional API key"""
    
    key = api_key or os.getenv("TAVILY_API_KEY")
    
    if key:
        try:
            from langchain_community.tools.tavily_search import TavilySearchResults
            return TavilySearchResults(
                max_results=5,
                api_key=key,
            )
        except ImportError:
            pass
    
    try:
        from langchain_community.tools import DuckDuckGoSearchResults
        return DuckDuckGoSearchResults(max_results=5)
    except ImportError:
        return None


@tool
def web_search_tool(query: str) -> str:
    """Search the web for current information.
    
    Args:
        query: The search query
        
    Returns:
        Search results as text
    """
    search = create_web_search()
    
    if search is None:
        return "Web search is not available. Please install tavily-python or duckduckgo-search."
    
    try:
        results = search.invoke(query)
        if isinstance(results, list):
            return "\n\n".join([
                f"**{r.get('title', 'Result')}**\n{r.get('content', r.get('snippet', ''))}"
                for r in results
            ])
        return str(results)
    except Exception as e:
        return f"Search failed: {str(e)}"
