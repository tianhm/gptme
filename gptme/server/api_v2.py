"""
V2 API for gptme server with improved control flow and tool execution management.

Key improvements:
- Session management for tracking active operations
- Separate event stream for different types of events
- Tool confirmation workflow
- Better interruption handling
"""

import dataclasses
import logging
import shutil
import threading
import uuid
from collections import defaultdict
from collections.abc import Generator
from dataclasses import dataclass, field
from datetime import datetime, timedelta
from enum import Enum
from itertools import islice
from pathlib import Path
from typing import Literal, TypedDict

import flask
from dotenv import load_dotenv
from flask import request
from gptme.config import ChatConfig, Config, set_config
from gptme.prompts import get_prompt

from ..dirs import get_logs_dir
from ..llm import _chat_complete, _stream
from ..llm.models import get_default_model
from ..logmanager import LogManager, get_user_conversations, prepare_messages
from ..message import Message
from ..tools import (
    ToolUse,
    get_toolchain,
    get_tools,
    init_tools,
)
from .api import _abs_to_rel_workspace
from .openapi_docs import (
    ConversationListResponse,
    ConversationResponse,
    ErrorResponse,
    InterruptRequest,
    SessionResponse,
    StatusResponse,
    StepRequest,
    ToolConfirmRequest,
    api_doc,
    api_doc_simple,
)

logger = logging.getLogger(__name__)

v2_api = flask.Blueprint("v2_api", __name__)


class MessageDict(TypedDict):
    """Message dictionary type."""

    role: str
    content: str
    timestamp: str
    files: list[str] | None


class ToolUseDict(TypedDict):
    """Tool use dictionary type."""

    tool: str
    args: list[str] | None
    content: str | None


# Event Type Definitions
# ---------------------


class BaseEvent(TypedDict):
    """Base event type with common fields."""

    type: Literal[
        "connected",
        "ping",
        "message_added",
        "generation_started",
        "generation_progress",
        "generation_complete",
        "tool_pending",
        "tool_executing",
        "interrupted",
        "error",
    ]


class ConnectedEvent(BaseEvent):
    """Sent when a client connects to the event stream."""

    session_id: str


class PingEvent(BaseEvent):
    """Periodic ping to keep connection alive."""


class MessageAddedEvent(BaseEvent):
    """
    Sent when a new message is added to the conversation, such as when a tool has output to display.

    Not used for streaming generated messages.
    """

    message: MessageDict


class GenerationStartedEvent(BaseEvent):
    """Sent when generation starts."""


class GenerationProgressEvent(BaseEvent):
    """Sent for each token during generation."""

    token: str


class GenerationCompleteEvent(BaseEvent):
    """Sent when generation is complete."""

    message: MessageDict


class ToolPendingEvent(BaseEvent):
    """Sent when a tool is detected and waiting for confirmation."""

    tool_id: str
    tooluse: ToolUseDict
    auto_confirm: bool


class ToolExecutingEvent(BaseEvent):
    """Sent when a tool is being executed."""

    tool_id: str


class InterruptedEvent(BaseEvent):
    """Sent when generation is interrupted."""


class ErrorEvent(BaseEvent):
    """Sent when an error occurs."""

    error: str


# Union type for all possible events
EventType = (
    ConnectedEvent
    | PingEvent
    | MessageAddedEvent
    | GenerationStartedEvent
    | GenerationProgressEvent
    | GenerationCompleteEvent
    | ToolPendingEvent
    | ToolExecutingEvent
    | InterruptedEvent
    | ErrorEvent
)


# Session Management
# ------------------


class ToolStatus(Enum):
    """Status of a tool execution."""

    PENDING = "pending"
    EXECUTING = "executing"
    COMPLETED = "completed"
    SKIPPED = "skipped"
    FAILED = "failed"


@dataclass
class ToolExecution:
    """Tracks a tool execution."""

    tool_id: str
    tooluse: ToolUse
    status: ToolStatus = ToolStatus.PENDING
    auto_confirm: bool = False


@dataclass
class ConversationSession:
    """Session for a conversation."""

    id: str
    conversation_id: str
    active: bool = True
    generating: bool = False
    last_activity: datetime = field(default_factory=datetime.now)
    events: list[EventType] = field(default_factory=list)
    pending_tools: dict[str, ToolExecution] = field(default_factory=dict)
    auto_confirm_count: int = 0
    clients: set[str] = field(default_factory=set)
    event_flag: threading.Event = field(default_factory=threading.Event)


