Message Control Protocol (MCP)
==============================

gptme supports MCP servers, allowing integration with external tools and services through a standardized protocol.

Configuration
-------------

You can configure MCP in your ``~/.config/gptme/config.toml`` file:

.. code-block:: toml

    [mcp]
    enabled = true
    auto_start = true

    [[mcp.servers]]
    name = "my-server"
    enabled = true
    command = "server-command"
    args = ["--arg1", "--arg2"]
    env = { API_KEY = "your-key" }

Configuration Options
~~~~~~~~~~~~~~~~~~~~~

- ``enabled``: Enable/disable MCP support globally
- ``auto_start``: Automatically start MCP servers when needed
- ``servers``: List of MCP server configurations

  - ``name``: Unique identifier for the server
  - ``enabled``: Enable/disable individual server
  - ``command``: Command to start the server
  - ``args``: List of command-line arguments
  - ``env``: Environment variables for the server

Example Configuration
~~~~~~~~~~~~~~~~~~~~~

Here's a complete example showing how to configure an MCP weather service:

.. code-block:: toml

    [mcp]
    enabled = true
    auto_start = true

    [[mcp.servers]]
    name = "weatherAPI"
    enabled = true
    command = "uvx"
    args = [
        "--from",
        "git+https://github.com/adhikasp/mcp-weather.git",
        "mcp-weather"
    ]
    env = { WEATHER_API_KEY = "your-api-key" }

MCP servers can be used to extend gptme's capabilities with custom tools and integrations. Each server can provide its own set of tools that become available to the AI assistant during conversations.
