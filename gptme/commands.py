import logging
import re
import sys
from collections.abc import Callable, Generator
from dataclasses import dataclass
from pathlib import Path
from time import sleep
from typing import Literal

from . import llm
from .constants import INTERRUPT_CONTENT
from .llm.models import get_default_model, set_default_model
from .logmanager import LogManager, prepare_messages
from .message import (
    Message,
    len_tokens,
    msgs_to_toml,
    print_msg,
    toml_to_msgs,
)
from .setup import setup
from .tools import (
    ConfirmFunc,
    ToolUse,
    execute_msg,
    get_tool_format,
    get_tools,
)
from .util.cost import log_costs
from .util.export import export_chat_to_html
from .util.useredit import edit_text_with_editor

logger = logging.getLogger(__name__)

Actions = Literal[
    "log",
    "undo",
    "edit",
    "rename",
    "fork",
    "tools",
    "model",
    "replay",
    "impersonate",
    "summarize",
    "tokens",
    "export",
    "commit",
    "setup",
    "help",
    "exit",
]

action_descriptions: dict[Actions, str] = {
    "undo": "Undo the last action",
    "log": "Show the conversation log",
    "tools": "Show available tools",
    "model": "List or switch models",
    "edit": "Edit the conversation in your editor",
    "rename": "Rename the conversation",
    "fork": "Copy the conversation using a new name",
    "summarize": "Summarize the conversation",
    "replay": "Rerun tools in the conversation, won't store output",
    "impersonate": "Impersonate the assistant",
    "tokens": "Show the number of tokens used",
    "export": "Export conversation as HTML",
    "commit": "Commit staged changes to git",
    "setup": "Setup gptme with completions and configuration",
    "help": "Show this help message",
    "exit": "Exit the program",
}
COMMANDS = list(action_descriptions.keys())


# Command registry


@dataclass
class CommandContext:
    """Context object containing all command handler parameters."""

    args: list[str]
    full_args: str
    manager: LogManager
    confirm: ConfirmFunc


# Original handler type (before decoration)
OriginalCommandHandler = (
    Callable[[CommandContext], Generator[Message, None, None]]
    | Callable[[CommandContext], None]
)

# Wrapped handler type (after decoration - always returns generator)
CommandHandler = Callable[[CommandContext], Generator[Message, None, None]]

_command_registry: dict[str, CommandHandler] = {}


def command(name: str, aliases: list[str] | None = None):
    """Decorator to register command handlers."""

    def decorator(func: OriginalCommandHandler) -> OriginalCommandHandler:
        def wrapper(ctx: CommandContext) -> Generator[Message, None, None]:
            result = func(ctx)
            if result is not None:
                # It's a generator, yield from it
                yield from result
            # If it's not a generator, we just don't yield anything

        _command_registry[name] = wrapper
        if aliases:
            for alias in aliases:
                _command_registry[alias] = wrapper
        return func

    return decorator


@command("log")
def cmd_log(ctx: CommandContext) -> None:
    """Show the conversation log."""
    ctx.manager.undo(1, quiet=True)
    ctx.manager.log.print(show_hidden="--hidden" in ctx.args)


@command("rename")
def cmd_rename(ctx: CommandContext) -> None:
    """Rename the conversation."""
    ctx.manager.undo(1, quiet=True)
    ctx.manager.write()
    # rename the conversation
    print("Renaming conversation")
    if ctx.args:
        new_name = ctx.args[0]
    else:
        print("(enter empty name to auto-generate)")
        new_name = input("New name: ").strip()
    rename(ctx.manager, new_name, ctx.confirm)


@command("fork")
def cmd_fork(ctx: CommandContext) -> None:
    """Fork the conversation."""
    new_name = ctx.args[0] if ctx.args else input("New name: ")
    ctx.manager.fork(new_name)


@command("summarize")
def cmd_summarize(ctx: CommandContext) -> None:
    """Summarize the conversation."""
    ctx.manager.undo(1, quiet=True)
    msgs = prepare_messages(ctx.manager.log.messages)
    msgs = [m for m in msgs if not m.hide]
    print_msg(llm.summarize(msgs))