class SessionManager:
    """Manages conversation sessions."""

    _sessions: dict[str, ConversationSession] = {}
    _conversation_sessions: dict[str, set[str]] = defaultdict(set)

    @classmethod
    def create_session(cls, conversation_id: str) -> ConversationSession:
        """Create a new session for a conversation."""
        session_id = str(uuid.uuid4())
        session = ConversationSession(id=session_id, conversation_id=conversation_id)
        cls._sessions[session_id] = session
        cls._conversation_sessions[conversation_id].add(session_id)
        return session

    @classmethod
    def get_session(cls, session_id: str) -> ConversationSession | None:
        """Get a session by ID."""
        return cls._sessions.get(session_id)

    @classmethod
    def get_sessions_for_conversation(
        cls, conversation_id: str
    ) -> list[ConversationSession]:
        """Get all sessions for a conversation."""
        return [
            cls._sessions[sid]
            for sid in cls._conversation_sessions.get(conversation_id, set())
            if sid in cls._sessions
        ]

    @classmethod
    def add_event(cls, conversation_id: str, event: EventType) -> None:
        """Add an event to all sessions for a conversation."""
        for session in cls.get_sessions_for_conversation(conversation_id):
            session.events.append(event)
            session.last_activity = datetime.now()
            session.event_flag.set()  # Signal that new events are available

    @classmethod
    def clean_inactive_sessions(cls, max_age_minutes: int = 60) -> None:
        """Clean up inactive sessions."""
        cutoff = datetime.now() - timedelta(minutes=max_age_minutes)
        to_remove = []

        for session_id, session in cls._sessions.items():
            if session.last_activity < cutoff and not session.generating:
                to_remove.append(session_id)

        for session_id in to_remove:
            cls.remove_session(session_id)

    @classmethod
    def remove_session(cls, session_id: str) -> None:
        """Remove a session."""
        if session_id in cls._sessions:
            conversation_id = cls._sessions[session_id].conversation_id
            if conversation_id in cls._conversation_sessions:
                cls._conversation_sessions[conversation_id].discard(session_id)
                if not cls._conversation_sessions[conversation_id]:
                    del cls._conversation_sessions[conversation_id]
            del cls._sessions[session_id]

    @classmethod
    def remove_all_sessions_for_conversation(cls, conversation_id: str) -> None:
        """Remove all sessions for a conversation."""
        for session in cls.get_sessions_for_conversation(conversation_id):
            cls.remove_session(session.id)


# Helper Functions for Generation
# ------------------------------


def _append_and_notify(manager: LogManager, session: ConversationSession, msg: Message):
    """Append a message and notify clients."""
    manager.append(msg)
    SessionManager.add_event(
        session.conversation_id,
        {
            "type": "message_added",
            "message": msg2dict(msg, manager.workspace),
        },
    )


