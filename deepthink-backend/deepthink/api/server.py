"""FastAPI server with OpenAI-compatible API"""

import ipaddress
import json
import logging
import re
import time
import uuid
from contextlib import asynccontextmanager
from typing import AsyncGenerator, Optional
from urllib.parse import urlparse

from fastapi import Depends, FastAPI, Header, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field
from sse_starlette.sse import EventSourceResponse

from .schemas import (
    ChatCompletionRequest,
    ChatCompletionResponse,
    ChatCompletionChoice,
    ChatCompletionChunk,
    ChatCompletionChunkChoice,
    ChatCompletionChunkDelta,
    ChatMessage,
    ModelList,
    ModelInfo,
    Usage,
    HealthResponse,
    ProcessState,
    DeepThinkInvokeRequest,
    DeepThinkInvokeResponse,
)
from ..config import get_settings
from ..graph import run_deep_think, stream_deep_think, build_graph
from ..model_registry import (
    RegistryModel,
    list_public_models as registry_list_public,
    list_all_models as registry_list_all,
    get_model as registry_get_model,
    create_model as registry_create_model,
    update_model as registry_update_model,
    delete_model as registry_delete_model,
    resolve_model as registry_resolve_model,
)
from ..state import create_initial_state

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


ALLOWED_CREDENTIAL_REFS = {
    "GOOGLE_API_KEY",
    "OPENAI_API_KEY",
    "ANTHROPIC_API_KEY",
    "DEEPSEEK_API_KEY",
    "XAI_API_KEY",
    "MISTRAL_API_KEY",
}


def verify_admin_key(x_admin_key: Optional[str] = Header(None, alias="X-Admin-Key")):
    settings = get_settings()
    if not settings.admin_api_key:
        raise HTTPException(status_code=500, detail="Admin API key not configured")
    if x_admin_key != settings.admin_api_key:
        raise HTTPException(status_code=401, detail="Invalid admin key")
    return True


class AdminModelCreate(BaseModel):
    id: str = Field(..., pattern=r"^[a-zA-Z0-9._:-]+$", min_length=1, max_length=64)
    display_name: str = Field(..., min_length=1, max_length=128)
    provider: str
    upstream_model: str = Field(..., min_length=1, max_length=128)
    base_url: Optional[str] = None
    credential_ref: Optional[str] = None
    enabled: bool = True


class AdminModelUpdate(BaseModel):
    display_name: Optional[str] = Field(None, min_length=1, max_length=128)
    provider: Optional[str] = None
    upstream_model: Optional[str] = Field(None, min_length=1, max_length=128)
    base_url: Optional[str] = None
    credential_ref: Optional[str] = None
    enabled: Optional[bool] = None


def validate_base_url(base_url: Optional[str]) -> Optional[str]:
    """Validate base_url to prevent SSRF attacks.
    
    Returns the validated URL if allowed, None otherwise.
    """
    if not base_url:
        return None
    
    settings = get_settings()
    allowlist = [u.strip() for u in settings.base_url_allowlist.split(",") if u.strip()]
    
    try:
        parsed = urlparse(base_url)
        
        if parsed.scheme not in ("https", "http"):
            logger.warning(f"Blocked base_url with invalid scheme: {base_url}")
            return None
        
        if not parsed.hostname:
            logger.warning(f"Blocked base_url with no hostname: {base_url}")
            return None
        
        hostname = parsed.hostname.lower()
        
        if hostname in ("localhost", "127.0.0.1", "::1", "0.0.0.0"):
            logger.warning(f"Blocked localhost base_url: {base_url}")
            return None
        
        try:
            ip = ipaddress.ip_address(hostname)
            if ip.is_private or ip.is_loopback or ip.is_link_local or ip.is_reserved:
                logger.warning(f"Blocked private/reserved IP base_url: {base_url}")
                return None
        except ValueError:
            pass
        
        if allowlist:
            allowed = False
            for allowed_url in allowlist:
                allowed_parsed = urlparse(allowed_url if "://" in allowed_url else f"https://{allowed_url}")
                allowed_host = (allowed_parsed.hostname or "").lower()
                
                if not allowed_host:
                    continue
                
                if hostname == allowed_host:
                    allowed = True
                    break
                
                if hostname.endswith(f".{allowed_host}"):
                    allowed = True
                    break
            
            if not allowed:
                logger.warning(f"Blocked base_url not in allowlist: {base_url}")
                return None
        
        return base_url
        
    except Exception as e:
        logger.warning(f"Failed to validate base_url '{base_url}': {e}")
        return None