@command("edit")
def cmd_edit(ctx: CommandContext) -> Generator[Message, None, None]:
    """Edit previous messages."""
    # first undo the '/edit' command itself
    ctx.manager.undo(1, quiet=True)
    yield from edit(ctx.manager)


@command("undo")
def cmd_undo(ctx: CommandContext) -> None:
    """Undo the last action(s)."""
    # undo the '/undo' command itself
    ctx.manager.undo(1, quiet=True)
    # if int, undo n messages
    n = int(ctx.args[0]) if ctx.args and ctx.args[0].isdigit() else 1
    ctx.manager.undo(n)


@command("exit")
def cmd_exit(ctx: CommandContext) -> None:
    """Exit the program."""
    ctx.manager.undo(1, quiet=True)
    ctx.manager.write()
    sys.exit(0)


@command("replay")
def cmd_replay(ctx: CommandContext) -> None:
    """Replay the conversation."""
    ctx.manager.undo(1, quiet=True)
    ctx.manager.write()
    print("Replaying conversation...")
    for msg in ctx.manager.log:
        if msg.role == "assistant":
            for reply_msg in execute_msg(msg, ctx.confirm):
                print_msg(reply_msg, oneline=False)


@command("impersonate")
def cmd_impersonate(ctx: CommandContext) -> Generator[Message, None, None]:
    """Impersonate the assistant."""
    content = ctx.full_args if ctx.full_args else input("[impersonate] Assistant: ")
    msg = Message("assistant", content)
    yield msg
    yield from execute_msg(msg, confirm=lambda _: True)


@command("tokens")
def cmd_tokens(ctx: CommandContext) -> None:
    """Show token usage."""
    ctx.manager.undo(1, quiet=True)
    log_costs(ctx.manager.log.messages)


@command("tools")
def cmd_tools(ctx: CommandContext) -> None:
    """Show available tools."""
    ctx.manager.undo(1, quiet=True)
    print("Available tools:")
    for tool in get_tools():
        print(
            f"""
  # {tool.name}
    {tool.desc.rstrip(".")}
    tokens (example): {len_tokens(tool.get_examples(get_tool_format()), "gpt-4")}"""
        )


@command("model", aliases=["models"])
def cmd_model(ctx: CommandContext) -> None:
    """List or switch models."""
    ctx.manager.undo(1, quiet=True)
    if ctx.args:
        set_default_model(ctx.args[0])
        print(f"Set model to {ctx.args[0]}")
    else:
        model = get_default_model()
        assert model
        print(f"Current model: {model.full}")
        print(
            f"  price: input ${model.price_input}/Mtok, output ${model.price_output}/Mtok"
        )
        print(f"  context: {model.context}, max output: {model.max_output}")
        print(
            f"  (streaming: {model.supports_streaming}, vision: {model.supports_vision})"
        )

        print_available_models()


@command("export")
def cmd_export(ctx: CommandContext) -> None:
    """Export conversation as HTML."""
    ctx.manager.undo(1, quiet=True)
    ctx.manager.write()
    # Get output path from args or use default
    output_path = (
        Path(ctx.args[0])
        if ctx.args
        else Path(f"{ctx.manager.logfile.parent.name}.html")
    )
    # Export the chat
    export_chat_to_html(ctx.manager.name, ctx.manager.log, output_path)
    print(f"Exported conversation to {output_path}")


@command("commit")
def cmd_commit(ctx: CommandContext) -> Generator[Message, None, None]:
    """Commit staged changes to git."""
    ctx.manager.undo(1, quiet=True)
    from .util.context import autocommit

    yield autocommit()


@command("setup")
def cmd_setup(ctx: CommandContext) -> None:
    """Setup gptme with completions, configuration, and project setup."""
    ctx.manager.undo(1, quiet=True)
    ctx.manager.write()
    setup()


@command("help")
def cmd_help(ctx: CommandContext) -> None:
    """Show help message."""
    ctx.manager.undo(1, quiet=True)
    ctx.manager.write()
    help()


