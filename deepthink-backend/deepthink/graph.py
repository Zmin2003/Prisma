"""LangGraph main graph definition"""

import logging
from functools import partial
from typing import Literal

from langgraph.graph import StateGraph, END
from langgraph.checkpoint.memory import MemorySaver

from .state import AgentState
from .nodes import planner, experts, critic, reviewer, synthesizer
from .llm import get_default_llm, create_llm
from .config import get_settings, LLMProvider

logger = logging.getLogger(__name__)


def should_continue(state: AgentState) -> Literal["continue", "synthesize"]:
    """Determine whether to continue iterating or synthesize"""
    
    if state.get("satisfied", False):
        logger.info("Satisfied flag set, proceeding to synthesis")
        return "synthesize"
    
    if state["round"] >= state["max_rounds"]:
        logger.info(f"Max rounds ({state['max_rounds']}) reached, proceeding to synthesis")
        return "synthesize"
    
    review_score = state.get("review_score")
    if review_score and review_score.get("overall", 0) >= 0.85:
        logger.info(f"Quality threshold met (score={review_score['overall']:.2f}), proceeding to synthesis")
        return "synthesize"
    
    logger.info(f"Round {state['round']}: not satisfied, continuing iteration")
    return "continue"


def create_node_with_llm(node_func, llm):
    """Create a node function with LLM injected"""
    async def wrapped(state: AgentState):
        return await node_func(state, llm)
    return wrapped


def build_graph(
    provider: LLMProvider | None = None,
    model: str | None = None,
    api_key: str | None = None,
    base_url: str | None = None,
    checkpointer = None,
):
    """Build the LangGraph state machine"""
    
    settings = get_settings()
    
    llm = create_llm(
        provider=provider or settings.default_provider,
        model=model or settings.default_model,
        api_key=api_key,
        base_url=base_url,
    )
    
    graph = StateGraph(AgentState)
    
    graph.add_node("planner", create_node_with_llm(planner.run, llm))
    graph.add_node("experts", create_node_with_llm(experts.run_parallel, llm))
    graph.add_node("critic", create_node_with_llm(critic.run_debate, llm))
    graph.add_node("reviewer", create_node_with_llm(reviewer.run, llm))
    graph.add_node("synthesizer", create_node_with_llm(synthesizer.run, llm))
    
    graph.set_entry_point("planner")
    
    graph.add_edge("planner", "experts")
    graph.add_edge("experts", "critic")
    graph.add_edge("critic", "reviewer")
    
    graph.add_conditional_edges(
        "reviewer",
        should_continue,
        {
            "continue": "planner",
            "synthesize": "synthesizer",
        }
    )
    
    graph.add_edge("synthesizer", END)
    
    if checkpointer is None:
        checkpointer = MemorySaver()
    
    compiled = graph.compile(checkpointer=checkpointer)
    
    logger.info("Graph compiled successfully")
    
    return compiled


_default_graph = None


def get_graph():
    """Get or create the default graph instance"""
    global _default_graph
    
    if _default_graph is None:
        _default_graph = build_graph()
    
    return _default_graph


async def run_deep_think(
    query: str,
    context: str = "",
    max_rounds: int = 5,
    thread_id: str | None = None,
    provider: str | LLMProvider | None = None,
    model: str | None = None,
    api_key: str | None = None,
    base_url: str | None = None,
    tool_config: dict | None = None,
):
    """Run the deep think process"""
    import time
    import uuid
    
    from .state import create_initial_state
    
    llm_provider = None
    if provider:
        try:
            llm_provider = LLMProvider(provider) if isinstance(provider, str) else provider
        except ValueError:
            llm_provider = LLMProvider.OPENAI
    
    graph = build_graph(
        provider=llm_provider,
        model=model,
        api_key=api_key,
        base_url=base_url,
    )
    
    initial_state = create_initial_state(
        query=query,
        context=context,
        max_rounds=max_rounds,
        tool_config=tool_config,
    )
    
    config = {
        "configurable": {
            "thread_id": thread_id or uuid.uuid4().hex,
        }
    }
    
    logger.info(f"Starting deep think for query: {query[:100]}...")
    
    result = await graph.ainvoke(initial_state, config=config)
    
    return result


async def stream_deep_think(
    query: str,
    context: str = "",
    max_rounds: int = 5,
    thread_id: str | None = None,
    provider: str | LLMProvider | None = None,
    model: str | None = None,
    api_key: str | None = None,
    base_url: str | None = None,
    tool_config: dict | None = None,
):
    """Stream the deep think process with events"""
    import uuid
    
    from .state import create_initial_state
    
    llm_provider = None
    if provider:
        try:
            llm_provider = LLMProvider(provider) if isinstance(provider, str) else provider
        except ValueError:
            llm_provider = LLMProvider.OPENAI
    
    graph = build_graph(
        provider=llm_provider,
        model=model,
        api_key=api_key,
        base_url=base_url,
    )
    
    initial_state = create_initial_state(
        query=query,
        context=context,
        max_rounds=max_rounds,
        tool_config=tool_config,
    )
    
    config = {
        "configurable": {
            "thread_id": thread_id or uuid.uuid4().hex,
        }
    }
    
    logger.info(f"Starting streaming deep think for query: {query[:100]}...")
    
    async for event in graph.astream_events(initial_state, config=config, version="v2"):
        yield event