def step(
    conversation_id: str,
    session: ConversationSession,
    model: str,
    workspace: Path,
    branch: str = "main",
    auto_confirm: bool = False,
    stream: bool = True,
) -> None:
    """
    Generate a response and detect tools.

    This function handles generating a response from the LLM and detecting tools
    in the response. When tools are detected, it creates a pending tool record
    and either waits for confirmation or auto-confirms based on settings.

    It's designed to be used both for initial generation and for continuing
    after tool execution is complete.

    Args:
        conversation_id: The conversation ID
        session: The current session
        model: Model to use
        workspace: Workspace to use
        branch: Branch to use (default: "main")
        auto_confirm: Whether to auto-confirm tools (default: False)
        stream: Whether to stream the response (default: True)
    """

    # Create and set config
    config = Config.from_workspace(workspace=workspace)
    logdir = get_logs_dir() / conversation_id
    chat_config = ChatConfig.load_or_create(logdir, ChatConfig())
    config.chat = chat_config
    set_config(config)

    # Initialize tools in this thread
    init_tools(chat_config.tools)

    # Load .env file if present
    load_dotenv(dotenv_path=workspace / ".env")

    # Load conversation
    manager = LogManager.load(
        conversation_id,
        branch=branch,
        lock=False,
    )

    # Prepare messages for the model
    msgs = prepare_messages(manager.log.messages)
    if not msgs:
        error_event: ErrorEvent = {
            "type": "error",
            "error": "No messages to process",
        }
        SessionManager.add_event(conversation_id, error_event)
        session.generating = False
        return

    # Notify clients about generation status
    SessionManager.add_event(conversation_id, {"type": "generation_started"})

    tool_format = chat_config.tool_format
    tools = None
    if tool_format == "tool":
        tools = [t for t in get_tools() if t.is_runnable]

    try:
        # Stream tokens from the model
        output = ""
        tooluses = []
        for token in (
            char
            for chunk in (_stream if stream else _chat_complete)(msgs, model, tools)
            for char in chunk
        ):
            # check if interrupted
            if not session.generating:
                output += " [INTERRUPTED]"
                break

            output += token

            # Send token to clients
            SessionManager.add_event(
                conversation_id, {"type": "generation_progress", "token": token}
            )

            # Check for complete tool uses on \n
            if "\n" in token:
                if tooluses := list(ToolUse.iter_from_content(output)):
                    break
        else:
            tooluses = list(ToolUse.iter_from_content(output))

        # Persist the assistant message
        msg = Message("assistant", output)
        _append_and_notify(manager, session, msg)
        logger.debug("Persisted assistant message")

        # Signal message generation complete
        logger.debug("Generation complete")
        SessionManager.add_event(
            conversation_id,
            {
                "type": "generation_complete",
                "message": msg2dict(msg, manager.workspace),
            },
        )

        if len(tooluses) > 1:
            logger.warning(
                "Multiple tools per message not yet supported, expect issues"
            )

        # Handle tool use
        for tooluse in tooluses:
            # Create a tool execution record
            tool_id = str(uuid.uuid4())

            tool_exec = ToolExecution(
                tool_id=tool_id,
                tooluse=tooluse,
                auto_confirm=session.auto_confirm_count > 0 or auto_confirm,
            )
            session.pending_tools[tool_id] = tool_exec

            # Notify about pending tool
            SessionManager.add_event(
                conversation_id,
                {
                    "type": "tool_pending",
                    "tool_id": tool_id,
                    "tooluse": {
                        "tool": tooluse.tool,
                        "args": tooluse.args,
                        "content": tooluse.content,
                    },
                    "auto_confirm": tool_exec.auto_confirm,
                },
            )

            # If auto-confirm is enabled, execute the tool
            if tool_exec.auto_confirm:
                if session.auto_confirm_count > 0:
                    session.auto_confirm_count -= 1
                start_tool_execution(
                    conversation_id, session, tool_id, tooluse, model, chat_config
                )

        # Mark session as not generating
        session.generating = False

    except Exception as e:
        logger.exception(f"Error during step execution: {e}")
        SessionManager.add_event(conversation_id, {"type": "error", "error": str(e)})
        session.generating = False


# API Endpoints
# ------------


@v2_api.route("/api/v2")
@api_doc_simple()
def api_root():
    """V2 API root.

    Get information about the v2 API, including available endpoints and capabilities.
    """
    return flask.jsonify(
        {
            "message": "gptme v2 API",
            "documentation": "https://gptme.org/docs/server.html",
        }
    )


@v2_api.route("/api/v2/conversations")
@api_doc_simple(
    responses={200: ConversationListResponse, 500: ErrorResponse},
    tags=["conversations-v2"],
    parameters=[
        {
            "name": "limit",
            "in": "query",
            "schema": {"type": "integer", "default": 100},
            "description": "Maximum number of conversations to return",
        }
    ],
)
def api_conversations():
    """List conversations (V2).

    Get a list of user conversations with metadata using the V2 API.
    """
    limit = int(request.args.get("limit", 100))
    conversations = list(islice(get_user_conversations(), limit))
    return flask.jsonify(conversations)


