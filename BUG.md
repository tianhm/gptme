# Streaming Bug Investigation

## Problem

Anthropic streaming is broken - getting non-streaming timeout error:
ValueError: Streaming is strongly recommended for operations that may take longer than 10 minutes.

## Symptoms

- Anthropic API calls fail with streaming timeout warning
- Happens with simple commands: `gptme 'hello'`
- Traceback shows non-streaming path being used:
  ```
  File "/home/bob/gptme/gptme/llm/__init__.py", line 75, in reply
      response = _chat_complete(messages, model, tools)
  ```

## Key Discovery

**Root Cause**: Saved configs have `stream = false` even though defaults are `stream = true`

Example fresh conversation config:
```toml
[chat]
stream = false  # <-- WRONG! Should be true
interactive = false
```

## Investigation Timeline

### 1. Initial Hypothesis (WRONG)
- Thought it was pre-existing issue
- Believed it only happened in non-interactive mode
- **User confirmed**: Happens even with `interactive = true` in full terminal

### 2. Config Override Attempt (FAILED)
- Added "stream" to special fields list in config.py (`c1571069`)
- Attempted to force CLI defaults to override saved configs
- **Result**: Completely ineffective, even fresh conversations get `stream = false`
- **Reverted**: `001afd13`

### 3. Current Understanding

**Defaults are correct**:
- CLI default: `stream = True` (from `--no-stream` option, default=True)
- ChatConfig default: `stream: bool = True` (in dataclass)
- setup_config_from_cli signature: `stream: bool = True`

**But saved configs have `stream = false`**:
- Fresh conversations immediately save with `stream = false`
- This happens even with all defaults set to True

**Conclusion**: Something between config creation and `config.chat.save()` is setting `stream = false`

## Investigation Areas

### Checked (Not the issue)
- ✅ CLI defaults - correct (True)
- ✅ ChatConfig defaults - correct (True)
- ✅ Model support check in chat.py - not triggered (Anthropic supports streaming)
- ✅ Interactive mode connection - user confirms happens with interactive=True too

### Not Yet Checked
- ❓ Where/when does the config get modified before save?
- ❓ Is there some default that overrides the parameter defaults?
- ❓ Is there initialization code that sets stream=false?
- ❓ Is the dataclass default not being applied correctly?

## Reproduction

```bash
# Clean test
rm -rf ~/.local/share/gptme/logs/2025-10-04-*
gptme 'hello'
# Check saved config - will have stream=false despite all defaults being True
```

## Code Locations

- Config creation: `gptme/config.py:658` - `setup_config_from_cli()`
- Config loading: `gptme/config.py:469` - `ChatConfig.load_or_create()`
- Config saving: `gptme/config.py:738` - `config.chat.save()`
- Reply routing: `gptme/llm/__init__.py:69` - checks `if stream:`
- Non-streaming path: `gptme/llm/__init__.py:75` - calls `_chat_complete()`

## Next Steps

1. Add debug logging at critical points:
   - After ChatConfig creation in setup_config_from_cli
   - After load_or_create
   - Before config.chat.save()
   - At start of reply() to see actual stream value

2. Check if there's a dataclass __post_init__ or similar that modifies stream

3. Check if there's environment variable or config file that sets stream=false

4. Review recent commits that might have broken streaming