AVAILABLE_MODELS = [
    ModelInfo(
        id="deepthink",
        object="model",
        created=int(time.time()),
        owned_by="deepthink",
    ),
    ModelInfo(
        id="deepthink-fast",
        object="model",
        created=int(time.time()),
        owned_by="deepthink",
    ),
]


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Starting DeepThink API server...")
    yield
    logger.info("Shutting down DeepThink API server...")


def create_app() -> FastAPI:
    """Create and configure the FastAPI application"""
    
    settings = get_settings()
    
    app = FastAPI(
        title="DeepThink API",
        description="Multi-Agent Reasoning Engine with OpenAI-compatible API",
        version="2.0.0",
        lifespan=lifespan,
    )
    
    cors_origins = [o.strip() for o in settings.cors_allow_origins.split(",") if o.strip()]
    if not cors_origins:
        cors_origins = ["http://localhost:3000"]
    
    app.add_middleware(
        CORSMiddleware,
        allow_origins=cors_origins,
        allow_credentials=False,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    
    return app


app = create_app()


def extract_query_and_context(messages: list[ChatMessage]) -> tuple[str, str]:
    """Extract the user query and conversation context from messages"""
    
    query = ""
    context_parts = []
    
    for i, msg in enumerate(messages):
        if msg.role == "user":
            if i == len(messages) - 1:
                query = msg.content
            else:
                context_parts.append(f"User: {msg.content}")
        elif msg.role == "assistant":
            context_parts.append(f"Assistant: {msg.content}")
        elif msg.role == "system":
            context_parts.insert(0, f"System: {msg.content}")
    
    if not query and messages:
        for msg in reversed(messages):
            if msg.role == "user":
                query = msg.content
                break
    
    context = "\n".join(context_parts[-10:])
    
    return query, context


@app.get("/health")
async def health_check() -> HealthResponse:
    """Health check endpoint"""
    return HealthResponse(
        status="healthy",
        version="2.0.0",
        models=[m.id for m in AVAILABLE_MODELS],
    )


@app.get("/v1/models")
async def list_models() -> ModelList:
    """List available models (OpenAI-compatible) including registry models"""
    all_models = list(AVAILABLE_MODELS)
    
    for reg_model in registry_list_public():
        all_models.append(ModelInfo(
            id=reg_model.id,
            object="model",
            created=int(time.time()),
            owned_by="model-registry",
        ))
    
    return ModelList(data=all_models)


@app.get("/admin/models")
async def admin_list_models(_: bool = Depends(verify_admin_key)):
    """List all models including disabled ones (admin only)"""
    models = registry_list_all()
    return {"models": [m.model_dump() for m in models]}


@app.post("/admin/models")
async def admin_create_model(
    model: AdminModelCreate,
    _: bool = Depends(verify_admin_key),
):
    """Create a new model in the registry (admin only)"""
    if model.base_url:
        validated = validate_base_url(model.base_url)
        if validated is None:
            raise HTTPException(status_code=400, detail="Invalid or blocked base_url")
    
    if model.credential_ref and model.credential_ref not in ALLOWED_CREDENTIAL_REFS:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid credential_ref. Allowed: {', '.join(ALLOWED_CREDENTIAL_REFS)}"
        )
    
    try:
        reg_model = RegistryModel(
            id=model.id,
            display_name=model.display_name,
            provider=model.provider,
            upstream_model=model.upstream_model,
            base_url=model.base_url,
            credential_ref=model.credential_ref,
            enabled=model.enabled,
        )
        created = registry_create_model(reg_model)
        return created.model_dump()
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.put("/admin/models/{model_id}")
async def admin_update_model(
    model_id: str,
    updates: AdminModelUpdate,
    _: bool = Depends(verify_admin_key),
):
    """Update an existing model in the registry (admin only)"""
    update_dict = updates.model_dump(exclude_unset=True)
    
    if "base_url" in update_dict and update_dict["base_url"]:
        validated = validate_base_url(update_dict["base_url"])
        if validated is None:
            raise HTTPException(status_code=400, detail="Invalid or blocked base_url")
    
    if "credential_ref" in update_dict and update_dict["credential_ref"]:
        if update_dict["credential_ref"] not in ALLOWED_CREDENTIAL_REFS:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid credential_ref. Allowed: {', '.join(ALLOWED_CREDENTIAL_REFS)}"
            )
    
    updated = registry_update_model(model_id, update_dict)
    if updated is None:
        raise HTTPException(status_code=404, detail="Model not found")
    return updated.model_dump()