@v2_api.route("/api/v2/conversations/<string:conversation_id>")
@api_doc_simple(
    responses={200: ConversationResponse, 404: ErrorResponse}, tags=["conversations-v2"]
)
def api_conversation(conversation_id: str):
    """Get conversation (V2).

    Retrieve a conversation with all its messages and metadata using the V2 API.
    """
    # Create and set config
    logdir = get_logs_dir() / conversation_id
    chat_config = ChatConfig.load_or_create(logdir, ChatConfig()).save()

    manager = LogManager.load(conversation_id, lock=False)
    log_dict = manager.to_dict(branches=True)

    # make all paths absolute or relative to workspace (no "../")
    for msg in log_dict["log"]:
        if files := msg.get("files"):
            msg["files"] = [
                _abs_to_rel_workspace(f, chat_config.workspace) for f in files
            ]
    return flask.jsonify(log_dict)


@v2_api.route("/api/v2/conversations/<string:conversation_id>", methods=["PUT"])
@api_doc(
    summary="Create conversation (V2)",
    description="Create a new conversation with initial configuration and messages using the V2 API",
    request_body=dict,  # TODO: Create proper request model
    responses={200: SessionResponse, 409: ErrorResponse, 400: ErrorResponse},
    parameters=[
        {
            "name": "conversation_id",
            "in": "path",
            "required": True,
            "schema": {"type": "string"},
            "description": "Conversation ID",
        }
    ],
    tags=["conversations-v2"],
)
def api_conversation_put(conversation_id: str):
    """Create a new conversation."""
    logdir = get_logs_dir() / conversation_id
    if logdir.exists():
        return (
            flask.jsonify({"error": f"Conversation already exists: {conversation_id}"}),
            409,
        )

    req_json = flask.request.json or {}

    # Create the log directory
    logdir.mkdir(parents=True)

    # Load or create the chat config, overriding values from request config if provided
    request_config = ChatConfig.from_dict(req_json.get("config", {}))
    chat_config = ChatConfig.load_or_create(logdir, request_config)
    prompt = req_json.get("prompt", "full")

    msgs = get_prompt(
        tools=[t for t in get_toolchain(chat_config.tools)],
        interactive=chat_config.interactive,
        tool_format=chat_config.tool_format or "markdown",
        model=chat_config.model,
        prompt=prompt,
        workspace=chat_config.workspace,
    )

    for msg in req_json.get("messages", []):
        timestamp: datetime = (
            datetime.fromisoformat(msg["timestamp"])
            if "timestamp" in msg
            else datetime.now()
        )
        msgs.append(Message(msg["role"], msg["content"], timestamp=timestamp))

    logdir.mkdir(parents=True, exist_ok=True)
    log = LogManager.load(logdir=logdir, initial_msgs=msgs, create=True)
    log.write()

    # Set tool allowlist to available tools if not provided
    if not chat_config.tools:
        chat_config.tools = [t.name for t in get_toolchain(None) if not t.is_mcp]

    if not chat_config.mcp:
        # load from user or project config
        config = Config.from_workspace(chat_config.workspace)
        chat_config.mcp = config.mcp

    # Save the chat config
    chat_config.save()

    # Create a session for this conversation
    session = SessionManager.create_session(conversation_id)

    # Check for auto_confirm parameter and set auto_confirm_count
    if req_json and req_json.get("auto_confirm"):
        session.auto_confirm_count = 999  # High number to essentially make it unlimited

    return flask.jsonify(
        {"status": "ok", "conversation_id": conversation_id, "session_id": session.id}
    )


def msg2dict(msg: Message, workspace: Path) -> MessageDict:
    """Convert a Message object to a dictionary."""
    return {
        "role": msg.role,
        "content": msg.content,
        "timestamp": msg.timestamp.isoformat(),
        "files": [_abs_to_rel_workspace(f, workspace) for f in msg.files],
    }


