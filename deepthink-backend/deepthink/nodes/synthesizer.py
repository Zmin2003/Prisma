"""Synthesizer node for structured output generation"""

import json
import logging
import time
from typing import Any

from langchain_core.language_models import BaseChatModel
from langchain_core.messages import HumanMessage, SystemMessage

from ..state import AgentState, StructuredOutput
from ..prompts.synthesizer import SYNTHESIS_STRUCTURED_PROMPT, SIMPLE_SYNTHESIS_PROMPT

logger = logging.getLogger(__name__)


def format_expert_outputs(experts: list[dict]) -> str:
    """Format expert outputs for synthesis"""
    formatted = []
    
    by_role = {}
    for expert in experts:
        if expert["status"] != "completed":
            continue
        role = expert["role"]
        if role not in by_role:
            by_role[role] = []
        by_role[role].append(expert)
    
    for role, role_experts in by_role.items():
        formatted.append(f"## {role}")
        
        consensus = None
        for exp in role_experts:
            if exp.get("variant") == "balanced":
                consensus = exp["content"]
                break
        
        if consensus:
            formatted.append(f"**Consensus View**:\n{consensus[:3000]}")
        else:
            for exp in role_experts:
                formatted.append(f"### {exp.get('variant', 'unknown').title()} View")
                formatted.append(exp["content"][:2000])
    
    return "\n\n".join(formatted)


def format_critic_feedback(feedback: list[dict]) -> str:
    """Format critic feedback for synthesis"""
    if not feedback:
        return "No critic feedback"
    
    formatted = []
    for item in feedback:
        if item["role"] == "Cross-Expert":
            formatted.append("## Cross-Expert Analysis")
        else:
            formatted.append(f"## {item['role']} Debate")
        
        if item.get("consensus"):
            formatted.append(f"**Consensus**: {item['consensus'][:1500]}")
        
        if item.get("conflicts"):
            formatted.append(f"**Unresolved Issues**: {', '.join(item['conflicts'])}")
    
    return "\n\n".join(formatted)


async def run(state: AgentState, llm: BaseChatModel) -> dict[str, Any]:
    """Run the synthesizer node"""
    
    logger.info("Synthesizer starting")
    
    overall_score = state.get("review_score", {}).get("overall", 0.7)
    
    expert_outputs_formatted = format_expert_outputs(state["experts_output"])
    critic_feedback_formatted = format_critic_feedback(state["critic_feedback"])
    
    prompt = SYNTHESIS_STRUCTURED_PROMPT.format(
        query=state["query"],
        context=state["context"],
        expert_outputs=expert_outputs_formatted,
        critic_feedback=critic_feedback_formatted,
        overall_score=overall_score,
    )
    
    try:
        response = await llm.ainvoke([
            SystemMessage(content="You are a synthesis AI that creates comprehensive, well-structured responses. Respond only with valid JSON."),
            HumanMessage(content=prompt),
        ])
        
        result = json.loads(response.content)
        
        structured_output = StructuredOutput(
            summary=result.get("summary", ""),
            key_points=result.get("key_points", []),
            detailed_analysis=result.get("detailed_analysis", ""),
            expert_citations=result.get("expert_citations", []),
            confidence_level=result.get("confidence_level", "medium"),
            caveats=result.get("caveats", []),
        )
        
        final_output = format_readable_output(structured_output)
        
        logger.info("Synthesis complete")
        
        return {
            "structured_output": structured_output,
            "final_output": final_output,
            "synthesis_thoughts": result.get("reasoning", ""),
            "end_time": time.time(),
        }
        
    except Exception as e:
        logger.error(f"Structured synthesis failed: {e}, falling back to simple synthesis")
        return await run_simple_synthesis(state, llm)


async def run_simple_synthesis(state: AgentState, llm: BaseChatModel) -> dict[str, Any]:
    """Fallback to simple synthesis"""
    
    expert_outputs = "\n\n".join([
        f"### {e['role']}\n{e['content']}"
        for e in state["experts_output"]
        if e["status"] == "completed"
    ])
    
    prompt = SIMPLE_SYNTHESIS_PROMPT.format(
        query=state["query"],
        context=state["context"],
        expert_outputs=expert_outputs,
    )
    
    try:
        response = await llm.ainvoke([
            SystemMessage(content="You are a helpful AI that synthesizes information into clear responses."),
            HumanMessage(content=prompt),
        ])
        
        content = response.content if hasattr(response, 'content') else str(response)
        
        return {
            "structured_output": None,
            "final_output": content,
            "synthesis_thoughts": "",
            "end_time": time.time(),
        }
        
    except Exception as e:
        logger.error(f"Simple synthesis also failed: {e}")
        return {
            "structured_output": None,
            "final_output": f"Synthesis failed: {str(e)}",
            "synthesis_thoughts": "",
            "end_time": time.time(),
            "error": str(e),
        }


def format_readable_output(structured: StructuredOutput) -> str:
    """Convert structured output to readable markdown"""
    
    parts = []
    
    if structured.get("summary"):
        parts.append(f"**Summary**: {structured['summary']}\n")
    
    if structured.get("key_points"):
        parts.append("## Key Points")
        for i, point in enumerate(structured["key_points"], 1):
            parts.append(f"{i}. {point}")
        parts.append("")
    
    if structured.get("detailed_analysis"):
        parts.append("## Detailed Analysis")
        parts.append(structured["detailed_analysis"])
        parts.append("")
    
    if structured.get("caveats"):
        parts.append("## Caveats & Limitations")
        for caveat in structured["caveats"]:
            parts.append(f"- {caveat}")
        parts.append("")
    
    confidence = structured.get("confidence_level", "medium")
    parts.append(f"*Confidence: {confidence}*")
    
    return "\n".join(parts)
