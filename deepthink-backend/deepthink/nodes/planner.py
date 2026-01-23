"""Planner node with Tree-of-Thought planning"""

import json
import logging
from typing import Any

from langchain_core.language_models import BaseChatModel
from langchain_core.messages import HumanMessage, SystemMessage

from ..state import AgentState, ExpertConfig, PlanAlternative
from ..prompts.planner import PLANNER_BRAINSTORM_PROMPT, PLANNER_SELECT_PROMPT

logger = logging.getLogger(__name__)


async def brainstorm_strategies(
    llm: BaseChatModel,
    query: str,
    context: str,
    previous_critique: str = "",
) -> dict[str, Any]:
    """Brainstorm multiple planning strategies"""
    
    prompt = PLANNER_BRAINSTORM_PROMPT.format(
        query=query,
        context=context,
        previous_critique=previous_critique or "None",
    )
    
    response = await llm.ainvoke([
        SystemMessage(content="You are a strategic planning AI. Respond only with valid JSON."),
        HumanMessage(content=prompt),
    ])
    
    try:
        return json.loads(response.content)
    except json.JSONDecodeError:
        logger.error("Failed to parse brainstorm response as JSON")
        return {
            "analysis": "Failed to parse response",
            "alternatives": [],
        }


async def select_best_strategy(
    llm: BaseChatModel,
    query: str,
    alternatives: list[dict],
) -> dict[str, Any]:
    """Select the best strategy from alternatives"""
    
    prompt = PLANNER_SELECT_PROMPT.format(
        query=query,
        alternatives=json.dumps(alternatives, indent=2),
    )
    
    response = await llm.ainvoke([
        SystemMessage(content="You are a decision-making AI. Respond only with valid JSON."),
        HumanMessage(content=prompt),
    ])
    
    try:
        return json.loads(response.content)
    except json.JSONDecodeError:
        logger.error("Failed to parse selection response as JSON")
        if alternatives:
            return {
                "selected_id": alternatives[0].get("id", "strategy_1"),
                "selected": alternatives[0],
                "refinements": "Fallback to first strategy due to parsing error",
            }
        return {"selected": None, "refinements": "No alternatives available"}


DEFAULT_EXPERTS = [
    {
        "role": "通用分析专家",
        "description": "提供全面的问题分析和理解",
        "temperature": 0.7,
        "prompt": "请从整体角度分析这个问题，提供全面的理解和见解。",
    },
    {
        "role": "风险评估专家",
        "description": "识别潜在风险和问题",
        "temperature": 0.5,
        "prompt": "请识别这个问题中的潜在风险、挑战和需要注意的问题。",
    },
    {
        "role": "解决方案专家",
        "description": "提出可行的解决方案和建议",
        "temperature": 0.8,
        "prompt": "请针对这个问题提出可行的解决方案和具体建议。",
    },
]


def clamp_experts(experts: list[dict], min_count: int = 3, max_count: int = 5) -> list[dict]:
    """Ensure expert count is between 3 and 5"""
    if len(experts) < min_count:
        needed = min_count - len(experts)
        for i in range(needed):
            if i < len(DEFAULT_EXPERTS):
                default = DEFAULT_EXPERTS[i].copy()
                if not any(e.get("role") == default["role"] for e in experts):
                    experts.append(default)
    
    if len(experts) > max_count:
        experts = experts[:max_count]
    
    return experts


def create_expert_variants(experts: list[dict]) -> list[ExpertConfig]:
    """Create conservative and creative variants for each expert"""
    experts = clamp_experts(experts)
    variants = []
    
    for expert in experts:
        base_temp = expert.get("temperature", 0.7)
        
        variants.append(ExpertConfig(
            role=expert["role"],
            description=expert["description"],
            temperature=max(0.1, base_temp - 0.3),
            prompt=expert["prompt"],
            variant="conservative",
        ))
        
        variants.append(ExpertConfig(
            role=expert["role"],
            description=expert["description"],
            temperature=min(1.5, base_temp + 0.3),
            prompt=expert["prompt"],
            variant="creative",
        ))
    
    return variants


async def run(state: AgentState, llm: BaseChatModel) -> dict[str, Any]:
    """Main planner node - implements Tree-of-Thought planning"""
    
    logger.info(f"Planner starting round {state['round'] + 1}")
    
    brainstorm_result = await brainstorm_strategies(
        llm=llm,
        query=state["query"],
        context=state["context"],
        previous_critique=state.get("critique", ""),
    )
    
    alternatives = brainstorm_result.get("alternatives", [])
    
    if not alternatives:
        logger.warning("No alternatives generated, creating fallback")
        alternatives = [{
            "id": "fallback",
            "strategy": "Direct Response",
            "reasoning": "Fallback to direct response",
            "experts": [{
                "role": "General Expert",
                "description": "Provides comprehensive analysis",
                "temperature": 0.7,
                "prompt": state["query"],
            }],
            "confidence": 0.5,
        }]
    
    selection_result = await select_best_strategy(
        llm=llm,
        query=state["query"],
        alternatives=alternatives,
    )
    
    selected = selection_result.get("selected", alternatives[0])
    
    if selected is None:
        selected = alternatives[0]
    
    selected_plan = PlanAlternative(
        id=selected.get("id", "selected"),
        strategy=selected.get("strategy", ""),
        reasoning=selected.get("reasoning", ""),
        experts=selected.get("experts", []),
        confidence=selected.get("confidence", 0.5),
    )
    
    experts_config = create_expert_variants(selected.get("experts", []))
    
    plan_alternatives = [
        PlanAlternative(
            id=alt.get("id", f"alt_{i}"),
            strategy=alt.get("strategy", ""),
            reasoning=alt.get("reasoning", ""),
            experts=alt.get("experts", []),
            confidence=alt.get("confidence", 0.5),
        )
        for i, alt in enumerate(alternatives)
    ]
    
    logger.info(f"Planner selected strategy: {selected_plan['strategy']}")
    logger.info(f"Created {len(experts_config)} expert variants")
    
    manager_analysis = {
        "thought_process": brainstorm_result.get("analysis", ""),
        "experts": [
            {
                "role": exp["role"],
                "description": exp["description"],
                "temperature": exp["temperature"],
                "prompt": exp["prompt"],
            }
            for exp in selected.get("experts", [])
        ],
    }
    
    return {
        "planner_thoughts": brainstorm_result.get("analysis", ""),
        "plan_alternatives": plan_alternatives,
        "selected_plan": selected_plan,
        "experts_config": experts_config,
        "manager_analysis": manager_analysis,
        "round": state["round"] + 1,
    }