@app.delete("/admin/models/{model_id}")
async def admin_delete_model(
    model_id: str,
    _: bool = Depends(verify_admin_key),
):
    """Delete a model from the registry (admin only)"""
    if registry_delete_model(model_id):
        return {"deleted": True, "id": model_id}
    raise HTTPException(status_code=404, detail="Model not found")


def resolve_request_model(request):
    """Resolve model from registry if available, otherwise use request values"""
    resolved = registry_resolve_model(request.model)
    if resolved:
        return {
            "provider": resolved["provider"],
            "model": resolved["upstream_model"],
            "api_key": resolved["api_key"],
            "base_url": validate_base_url(resolved["base_url"]),
        }
    return {
        "provider": request.provider,
        "model": request.model,
        "api_key": request.api_key,
        "base_url": validate_base_url(request.base_url),
    }


@app.post("/v1/chat/completions")
async def chat_completions(request: ChatCompletionRequest):
    """Chat completions endpoint (OpenAI-compatible)"""
    
    query, context = extract_query_and_context(request.messages)
    
    if not query:
        raise HTTPException(status_code=400, detail="No user message found")
    
    logger.info(f"Received request for model: {request.model}")
    logger.info(f"Query: {query[:100]}...")
    
    if request.stream:
        return EventSourceResponse(
            stream_chat_completion(query, context, request),
            media_type="text/event-stream",
        )
    else:
        return await non_streaming_completion(query, context, request)


