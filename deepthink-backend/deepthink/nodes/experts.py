"""Experts node with parallel execution and diversity"""

import asyncio
import logging
import re
import time
import uuid
from typing import Any

from langchain_core.language_models import BaseChatModel
from langchain_core.messages import HumanMessage, SystemMessage

from ..state import AgentState, ExpertConfig, ExpertOutput
from ..prompts.expert import get_expert_system_prompt, PRIMARY_EXPERT_PROMPT
from ..tools.web_search import create_web_search

logger = logging.getLogger(__name__)


def parse_expert_response(response: str) -> tuple[str, str]:
    """Parse expert response to extract thoughts and content"""
    thoughts = ""
    content = response
    
    thoughts_match = re.search(r'<thoughts>(.*?)</thoughts>', response, re.DOTALL)
    if thoughts_match:
        thoughts = thoughts_match.group(1).strip()
    
    response_match = re.search(r'<response>(.*?)</response>', response, re.DOTALL)
    if response_match:
        content = response_match.group(1).strip()
    else:
        content = re.sub(r'<thoughts>.*?</thoughts>', '', response, flags=re.DOTALL)
        content = re.sub(r'<confidence>.*?</confidence>', '', content, flags=re.DOTALL)
        content = re.sub(r'<caveats>.*?</caveats>', '', content, flags=re.DOTALL)
        content = content.strip()
    
    return thoughts, content


async def run_single_expert(
    expert: ExpertConfig,
    context: str,
    query: str,
    round_num: int,
    llm: BaseChatModel,
    tool_config: dict | None = None,
) -> ExpertOutput:
    """Execute a single expert"""
    
    expert_id = f"expert-r{round_num}-{uuid.uuid4().hex[:8]}"
    start_time = time.time()
    
    logger.info(f"Starting expert: {expert['role']} ({expert['variant']})")
    
    try:
        search_context = ""
        if tool_config and tool_config.get("enable_web_search"):
            try:
                search_tool = create_web_search()
                if search_tool:
                    search_query = f"{expert['role']}: {query}"
                    logger.info(f"Running web search for expert: {expert['role']}")
                    search_results = search_tool.invoke(search_query)
                    if search_results:
                        search_context = f"\n\n[Web Search Results]\n{search_results}\n"
            except Exception as e:
                logger.warning(f"Web search failed for expert: {e}")
        
        system_prompt = get_expert_system_prompt(
            role=expert["role"],
            description=expert["description"],
            context=context + search_context,
            variant=expert["variant"],
        )
        
        response = await llm.ainvoke(
            [
                SystemMessage(content=system_prompt),
                HumanMessage(content=expert["prompt"]),
            ],
            temperature=expert["temperature"],
        )
        
        raw_content = response.content if hasattr(response, 'content') else str(response)
        thoughts, content = parse_expert_response(raw_content)
        
        logger.info(f"Expert completed: {expert['role']} ({expert['variant']})")
        
        return ExpertOutput(
            id=expert_id,
            role=expert["role"],
            description=expert["description"],
            temperature=expert["temperature"],
            prompt=expert["prompt"],
            variant=expert["variant"],
            content=content,
            thoughts=thoughts,
            round=round_num,
            status="completed",
            start_time=start_time,
            end_time=time.time(),
        )
        
    except Exception as e:
        logger.error(f"Expert failed: {expert['role']} - {e}")
        return ExpertOutput(
            id=expert_id,
            role=expert["role"],
            description=expert["description"],
            temperature=expert["temperature"],
            prompt=expert["prompt"],
            variant=expert["variant"],
            content=f"Error: {str(e)}",
            thoughts="",
            round=round_num,
            status="error",
            start_time=start_time,
            end_time=time.time(),
        )


async def run_primary_expert(
    query: str,
    context: str,
    round_num: int,
    llm: BaseChatModel,
    tool_config: dict | None = None,
) -> ExpertOutput:
    """Run the primary expert that directly addresses the query"""
    
    expert_id = f"expert-primary-{uuid.uuid4().hex[:8]}"
    start_time = time.time()
    
    logger.info("Starting Primary Expert")
    
    try:
        search_context = ""
        if tool_config and tool_config.get("enable_web_search"):
            try:
                search_tool = create_web_search()
                if search_tool:
                    logger.info("Running web search for primary expert")
                    search_results = search_tool.invoke(query)
                    if search_results:
                        search_context = f"\n\n[Web Search Results]\n{search_results}\n"
            except Exception as e:
                logger.warning(f"Web search failed for primary expert: {e}")
        
        prompt = PRIMARY_EXPERT_PROMPT.format(
            context=context + search_context,
            query=query,
        )
        
        response = await llm.ainvoke([
            SystemMessage(content="You are a helpful AI assistant that provides comprehensive, well-structured responses."),
            HumanMessage(content=prompt),
        ])
        
        raw_content = response.content if hasattr(response, 'content') else str(response)
        thoughts, content = parse_expert_response(raw_content)
        
        logger.info("Primary Expert completed")
        
        return ExpertOutput(
            id=expert_id,
            role="Primary Responder",
            description="Directly addresses the user's original query",
            temperature=0.7,
            prompt=query,
            variant="balanced",
            content=content,
            thoughts=thoughts,
            round=round_num,
            status="completed",
            start_time=start_time,
            end_time=time.time(),
        )
        
    except Exception as e:
        logger.error(f"Primary Expert failed: {e}")
        return ExpertOutput(
            id=expert_id,
            role="Primary Responder",
            description="Directly addresses the user's original query",
            temperature=0.7,
            prompt=query,
            variant="balanced",
            content=f"Error: {str(e)}",
            thoughts="",
            round=round_num,
            status="error",
            start_time=start_time,
            end_time=time.time(),
        )


async def run_parallel(state: AgentState, llm: BaseChatModel) -> dict[str, Any]:
    """Run all experts in parallel with diversity"""
    
    round_num = state["round"]
    experts_config = state["experts_config"]
    tool_config = state.get("tool_config")
    
    logger.info(f"Running {len(experts_config)} experts in parallel (round {round_num})")
    
    tasks = []
    
    if round_num == 1:
        tasks.append(
            run_primary_expert(
                query=state["query"],
                context=state["context"],
                round_num=round_num,
                llm=llm,
                tool_config=tool_config,
            )
        )
    
    for expert in experts_config:
        tasks.append(
            run_single_expert(
                expert=expert,
                context=state["context"],
                query=state["query"],
                round_num=round_num,
                llm=llm,
                tool_config=tool_config,
            )
        )
    
    results = await asyncio.gather(*tasks, return_exceptions=True)
    
    valid_results = []
    for result in results:
        if isinstance(result, Exception):
            logger.error(f"Expert task failed with exception: {result}")
        elif isinstance(result, dict) and "id" in result and "role" in result:
            valid_results.append(result)
    
    completed = sum(1 for r in valid_results if r["status"] == "completed")
    errors = sum(1 for r in valid_results if r["status"] == "error")
    
    logger.info(f"Experts completed: {completed}, errors: {errors}")
    
    return {
        "experts_output": valid_results,
    }