@v2_api.route("/api/v2/conversations/<string:conversation_id>", methods=["POST"])
@api_doc(
    summary="Add message to conversation (V2)",
    description="Add a new message to an existing conversation using the V2 API",
    request_body=dict,  # TODO: Use proper message request model
    responses={200: StatusResponse, 400: ErrorResponse, 404: ErrorResponse},
    parameters=[
        {
            "name": "conversation_id",
            "in": "path",
            "required": True,
            "schema": {"type": "string"},
            "description": "Conversation ID",
        }
    ],
    tags=["conversations-v2"],
)
def api_conversation_post(conversation_id: str):
    """Append a message to a conversation."""
    req_json = flask.request.json
    if not req_json:
        return flask.jsonify({"error": "No JSON data provided"}), 400

    if "role" not in req_json or "content" not in req_json:
        return flask.jsonify({"error": "Missing required fields (role, content)"}), 400

    branch = req_json.get("branch", "main")
    tool_allowlist = req_json.get("tools", None)

    init_tools(tool_allowlist)

    try:
        log = LogManager.load(conversation_id, branch=branch)
    except FileNotFoundError:
        return (
            flask.jsonify({"error": f"Conversation not found: {conversation_id}"}),
            404,
        )

    msg = Message(
        req_json["role"], req_json["content"], files=req_json.get("files", [])
    )
    log.append(msg)

    # Notify all sessions that a new message was added
    SessionManager.add_event(
        conversation_id,
        {
            "type": "message_added",
            "message": msg2dict(msg, log.workspace),
        },
    )

    return flask.jsonify({"status": "ok"})


@v2_api.route("/api/v2/conversations/<string:conversation_id>", methods=["DELETE"])
@api_doc(
    summary="Delete conversation (V2)",
    description="Delete a conversation and all its data using the V2 API",
    responses={
        200: StatusResponse,
        400: ErrorResponse,
        404: ErrorResponse,
        500: ErrorResponse,
    },
    parameters=[
        {
            "name": "conversation_id",
            "in": "path",
            "required": True,
            "schema": {"type": "string"},
            "description": "Conversation ID",
        }
    ],
    tags=["conversations-v2"],
)
def api_conversation_delete(conversation_id: str):
    """Delete a conversation."""

    # Validate conversation_id to prevent path traversal
    if "/" in conversation_id or ".." in conversation_id or "\\" in conversation_id:
        return flask.jsonify({"error": "Invalid conversation_id"}), 400

    logdir = get_logs_dir() / conversation_id
    assert logdir.parent == get_logs_dir()
    if not logdir.exists():
        return flask.jsonify(
            {"error": f"Conversation not found: {conversation_id}"}
        ), 404

    try:
        shutil.rmtree(logdir)
    except OSError as e:
        logger.error(f"Error deleting conversation {conversation_id}: {e}")
        return flask.jsonify({"error": f"Could not delete conversation: {e}"}), 500

    SessionManager.remove_all_sessions_for_conversation(conversation_id)

    return flask.jsonify({"status": "ok"})


@v2_api.route("/api/v2/conversations/<string:conversation_id>/events")
@api_doc(
    summary="Subscribe to conversation events (V2)",
    description="Subscribe to real-time conversation events via Server-Sent Events stream",
    responses={200: None, 404: ErrorResponse},
    parameters=[
        {
            "name": "conversation_id",
            "in": "path",
            "required": True,
            "schema": {"type": "string"},
            "description": "Conversation ID",
        },
        {
            "name": "session_id",
            "in": "query",
            "required": False,
            "schema": {"type": "string"},
            "description": "Session ID (creates new session if not provided)",
        },
    ],
    tags=["sessions"],
)
def api_conversation_events(conversation_id: str):
    """Subscribe to conversation events."""
    session_id = request.args.get("session_id")
    if not session_id:
        # Create a new session if none provided
        session = SessionManager.create_session(conversation_id)
        session_id = session.id
    else:
        session_obj = SessionManager.get_session(session_id)
        if session_obj is None:
            return flask.jsonify({"error": f"Session not found: {session_id}"}), 404
        session = session_obj

    # Generate event stream
    def generate_events() -> Generator[str, None, None]:
        client_id = str(uuid.uuid4())
        try:
            # Add this client to the session
            session.clients.add(client_id)

            # Send initial connection event
            yield f"data: {flask.json.dumps({'type': 'connected', 'session_id': session_id})}\n\n"

            # Send immediate ping to ensure connection is established right away
            yield f"data: {flask.json.dumps({'type': 'ping'})}\n\n"

            # Create an event queue
            last_event_index = 0

            while True:
                # Check if there are new events
                if last_event_index < (new_index := len(session.events)):
                    # Send any new events
                    for event in session.events[last_event_index:new_index]:
                        yield f"data: {flask.json.dumps(event)}\n\n"
                    last_event_index = new_index

                # Wait a bit before checking again
                yield f"data: {flask.json.dumps({'type': 'ping'})}\n\n"

                # Use event.wait() with timeout to avoid busy waiting while allowing ping intervals
                # 15s timeout for connection keep-alive
                session.event_flag.wait(timeout=15)
                session.event_flag.clear()

        except GeneratorExit:
            # Client disconnected
            if session:
                session.clients.discard(client_id)
                if not session.clients:
                    # If no clients are connected, mark the session for cleanup
                    session.active = False
            raise

    return flask.Response(
        generate_events(),
        mimetype="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",  # Disable buffering in nginx
        },
    )