def execute_cmd(msg: Message, log: LogManager, confirm: ConfirmFunc) -> bool:
    """Executes any user-command, returns True if command was executed."""
    assert msg.role == "user"

    # if message starts with / treat as command
    # when command has been run,
    if msg.content[:1] in ["/"]:
        for resp in handle_cmd(msg.content, log, confirm):
            log.append(resp)
        return True
    return False


def handle_cmd(
    cmd: str,
    manager: LogManager,
    confirm: ConfirmFunc,
) -> Generator[Message, None, None]:
    """Handles a command."""
    cmd = cmd.lstrip("/")
    logger.debug(f"Executing command: {cmd}")
    name, *args = re.split(r"[\n\s]", cmd)
    full_args = cmd.split(" ", 1)[1] if " " in cmd else ""

    # Check if command is registered
    if name in _command_registry:
        ctx = CommandContext(
            args=args, full_args=full_args, manager=manager, confirm=confirm
        )
        yield from _command_registry[name](ctx)
        return

    # Fallback to tool execution
    tooluse = ToolUse(name, [], full_args)
    if tooluse.is_runnable:
        yield from tooluse.execute(confirm)
    else:
        manager.undo(1, quiet=True)
        print("Unknown command")


def edit(manager: LogManager) -> Generator[Message, None, None]:  # pragma: no cover
    # generate editable toml of all messages
    t = msgs_to_toml(reversed(manager.log))  # type: ignore
    res = None
    while not res:
        t = edit_text_with_editor(t, "toml")
        try:
            res = toml_to_msgs(t)
        except Exception as e:
            print(f"\nFailed to parse TOML: {e}")
            try:
                sleep(1)
            except KeyboardInterrupt:
                yield Message("system", INTERRUPT_CONTENT)
                return
    manager.edit(list(reversed(res)))
    print("Applied edited messages, write /log to see the result")


def rename(manager: LogManager, new_name: str, confirm: ConfirmFunc) -> None:
    from .config import ChatConfig

    if new_name in ["", "auto"]:
        msgs = prepare_messages(manager.log.messages)[1:]  # skip system message
        new_name = llm.generate_name(msgs)
        assert " " not in new_name, f"Invalid name: {new_name}"
        print(f"Generated name: {new_name}")
        if not confirm("Confirm?"):
            print("Aborting")
            return

    # Load or create chat config and update the name
    chat_config = ChatConfig.from_logdir(manager.logdir)
    chat_config.name = new_name
    chat_config.save()

    print(f"Renamed conversation to: {new_name}")


def _gen_help(incl_langtags: bool = True) -> Generator[str, None, None]:
    yield "Available commands:"
    max_cmdlen = max(len(cmd) for cmd in COMMANDS)
    for cmd, desc in action_descriptions.items():
        yield f"  /{cmd.ljust(max_cmdlen)}  {desc}"

    yield "\b"
    yield "Keyboard shortcuts:"
    yield "  Ctrl+X Ctrl+E  Edit prompt in your editor"
    yield "  Ctrl+J         Insert a new line without executing the prompt"

    if incl_langtags:
        yield ""
        yield "To execute code with supported tools, use the following syntax:"
        yield "  /<langtag> <code>"
        yield ""
        yield "Example:"
        yield "  /sh echo hello"
        yield "  /python print('hello')"
        yield ""
        yield "Supported langtags:"
        for tool in get_tools():
            if tool.block_types:
                yield f"  - {tool.block_types[0]}" + (
                    f"  (alias: {', '.join(tool.block_types[1:])})"
                    if len(tool.block_types) > 1
                    else ""
                )


def help():
    for line in _gen_help():
        print(line)


def print_available_models() -> None:
    """Print all available models from all providers."""
    from .llm.models import list_models

    list_models(dynamic_fetch=True)


def get_user_commands() -> list[str]:
    """Returns a list of all user commands"""
    commands = [f"/{cmd}" for cmd in action_descriptions.keys()]

    # check if command is valid tooluse
    # TODO: check for registered tools instead of hardcoding
    commands.extend(["/python", "/shell"])

    return commands
