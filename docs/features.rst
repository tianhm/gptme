Features
========

gptme is a personal AI agent in your terminal with tools to run shell commands, write code, edit files, browse the web, use vision, and much more. A great coding agent, but general-purpose enough to assist in all kinds of knowledge-work.

An unconstrained local free and open-source alternative to Claude Code, Codex, Cursor Agents, etc. One of the first agent CLIs created (Spring 2023) — and still in very active development.

.. contents:: Table of Contents
   :depth: 2
   :local:
   :backlinks: none

Core Capabilities
-----------------

💻 Code Execution
^^^^^^^^^^^^^^^^

Execute code in your local environment with full access to your installed tools and libraries.

- **Shell**: Run any command in a stateful bash session — install packages, run builds, manage git, and more.
- **Python**: Interactive IPython sessions with access to your installed libraries (numpy, pandas, matplotlib, etc.).
- **Self-correcting**: Output is fed back to the assistant, letting it detect errors and retry automatically.

See :doc:`tools` for the full list of execution tools.

🧩 File Operations
^^^^^^^^^^^^^^^^^

Read, write, and make precise edits to files.

- **Read** any file format — code, config, data, etc.
- **Save** to create or overwrite files.
- **Patch** for surgical edits to existing files using conflict markers.
- **Morph** for fast AI-powered edits via a specialized apply model.

See the file tools in :doc:`tools` for details.

🌐 Web Browsing & Search
^^^^^^^^^^^^^^^^^^^^^^^

Search the web and read pages, PDFs, and documentation.

- **Search** Google, DuckDuckGo, or Perplexity from the terminal.
- **Read** web pages and PDFs as clean text.
- **Screenshot** web pages for visual analysis.
- Full browser automation via Playwright.

See the :ref:`Browser <tools:Browser>` tool.

👀 Vision
^^^^^^^^

Analyze images, screenshots, and visual content.

- View images referenced in prompts.
- Take and analyze screenshots of your desktop.
- Inspect web page screenshots.
- Process diagrams, charts, mockups, and more.

See the :ref:`Vision <tools:Vision>` and :ref:`Screenshot <tools:Screenshot>` tools.

🖥️ Computer Use
^^^^^^^^^^^^^^^

Give the assistant access to a full desktop environment, allowing it to interact with GUI applications through mouse and keyboard control.

See :doc:`tools` for the Computer tool documentation and the `computer use tracking issue <https://github.com/gptme/gptme/issues/216>`_.


Interfaces
----------

🖥️ Terminal (CLI)
^^^^^^^^^^^^^^^^^

The primary interface — a powerful terminal chat with:

- Syntax highlighting and diff display
- Tab completion
- Command history
- Slash-commands for common actions (``/undo``, ``/edit``, ``/tokens``, etc.)
- Keyboard shortcuts (Ctrl+X Ctrl+E to edit in ``$EDITOR``, Ctrl+J for newlines)

See :doc:`usage` and :doc:`cli` for the full reference.

🌐 Web UI
^^^^^^^^

A modern React-based web interface available at `chat.gptme.org <https://chat.gptme.org>`_.

- Chat with gptme from your browser
- Access to all tools and features
- Self-hostable by running ``gptme-server`` + ``gptme-webui``

See :doc:`server` for setup instructions.

🔌 REST API
^^^^^^^^^^

A server component exposes gptme as a REST API for programmatic access and integration with other tools.

See :doc:`server` for the API documentation.

📝 Editor Integration
^^^^^^^^^^^^^^^^^^^^

- **ACP (Agent Client Protocol)**: Use gptme as a coding agent in Zed and JetBrains IDEs. See :doc:`acp`.
- **gptme.vim**: Vim plugin for in-editor integration. See `gptme.vim <https://github.com/gptme/gptme.vim>`_.


LLM Support
-----------

gptme works with a wide range of LLM providers and models:

- **Anthropic** — Claude (Sonnet, Opus, Haiku)
- **OpenAI** — GPT-4o, GPT-4, o1, o3
- **Google** — Gemini
- **xAI** — Grok
- **DeepSeek** — DeepSeek R1 and others
- **OpenRouter** — Access 100+ models through a single API
- **Local models** — Run models locally via ``llama.cpp`` (no API key required)

See :doc:`providers` for setup instructions and model configuration.


Extensibility
-------------

gptme has a layered extensibility system that lets you tailor it to your workflow. See :doc:`concepts` for the full architecture overview.

📚 Lessons
^^^^^^^^^

Contextual guidance that auto-injects into conversations based on keywords, tools, and patterns. Write your own to capture team best-practices or domain knowledge.

See :doc:`lessons`.

🧠 Skills
^^^^^^^^

Lightweight workflow bundles (Anthropic format) that auto-load when mentioned by name. Great for packaging reusable instructions and helper scripts.

See :doc:`skills`.

🔧 Plugins
^^^^^^^^^

Extend gptme with custom tools, hooks, and commands via Python packages.

.. code-block:: toml

   # gptme.toml
   [plugins]
   paths = ["~/.config/gptme/plugins", "./plugins"]
   enabled = ["my_plugin"]

See :doc:`plugins`.

🪝 Hooks
^^^^^^^

Run custom code at key lifecycle events (before/after tool calls, on file save, etc.) without writing a full plugin.

See :doc:`hooks`.

🔗 MCP (Model Context Protocol)
^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^

Use any MCP-compatible server as a tool source — databases, APIs, file systems, and more. gptme can discover and dynamically load MCP servers at runtime.

See :doc:`mcp`.

📦 Community Extensions
^^^^^^^^^^^^^^^^^^^^^^

`gptme-contrib <https://github.com/gptme/gptme-contrib>`_ hosts community-contributed plugins, scripts, and lessons:

- **gptme-consortium** — multi-model consensus decision-making
- **gptme-imagen** — multi-provider image generation
- **gptme-lsp** — Language Server Protocol integration
- **gptme-ace** — ACE-inspired context optimization
- **gptme-gupp** — work state persistence across sessions


Autonomous Agents
-----------------

gptme is designed to run not just interactively, but as a **persistent autonomous agent**. The `gptme-agent-template <https://github.com/gptme/gptme-agent-template>`_ provides a complete scaffold:

- **Persistent workspace** — git-tracked "brain" across sessions
- **Run loops** — scheduled or event-driven autonomous operation
- **Task management** — structured task queue with GTD-style metadata
- **Meta-learning** — lessons system captures patterns and improves over time
- **Multi-agent coordination** — file leases, message bus, and work claiming for concurrent agents

`Bob <https://github.com/TimeToBuildBob>`_ is the reference implementation — an autonomous AI agent that has completed 1000+ sessions, contributes to open source, and manages its own tasks.

See :doc:`agents` for more on building autonomous agents.


Automation & CI
---------------

gptme supports several automation modes:

- ``gptme -y`` — auto-approve tool confirmations (user can still watch and interrupt)
- ``gptme -n`` — fully non-interactive/autonomous mode (safe for scripts and CI)
- **GitHub Bot** — request changes from PR and issue comments, runs in GitHub Actions
- **Subagent spawning** — delegate subtasks to parallel agent instances via tmux

See :doc:`bot` for the GitHub bot and :doc:`usage` for automation patterns.


Quality of Life
---------------

- 🗣️ **Text-to-Speech** — locally generated using Kokoro (no cloud required). See the :ref:`TTS <tools:TTS>` tool.
- 🔊 **Tool sounds** — pleasant notification sounds for tool operations (enable with ``GPTME_TOOL_SOUNDS=true``).
- 🔄 **Auto-commit** — optionally commit changes automatically after tool execution.
- 📋 **Pre-commit hooks** — automatic checks on file saves.
- 💰 **Cost tracking** — monitor token usage and costs with ``/tokens``.
- 🗜️ **Context compression** — automatic conversation compaction to stay within context limits.
- 📜 **Conversation management** — search, fork, rename, export, and replay conversations.