@v2_api.route("/api/v2/conversations/<string:conversation_id>/step", methods=["POST"])
@api_doc(
    summary="Take conversation step (V2)",
    description="Take a step in the conversation - generate a response or continue after tool execution",
    request_body=StepRequest,
    responses={
        200: StatusResponse,
        400: ErrorResponse,
        404: ErrorResponse,
        409: ErrorResponse,
    },
    parameters=[
        {
            "name": "conversation_id",
            "in": "path",
            "required": True,
            "schema": {"type": "string"},
            "description": "Conversation ID",
        }
    ],
    tags=["sessions"],
)
def api_conversation_step(conversation_id: str):
    """Take a step in the conversation - generate a response or continue after tool execution."""
    req_json = flask.request.json or {}
    session_id = req_json.get("session_id")
    auto_confirm_int_or_bool: int | bool = req_json.get("auto_confirm", False)

    if not session_id:
        return flask.jsonify({"error": "session_id is required"}), 400

    session = SessionManager.get_session(session_id)
    if session is None:
        return flask.jsonify({"error": f"Session not found: {session_id}"}), 404

    logdir = get_logs_dir() / conversation_id
    chat_config = ChatConfig.load_or_create(logdir, ChatConfig())

    stream = req_json.get("stream", chat_config.stream)

    # if auto_confirm set, set auto_confirm_count
    if isinstance(auto_confirm_int_or_bool, int):
        session.auto_confirm_count = auto_confirm_int_or_bool
    elif isinstance(auto_confirm_int_or_bool, bool):
        session.auto_confirm_count = 1 if auto_confirm_int_or_bool else -1
    auto_confirm = bool(session.auto_confirm_count > 0)

    if session.generating:
        return flask.jsonify({"error": "Generation already in progress"}), 409

    # Get the branch and model
    branch = req_json.get("branch", "main")
    default_model = get_default_model()
    assert (
        default_model is not None
    ), "No model loaded and no model specified in request"
    model = req_json.get("model", chat_config.model or default_model.full)

    # Start step execution in a background thread
    _start_step_thread(
        conversation_id=conversation_id,
        session=session,
        model=model,
        workspace=chat_config.workspace,
        branch=branch,
        auto_confirm=auto_confirm,
        stream=stream,
    )

    return flask.jsonify(
        {"status": "ok", "message": "Step started", "session_id": session_id}
    )


