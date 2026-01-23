"""Prompt templates for DeepThink"""

from .planner import PLANNER_BRAINSTORM_PROMPT, PLANNER_SELECT_PROMPT
from .expert import get_expert_system_prompt
from .critic import CRITIC_DEBATE_PROMPT
from .reviewer import REVIEWER_PROMPT
from .synthesizer import SYNTHESIS_STRUCTURED_PROMPT

__all__ = [
    "PLANNER_BRAINSTORM_PROMPT",
    "PLANNER_SELECT_PROMPT",
    "get_expert_system_prompt",
    "CRITIC_DEBATE_PROMPT",
    "REVIEWER_PROMPT",
    "SYNTHESIS_STRUCTURED_PROMPT",
]
