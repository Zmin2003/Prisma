"""Critic node for expert debate and cross-validation"""

import json
import logging
from collections import defaultdict
from typing import Any

from langchain_core.language_models import BaseChatModel
from langchain_core.messages import HumanMessage, SystemMessage

from ..state import AgentState, CriticFeedback, ExpertOutput
from ..prompts.critic import CRITIC_DEBATE_PROMPT, CROSS_EXPERT_CRITIQUE_PROMPT

logger = logging.getLogger(__name__)


def group_experts_by_role(experts: list[ExpertOutput]) -> dict[str, list[ExpertOutput]]:
    """Group expert outputs by their role"""
    groups = defaultdict(list)
    for expert in experts:
        groups[expert["role"]].append(expert)
    return dict(groups)


def format_expert_outputs_for_debate(experts: list[ExpertOutput]) -> str:
    """Format expert outputs for the debate prompt"""
    formatted = []
    for expert in experts:
        formatted.append(f"""
### {expert['variant'].upper()} Variant (temp={expert['temperature']})
{expert['content'][:3000]}
""")
    return "\n".join(formatted)


async def debate_within_role(
    role: str,
    experts: list[ExpertOutput],
    llm: BaseChatModel,
) -> CriticFeedback:
    """Conduct debate between variants of the same role"""
    
    logger.info(f"Running debate for role: {role}")
    
    outputs_formatted = format_expert_outputs_for_debate(experts)
    
    prompt = CRITIC_DEBATE_PROMPT.format(
        role=role,
        outputs=outputs_formatted,
    )
    
    try:
        response = await llm.ainvoke([
            SystemMessage(content="You are a critical evaluator. Respond only with valid JSON."),
            HumanMessage(content=prompt),
        ])
        
        result = json.loads(response.content)
        
        conflicts = []
        for conflict in result.get("conflicts", []):
            conflicts.append(conflict.get("topic", "Unknown conflict"))
        
        return CriticFeedback(
            role=role,
            critique=json.dumps(result.get("quality_assessment", {})),
            consensus=result.get("consensus", ""),
            conflicts=conflicts,
        )
        
    except Exception as e:
        logger.error(f"Debate failed for {role}: {e}")
        combined_content = " | ".join([e["content"][:500] for e in experts])
        return CriticFeedback(
            role=role,
            critique=f"Debate failed: {str(e)}",
            consensus=combined_content,
            conflicts=[],
        )


async def cross_expert_critique(
    experts: list[ExpertOutput],
    query: str,
    llm: BaseChatModel,
) -> CriticFeedback:
    """Cross-expert analysis to find contradictions and complementary insights"""
    
    logger.info("Running cross-expert critique")
    
    expert_outputs_formatted = "\n\n".join([
        f"### {e['role']} ({e['variant']})\n{e['content'][:2000]}"
        for e in experts
    ])
    
    prompt = CROSS_EXPERT_CRITIQUE_PROMPT.format(
        expert_outputs=expert_outputs_formatted,
        query=query,
    )
    
    try:
        response = await llm.ainvoke([
            SystemMessage(content="You are a critical evaluator. Respond only with valid JSON."),
            HumanMessage(content=prompt),
        ])
        
        result = json.loads(response.content)
        
        return CriticFeedback(
            role="Cross-Expert",
            critique=json.dumps({
                "contradictions": result.get("contradictions", []),
                "gaps": result.get("gaps", []),
                "coherence_score": result.get("coherence_score", 0.5),
            }),
            consensus=result.get("recommendation", ""),
            conflicts=[c.get("description", "") for c in result.get("contradictions", [])],
        )
        
    except Exception as e:
        logger.error(f"Cross-expert critique failed: {e}")
        return CriticFeedback(
            role="Cross-Expert",
            critique=f"Analysis failed: {str(e)}",
            consensus="",
            conflicts=[],
        )


async def run_debate(state: AgentState, llm: BaseChatModel) -> dict[str, Any]:
    """Run the debate phase"""
    
    current_round = state["round"]
    current_experts = [
        e for e in state["experts_output"]
        if e["round"] == current_round and e["status"] == "completed"
    ]
    
    if not current_experts:
        logger.warning("No completed experts to debate")
        return {"critic_feedback": []}
    
    logger.info(f"Running debate phase with {len(current_experts)} experts")
    
    groups = group_experts_by_role(current_experts)
    
    feedback_list = []
    
    for role, experts in groups.items():
        if len(experts) > 1:
            feedback = await debate_within_role(role, experts, llm)
            feedback_list.append(feedback)
        else:
            feedback_list.append(CriticFeedback(
                role=role,
                critique="Single variant, no debate needed",
                consensus=experts[0]["content"],
                conflicts=[],
            ))
    
    if len(groups) > 1:
        cross_feedback = await cross_expert_critique(
            current_experts,
            state["query"],
            llm,
        )
        feedback_list.append(cross_feedback)
    
    logger.info(f"Debate complete: {len(feedback_list)} feedback items")
    
    return {
        "critic_feedback": feedback_list,
    }