@v2_api.route(
    "/api/v2/conversations/<string:conversation_id>/tool/confirm", methods=["POST"]
)
@api_doc(
    summary="Confirm tool execution (V2)",
    description="Confirm, edit, skip, or auto-confirm a pending tool execution",
    request_body=ToolConfirmRequest,
    responses={200: StatusResponse, 400: ErrorResponse, 404: ErrorResponse},
    parameters=[
        {
            "name": "conversation_id",
            "in": "path",
            "required": True,
            "schema": {"type": "string"},
            "description": "Conversation ID",
        }
    ],
    tags=["sessions"],
)
def api_conversation_tool_confirm(conversation_id: str):
    """Confirm or modify a tool execution."""

    req_json = flask.request.json or {}
    session_id = req_json.get("session_id")
    tool_id = req_json.get("tool_id")
    action = req_json.get("action")

    if not session_id or not tool_id or not action:
        return (
            flask.jsonify({"error": "session_id, tool_id, and action are required"}),
            400,
        )

    session = SessionManager.get_session(session_id)
    if session is None:
        return flask.jsonify({"error": f"Session not found: {session_id}"}), 404

    if tool_id not in session.pending_tools:
        return flask.jsonify({"error": f"Tool not found: {tool_id}"}), 404

    tool_exec = session.pending_tools[tool_id]

    logdir = get_logs_dir() / conversation_id
    chat_config = ChatConfig.load_or_create(logdir, ChatConfig())

    # Get model from session config, default model, or fallback to "anthropic"
    default_model = get_default_model()
    model = chat_config.model or (default_model.full if default_model else "anthropic")

    if action == "confirm":
        # Execute the tool
        tooluse = tool_exec.tooluse

        logger.info(f"Executing runnable tooluse: {tooluse}")
        start_tool_execution(
            conversation_id, session, tool_id, tooluse, model, chat_config
        )
        return flask.jsonify({"status": "ok", "message": "Tool confirmed"})

    elif action == "edit":
        # Edit and then execute the tool
        edited_content = req_json.get("content")
        if not edited_content:
            return flask.jsonify({"error": "content is required for edit action"}), 400

        # Execute with edited content
        start_tool_execution(
            conversation_id,
            session,
            tool_id,
            dataclasses.replace(tool_exec.tooluse, content=edited_content),
            model,
            chat_config,
        )

    elif action == "skip":
        # Skip the tool execution
        tool_exec.status = ToolStatus.SKIPPED
        del session.pending_tools[tool_id]

        msg = Message("system", f"Skipped tool {tool_id}")
        _append_and_notify(LogManager.load(conversation_id, lock=False), session, msg)

        # Resume generation
        _start_step_thread(conversation_id, session, model, chat_config.workspace)

    elif action == "auto":
        # Enable auto-confirmation for future tools
        count = req_json.get("count", 1)
        if count <= 0:
            return flask.jsonify({"error": "count must be positive"}), 400

        session.auto_confirm_count = count

        # Also confirm this tool
        start_tool_execution(
            conversation_id, session, tool_id, tool_exec.tooluse, model, chat_config
        )
    else:
        return flask.jsonify({"error": f"Unknown action: {action}"}), 400

    return flask.jsonify({"status": "ok", "message": f"Tool {action}ed"})


@v2_api.route(
    "/api/v2/conversations/<string:conversation_id>/interrupt", methods=["POST"]
)
@api_doc(
    summary="Interrupt conversation (V2)",
    description="Interrupt the current generation or tool execution in a conversation",
    request_body=InterruptRequest,
    responses={200: StatusResponse, 400: ErrorResponse, 404: ErrorResponse},
    parameters=[
        {
            "name": "conversation_id",
            "in": "path",
            "required": True,
            "schema": {"type": "string"},
            "description": "Conversation ID",
        }
    ],
    tags=["sessions"],
)
def api_conversation_interrupt(conversation_id: str):
    """Interrupt the current generation or tool execution."""
    req_json = flask.request.json or {}
    session_id = req_json.get("session_id")

    if not session_id:
        return flask.jsonify({"error": "session_id is required"}), 400

    session = SessionManager.get_session(session_id)
    if session is None:
        return flask.jsonify({"error": f"Session not found: {session_id}"}), 404

    if not session.generating and not session.pending_tools:
        return (
            flask.jsonify(
                {"error": "No active generation or tool execution to interrupt"}
            ),
            400,
        )

    # Mark session as not generating
    session.generating = False

    # Clear pending tools
    session.pending_tools.clear()

    # Notify about interruption
    SessionManager.add_event(conversation_id, {"type": "interrupted"})

    return flask.jsonify({"status": "ok", "message": "Interrupted"})


@v2_api.route("/api/v2/conversations/<string:conversation_id>/config", methods=["GET"])
def api_conversation_config(conversation_id: str):
    """Get the chat config for a conversation."""
    logdir = get_logs_dir() / conversation_id
    chat_config_path = logdir / "config.toml"
    if chat_config_path.exists():
        chat_config = ChatConfig.from_logdir(logdir)
        return flask.jsonify(chat_config.to_dict())
    else:
        return (
            flask.jsonify({"error": f"Chat config not found: {conversation_id}"}),
            404,
        )


