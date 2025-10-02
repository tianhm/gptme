"""Complete tool - signals that the autonomous session is finished."""

from ..message import Message
from .base import ConfirmFunc, ToolSpec


def execute_complete(
    code: str | None,
    args: list[str] | None,
    kwargs: dict[str, str] | None,
    confirm: ConfirmFunc,
) -> Message:
    """Signal that the autonomous session is complete and ready to exit."""
    return Message(
        "system",
        "Task complete. Autonomous session finished.",
        quiet=False,
    )


tool = ToolSpec(
    name="complete",
    desc="Signal that the autonomous session is finished",
    instructions="""
Use this tool to signal that you have completed your work and the autonomous session should end.

This is the proper way to finish an autonomous session instead of using sys.exit(0).
""",
    examples="""
> User: Make sure to finish when you're done
> Assistant: I'll complete the task and use the complete tool.
```complete
```
> System: Task complete. Autonomous session finished.
""",
    execute=execute_complete,
    block_types=["complete"],
    available=True,
)