async def non_streaming_completion(
    query: str,
    context: str,
    request: ChatCompletionRequest,
) -> ChatCompletionResponse:
    """Handle non-streaming completion"""
    
    try:
        tool_config = None
        if request.tool_config:
            tool_config = {
                "enable_web_search": request.tool_config.enable_web_search,
                "web_search_provider": request.tool_config.web_search_provider,
                "native_web": request.tool_config.native_web,
                "max_search_results": request.tool_config.max_search_results,
            }
        
        resolved = resolve_request_model(request)
        
        result = await run_deep_think(
            query=query,
            context=context,
            max_rounds=request.max_rounds,
            provider=resolved["provider"],
            model=resolved["model"],
            api_key=resolved["api_key"],
            base_url=resolved["base_url"],
            tool_config=tool_config,
        )
        
        final_output = result.get("final_output", "")
        
        if not final_output:
            final_output = "I apologize, but I was unable to generate a response."
        
        return ChatCompletionResponse(
            id=f"chatcmpl-{uuid.uuid4().hex[:12]}",
            created=int(time.time()),
            model=request.model,
            choices=[
                ChatCompletionChoice(
                    index=0,
                    message=ChatMessage(
                        role="assistant",
                        content=final_output,
                    ),
                    finish_reason="stop",
                )
            ],
            usage=Usage(
                prompt_tokens=len(query.split()),
                completion_tokens=len(final_output.split()),
                total_tokens=len(query.split()) + len(final_output.split()),
            ),
        )
        
    except Exception as e:
        logger.error(f"Completion failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


async def stream_chat_completion(
    query: str,
    context: str,
    request: ChatCompletionRequest,
) -> AsyncGenerator[str, None]:
    """Stream chat completion with SSE"""
    
    completion_id = f"chatcmpl-{uuid.uuid4().hex[:12]}"
    created = int(time.time())
    
    yield {
        "data": json.dumps(ChatCompletionChunk(
            id=completion_id,
            created=created,
            model=request.model,
            choices=[
                ChatCompletionChunkChoice(
                    index=0,
                    delta=ChatCompletionChunkDelta(role="assistant"),
                    finish_reason=None,
                )
            ],
        ).model_dump())
    }
    
    try:
        last_output = ""
        
        tool_config = None
        if request.tool_config:
            tool_config = {
                "enable_web_search": request.tool_config.enable_web_search,
                "web_search_provider": request.tool_config.web_search_provider,
                "native_web": request.tool_config.native_web,
                "max_search_results": request.tool_config.max_search_results,
            }
        
        resolved = resolve_request_model(request)
        
        async for event in stream_deep_think(
            query=query,
            context=context,
            max_rounds=request.max_rounds,
            provider=resolved["provider"],
            model=resolved["model"],
            api_key=resolved["api_key"],
            base_url=resolved["base_url"],
            tool_config=tool_config,
        ):
            if event["event"] == "on_chain_end":
                data = event.get("data", {})
                output = data.get("output", {})
                
                if isinstance(output, dict):
                    final_output = output.get("final_output", "")
                    
                    if final_output and final_output != last_output:
                        new_content = final_output[len(last_output):]
                        last_output = final_output
                        
                        if new_content:
                            yield {
                                "data": json.dumps(ChatCompletionChunk(
                                    id=completion_id,
                                    created=created,
                                    model=request.model,
                                    choices=[
                                        ChatCompletionChunkChoice(
                                            index=0,
                                            delta=ChatCompletionChunkDelta(content=new_content),
                                            finish_reason=None,
                                        )
                                    ],
                                ).model_dump())
                            }
        
        yield {
            "data": json.dumps(ChatCompletionChunk(
                id=completion_id,
                created=created,
                model=request.model,
                choices=[
                    ChatCompletionChunkChoice(
                        index=0,
                        delta=ChatCompletionChunkDelta(),
                        finish_reason="stop",
                    )
                ],
            ).model_dump())
        }
        
        yield {"data": "[DONE]"}
        
    except Exception as e:
        logger.error(f"Streaming failed: {e}")
        yield {
            "data": json.dumps({
                "error": {
                    "message": str(e),
                    "type": "server_error",
                }
            })
        }


@app.websocket("/ws/chat")
async def websocket_chat(websocket: WebSocket):
    """WebSocket endpoint for real-time state updates"""
    
    await websocket.accept()
    logger.info("WebSocket connection established")
    
    try:
        while True:
            data = await websocket.receive_json()
            
            query = data.get("query", "")
            context = data.get("context", "")
            max_rounds = data.get("max_rounds", 5)
            model = data.get("model")
            provider = data.get("provider")
            api_key = data.get("api_key")
            base_url = validate_base_url(data.get("base_url"))
            tool_config_data = data.get("tool_config")
            
            tool_config = None
            if tool_config_data:
                tool_config = {
                    "enable_web_search": tool_config_data.get("enable_web_search", False),
                    "web_search_provider": tool_config_data.get("web_search_provider", "auto"),
                    "native_web": tool_config_data.get("native_web", False),
                    "max_search_results": tool_config_data.get("max_search_results", 5),
                }
            
            if not query:
                await websocket.send_json({
                    "type": "error",
                    "message": "No query provided",
                })
                continue
            
            await websocket.send_json({
                "type": "state_update",
                "node": "start",
                "status": "started",
                "round": 0,
            })
            
            try:
                current_node = ""
                latest_state_data = {}
                
                async for event in stream_deep_think(
                    query=query,
                    context=context,
                    max_rounds=max_rounds,
                    provider=provider,
                    model=model,
                    api_key=api_key,
                    base_url=base_url,
                    tool_config=tool_config,
                ):
                    if event["event"] == "on_chain_start":
                        node_name = event.get("name", "")
                        if node_name and node_name != current_node:
                            current_node = node_name
                            await websocket.send_json({
                                "type": "state_update",
                                "node": node_name,
                                "status": "started",
                            })
                    
                    elif event["event"] == "on_chain_end":
                        node_name = event.get("name", "")
                        output = event.get("data", {}).get("output", {})
                        
                        state_data = {}
                        if isinstance(output, dict):
                            if "experts_output" in output:
                                state_data["experts"] = output["experts_output"]
                            if "review_score" in output:
                                state_data["score"] = output["review_score"]
                            if "final_output" in output:
                                state_data["final_output"] = output["final_output"]
                            if "manager_analysis" in output:
                                state_data["manager_analysis"] = output["manager_analysis"]
                            if "synthesis_thoughts" in output:
                                state_data["synthesis_thoughts"] = output["synthesis_thoughts"]
                        
                        if state_data:
                            latest_state_data.update(state_data)
                        
                        await websocket.send_json({
                            "type": "state_update",
                            "node": node_name,
                            "status": "completed",
                            "data": state_data if state_data else None,
                        })
                
                complete_data = {
                    "final_output": latest_state_data.get("final_output", ""),
                    "experts": latest_state_data.get("experts", []),
                    "manager_analysis": latest_state_data.get("manager_analysis"),
                    "synthesis_thoughts": latest_state_data.get("synthesis_thoughts", ""),
                    "score": latest_state_data.get("score"),
                }
                await websocket.send_json({
                    "type": "complete",
                    "node": "end",
                    "status": "completed",
                    "data": complete_data,
                })
                
            except Exception as e:
                logger.error(f"Processing error: {e}")
                await websocket.send_json({
                    "type": "error",
                    "message": str(e),
                })
                
    except WebSocketDisconnect:
        logger.info("WebSocket disconnected")


@app.post("/deepthink/invoke", response_model=DeepThinkInvokeResponse)
async def deepthink_invoke(request: DeepThinkInvokeRequest) -> DeepThinkInvokeResponse:
    """Direct LangGraph invoke endpoint"""
    
    validated_base_url = validate_base_url(request.base_url)
    
    tool_config = None
    if request.tool_config:
        tool_config = {
            "enable_web_search": request.tool_config.enable_web_search,
            "web_search_provider": request.tool_config.web_search_provider,
            "native_web": request.tool_config.native_web,
            "max_search_results": request.tool_config.max_search_results,
        }
    
    result = await run_deep_think(
        query=request.query,
        context=request.context,
        max_rounds=request.max_rounds,
        provider=request.provider,
        model=request.model,
        api_key=request.api_key,
        base_url=validated_base_url,
        tool_config=tool_config,
    )
    
    return DeepThinkInvokeResponse(
        final_output=result.get("final_output", ""),
        structured_output=result.get("structured_output"),
        experts=result.get("experts_output", []),
        review_score=result.get("review_score"),
        rounds=result.get("round", 0),
    )


def run_server():
    """Run the server"""
    import uvicorn
    
    settings = get_settings()
    
    uvicorn.run(
        "deepthink.api.server:app",
        host=settings.api_host,
        port=settings.api_port,
        reload=True,
    )


if __name__ == "__main__":
    run_server()
