"""AgentState definition for LangGraph"""

from typing import Annotated, Literal, TypedDict
import operator


class ExpertConfig(TypedDict):
    role: str
    description: str
    temperature: float
    prompt: str
    variant: str


class ExpertOutput(TypedDict):
    id: str
    role: str
    description: str
    temperature: float
    prompt: str
    variant: str
    content: str
    thoughts: str
    round: int
    status: Literal["pending", "thinking", "completed", "error"]
    start_time: float | None
    end_time: float | None


class PlanAlternative(TypedDict):
    id: str
    strategy: str
    reasoning: str
    experts: list[ExpertConfig]
    confidence: float


class ReviewScore(TypedDict):
    completeness: float
    consistency: float
    confidence: float
    overall: float


class CriticFeedback(TypedDict):
    role: str
    critique: str
    consensus: str
    conflicts: list[str]


class StructuredOutput(TypedDict):
    summary: str
    key_points: list[str]
    detailed_analysis: str
    expert_citations: list[dict]
    confidence_level: str
    caveats: list[str]


class Attachment(TypedDict):
    id: str
    type: str
    mime_type: str
    data: str


class ToolConfig(TypedDict):
    enable_web_search: bool
    web_search_provider: str
    native_web: bool
    max_search_results: int


def merge_expert_outputs(
    current: list[ExpertOutput], new: list[ExpertOutput]
) -> list[ExpertOutput]:
    """Merge expert outputs, appending new ones"""
    return current + new


def merge_critic_feedback(
    current: list[CriticFeedback], new: list[CriticFeedback]
) -> list[CriticFeedback]:
    """Merge critic feedback"""
    return current + new


class AgentState(TypedDict):
    query: str
    context: str
    attachments: list[Attachment]
    tool_config: ToolConfig | None
    
    planner_thoughts: str
    plan_alternatives: list[PlanAlternative]
    selected_plan: PlanAlternative | None
    experts_config: list[ExpertConfig]
    
    experts_output: Annotated[list[ExpertOutput], merge_expert_outputs]
    critic_feedback: Annotated[list[CriticFeedback], merge_critic_feedback]
    
    round: int
    max_rounds: int
    review_score: ReviewScore | None
    satisfied: bool
    critique: str
    next_strategy: str
    
    synthesis_thoughts: str
    final_output: str
    structured_output: StructuredOutput | None
    
    start_time: float
    end_time: float | None
    total_tokens: int
    
    error: str | None


def create_initial_state(
    query: str,
    context: str = "",
    attachments: list[Attachment] | None = None,
    max_rounds: int = 5,
    tool_config: ToolConfig | None = None,
) -> AgentState:
    """Create initial state for a new conversation"""
    import time
    
    return AgentState(
        query=query,
        context=context,
        attachments=attachments or [],
        tool_config=tool_config,
        planner_thoughts="",
        plan_alternatives=[],
        selected_plan=None,
        experts_config=[],
        experts_output=[],
        critic_feedback=[],
        round=0,
        max_rounds=max_rounds,
        review_score=None,
        satisfied=False,
        critique="",
        next_strategy="",
        synthesis_thoughts="",
        final_output="",
        structured_output=None,
        start_time=time.time(),
        end_time=None,
        total_tokens=0,
        error=None,
    )
