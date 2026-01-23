"""Reviewer node with dynamic stopping condition"""

import json
import logging
from typing import Any

from langchain_core.language_models import BaseChatModel
from langchain_core.messages import HumanMessage, SystemMessage

from ..state import AgentState, ExpertConfig, ReviewScore
from ..prompts.reviewer import REVIEWER_PROMPT

logger = logging.getLogger(__name__)


def format_expert_outputs(experts: list[dict]) -> str:
    """Format expert outputs for the reviewer"""
    formatted = []
    for expert in experts:
        formatted.append(f"""
### {expert['role']} ({expert.get('variant', 'balanced')}) - Round {expert.get('round', 1)}
**Status**: {expert['status']}
**Output**:
{expert.get('content', 'No output')[:2500]}
""")
    return "\n".join(formatted)


def format_critic_feedback(feedback: list[dict]) -> str:
    """Format critic feedback for the reviewer"""
    if not feedback:
        return "No critic feedback available"
    
    formatted = []
    for item in feedback:
        formatted.append(f"""
### {item['role']}
**Consensus**: {item.get('consensus', 'N/A')[:1000]}
**Conflicts**: {', '.join(item.get('conflicts', [])) or 'None'}
""")
    return "\n".join(formatted)


async def run(state: AgentState, llm: BaseChatModel) -> dict[str, Any]:
    """Run the reviewer node"""
    
    logger.info(f"Reviewer evaluating round {state['round']}")
    
    prompt = REVIEWER_PROMPT.format(
        query=state["query"],
        round=state["round"],
        max_rounds=state["max_rounds"],
        expert_outputs=format_expert_outputs(state["experts_output"]),
        critic_feedback=format_critic_feedback(state["critic_feedback"]),
    )
    
    try:
        response = await llm.ainvoke([
            SystemMessage(content="You are a quality assurance AI. Respond only with valid JSON."),
            HumanMessage(content=prompt),
        ])
        
        result = json.loads(response.content)
        
        completeness = float(result.get("completeness", 0.7))
        consistency = float(result.get("consistency", 0.7))
        confidence = float(result.get("confidence", 0.7))
        
        overall = completeness * 0.4 + consistency * 0.3 + confidence * 0.3
        
        review_score = ReviewScore(
            completeness=completeness,
            consistency=consistency,
            confidence=confidence,
            overall=overall,
        )
        
        explicit_satisfied = result.get("satisfied", False)
        satisfied = explicit_satisfied or overall >= 0.85
        
        if state["round"] >= state["max_rounds"]:
            satisfied = True
            logger.info("Max rounds reached, forcing satisfaction")
        
        refined_experts = []
        if not satisfied and result.get("refined_experts"):
            for exp in result["refined_experts"]:
                refined_experts.append(ExpertConfig(
                    role=exp.get("role", "General Expert"),
                    description=exp.get("description", ""),
                    temperature=float(exp.get("temperature", 0.7)),
                    prompt=exp.get("prompt", state["query"]),
                    variant="balanced",
                ))
        
        logger.info(f"Review complete: overall={overall:.2f}, satisfied={satisfied}")
        
        return {
            "review_score": review_score,
            "satisfied": satisfied,
            "critique": result.get("critique", ""),
            "next_strategy": result.get("next_strategy", ""),
            "experts_config": refined_experts if refined_experts else state["experts_config"],
        }
        
    except Exception as e:
        logger.error(f"Reviewer failed: {e}")
        return {
            "review_score": ReviewScore(
                completeness=0.7,
                consistency=0.7,
                confidence=0.7,
                overall=0.7,
            ),
            "satisfied": state["round"] >= state["max_rounds"],
            "critique": f"Review failed: {str(e)}",
            "next_strategy": "",
        }
