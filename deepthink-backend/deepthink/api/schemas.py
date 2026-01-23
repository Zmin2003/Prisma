"""OpenAI-compatible API schemas"""

from typing import Any, Literal, Optional
from pydantic import BaseModel, Field


class ChatMessage(BaseModel):
    role: Literal["system", "user", "assistant"]
    content: str
    name: Optional[str] = None


class Attachment(BaseModel):
    filename: str
    content_type: str = Field(description="MIME type: image/*, application/pdf, text/plain, application/vnd.openxmlformats-officedocument.wordprocessingml.document")
    data: str = Field(description="Base64 encoded file content")
    size: Optional[int] = Field(default=None, description="File size in bytes")


class ToolConfig(BaseModel):
    enable_web_search: bool = Field(default=False, description="Enable web search tool")
    web_search_provider: Literal["tavily", "duckduckgo", "auto"] = Field(default="auto", description="Web search provider")
    native_web: bool = Field(default=False, description="Use model's native web browsing if supported")
    domain_whitelist: Optional[list[str]] = Field(default=None, description="Allowed domains for web search")
    max_search_results: int = Field(default=5, ge=1, le=20, description="Maximum search results to return")


class ChatCompletionRequest(BaseModel):
    model: str = "deepthink"
    messages: list[ChatMessage]
    temperature: float = Field(default=0.7, ge=0, le=2)
    max_tokens: Optional[int] = None
    stream: bool = False
    top_p: Optional[float] = Field(default=None, ge=0, le=1)
    n: int = 1
    stop: Optional[list[str] | str] = None
    presence_penalty: float = Field(default=0, ge=-2, le=2)
    frequency_penalty: float = Field(default=0, ge=-2, le=2)
    user: Optional[str] = None
    
    max_rounds: int = Field(default=5, ge=1, le=10, description="Maximum reasoning rounds")
    enable_debate: bool = Field(default=True, description="Enable expert debate")
    
    provider: Optional[str] = Field(default=None, description="LLM provider (google, openai, anthropic, deepseek)")
    api_key: Optional[str] = Field(default=None, description="OpenAI-compatible API key (overrides server default)")
    base_url: Optional[str] = Field(default=None, description="OpenAI-compatible base URL")
    planning_level: Optional[str] = Field(default=None, description="Planning thinking level")
    expert_level: Optional[str] = Field(default=None, description="Expert thinking level")
    synthesis_level: Optional[str] = Field(default=None, description="Synthesis thinking level")
    attachments: Optional[list[Attachment]] = Field(default=None, description="File attachments (images, PDFs, text files)")
    tool_config: Optional[ToolConfig] = Field(default=None, description="Tool configuration for web search etc.")


class ChatCompletionChoice(BaseModel):
    index: int
    message: ChatMessage
    finish_reason: Literal["stop", "length", "content_filter"] | None


class Usage(BaseModel):
    prompt_tokens: int
    completion_tokens: int
    total_tokens: int


class ChatCompletionResponse(BaseModel):
    id: str
    object: Literal["chat.completion"] = "chat.completion"
    created: int
    model: str
    choices: list[ChatCompletionChoice]
    usage: Usage


class ChatCompletionChunkDelta(BaseModel):
    role: Optional[str] = None
    content: Optional[str] = None


class ChatCompletionChunkChoice(BaseModel):
    index: int
    delta: ChatCompletionChunkDelta
    finish_reason: Literal["stop", "length", "content_filter"] | None = None


class ChatCompletionChunk(BaseModel):
    id: str
    object: Literal["chat.completion.chunk"] = "chat.completion.chunk"
    created: int
    model: str
    choices: list[ChatCompletionChunkChoice]


class ModelInfo(BaseModel):
    id: str
    object: Literal["model"] = "model"
    created: int
    owned_by: str


class ModelList(BaseModel):
    object: Literal["list"] = "list"
    data: list[ModelInfo]


class ProcessState(BaseModel):
    node: str
    status: Literal["started", "completed", "error"]
    round: int
    data: Optional[dict[str, Any]] = None


class HealthResponse(BaseModel):
    status: Literal["healthy", "unhealthy"]
    version: str
    models: list[str]


class DeepThinkInvokeRequest(BaseModel):
    query: str = Field(..., min_length=1, description="The user query to process")
    context: str = Field(default="", description="Additional context for the query")
    max_rounds: int = Field(default=5, ge=1, le=10, description="Maximum reasoning rounds")
    model: Optional[str] = Field(default=None, description="Model to use")
    provider: Optional[str] = Field(default=None, description="LLM provider")
    api_key: Optional[str] = Field(default=None, description="API key (overrides server default)")
    base_url: Optional[str] = Field(default=None, description="Base URL for custom endpoint")
    planning_level: Optional[str] = Field(default=None, description="Planning thinking level")
    expert_level: Optional[str] = Field(default=None, description="Expert thinking level")
    synthesis_level: Optional[str] = Field(default=None, description="Synthesis thinking level")
    tool_config: Optional[ToolConfig] = Field(default=None, description="Tool configuration")


class ExpertOutput(BaseModel):
    role: str
    content: str
    status: str
    round: Optional[int] = None
    thoughts: Optional[str] = None


class ReviewScore(BaseModel):
    completeness: float = Field(ge=0, le=1)
    consistency: float = Field(ge=0, le=1)
    confidence: float = Field(ge=0, le=1)
    overall: float = Field(ge=0, le=1)
    satisfied: bool


class DeepThinkInvokeResponse(BaseModel):
    final_output: str
    structured_output: Optional[Any] = None
    experts: list[dict[str, Any]] = Field(default_factory=list)
    review_score: Optional[dict[str, Any]] = None
    rounds: int