@v2_api.route(
    "/api/v2/conversations/<string:conversation_id>/config", methods=["PATCH"]
)
def api_conversation_config_patch(conversation_id: str):
    """Update the chat config for a conversation."""
    req_json = flask.request.json
    if not req_json:
        return flask.jsonify({"error": "No JSON data provided"}), 400

    logdir = get_logs_dir() / conversation_id

    # Create and set config
    request_config = ChatConfig.from_dict(req_json)
    chat_config = ChatConfig.load_or_create(logdir, request_config).save()
    config = Config.from_workspace(workspace=chat_config.workspace)
    config.chat = chat_config
    set_config(config)

    # Initialize tools in this thread
    init_tools(chat_config.tools)

    tools = get_tools()

    # Update system prompt with new tools
    manager = LogManager.load(conversation_id, lock=False)
    if len(manager.log.messages) >= 1 and manager.log.messages[0].role == "system":
        # Remove existing system messages and replace with new ones
        while manager.log.messages and manager.log.messages[0].role == "system":
            manager.log.messages.pop(0)

        # Insert new system messages at the beginning
        new_system_msgs = get_prompt(
            tools=tools,
            tool_format=chat_config.tool_format or "markdown",
            interactive=chat_config.interactive,
            model=chat_config.model,
            workspace=chat_config.workspace,
        )
        for i, msg in enumerate(new_system_msgs):
            manager.log.messages.insert(i, msg)
    manager.write()

    return flask.jsonify(
        {
            "status": "ok",
            "message": "Chat config updated",
            "config": chat_config.to_dict(),
            "tools": [t.name for t in tools],
        }
    )


# Helper functions
# ---------------


def start_tool_execution(
    conversation_id: str,
    session: ConversationSession,
    tool_id: str,
    edited_tooluse: ToolUse | None,
    model: str,
    chat_config: ChatConfig,
) -> threading.Thread:
    """Execute a tool and handle its output."""

    # This function would ideally run asynchronously to not block the request
    # For simplicity, we'll run it in a thread
    def execute_tool_thread():
        config = Config.from_workspace(workspace=chat_config.workspace)
        config.chat = chat_config
        set_config(config)

        # Initialize tools in this thread
        init_tools(None)

        # Load .env file if present
        load_dotenv(dotenv_path=chat_config.workspace / ".env")

        # Load the conversation
        manager = LogManager.load(conversation_id, lock=False)

        tool_exec = session.pending_tools[tool_id]
        tool_exec.status = ToolStatus.EXECUTING

        # use explicit tooluse if set (may be modified), else use the one from the pending tool
        tooluse: ToolUse = edited_tooluse or tool_exec.tooluse

        # Remove the tool from pending
        if tool_id in session.pending_tools:
            del session.pending_tools[tool_id]

        # Notify about tool execution
        SessionManager.add_event(
            conversation_id, {"type": "tool_executing", "tool_id": tool_id}
        )
        logger.info(f"Tool {tool_id} executing")

        # Execute the tool
        try:
            logger.info(f"Executing tool: {tooluse.tool}")
            tool_outputs = list(tooluse.execute(lambda _: True))
            logger.info(f"Tool execution complete, outputs: {len(tool_outputs)}")

            # Store the tool outputs
            for tool_output in tool_outputs:
                _append_and_notify(manager, session, tool_output)
        except Exception as e:
            logger.exception(f"Error executing tool {tooluse.__class__.__name__}: {e}")
            tool_exec.status = ToolStatus.FAILED

            msg = Message("system", f"Error: {str(e)}")
            _append_and_notify(manager, session, msg)

        # This implements auto-stepping similar to the CLI behavior
        _start_step_thread(conversation_id, session, model, chat_config.workspace)

    # Start execution in a thread
    thread = threading.Thread(target=execute_tool_thread)
    thread.daemon = True
    thread.start()
    return thread


def _start_step_thread(
    conversation_id: str,
    session: ConversationSession,
    model: str,
    workspace: Path,
    branch: str = "main",
    auto_confirm: bool = False,
    stream: bool = True,
):
    """Start a step execution in a background thread."""

    def step_thread():
        try:
            # Mark session as generating
            session.generating = True

            step(
                conversation_id=conversation_id,
                session=session,
                model=model,
                workspace=workspace,
                branch=branch,
                auto_confirm=auto_confirm,
                stream=stream,
            )

        except Exception as e:
            logger.exception(f"Error during step execution: {e}")
            SessionManager.add_event(
                conversation_id, {"type": "error", "error": str(e)}
            )
            session.generating = False

    # Start step execution in a thread
    thread = threading.Thread(target=step_thread)
    thread.daemon = True
    thread.start()
