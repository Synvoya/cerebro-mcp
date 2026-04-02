# API Reference

Cerebro MCP exposes 24 tools via the Model Context Protocol.

## Session Tools

### `create_session`
Create a new Cerebro session.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| projectPath | string | yes | Path to the project directory |
| description | string | no | Optional project description |

### `resume_session`
Resume a session from a handover token.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| token | string | yes | Base64url-encoded handover token |

### `pause_session`
Pause an active session.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| sessionId | string | yes | Session ID |

### `end_session`
Complete and archive a session.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| sessionId | string | yes | Session ID |

### `list_sessions`
List all sessions. No parameters.

## Task Tools

### `execute_task`
Send a task for execution.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| sessionId | string | yes | Session ID |
| description | string | yes | Task in natural language |
| targetAgent | string | no | Specific agent ID to route to |

### `get_status`
Get project progress.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| sessionId | string | yes | Session ID |

### `review_code`
Get human-friendly code explanation.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| sessionId | string | yes | Session ID |
| filePath | string | no | Specific file to review |

### `run_build`
Trigger a build.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| sessionId | string | yes | Session ID |

### `run_tests`
Run the test suite.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| sessionId | string | yes | Session ID |

## Agent Swarm Tools

### `create_agent`
Create a new specialist agent.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| sessionId | string | yes | Session ID |
| name | string | yes | Agent name |
| description | string | yes | What the agent does |
| persona | string | no | Detailed persona instructions |
| tools | string[] | no | Tools the agent can use |

### `list_agents`
Show all agents with status.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| sessionId | string | yes | Session ID |

### `update_agent`
Modify an agent.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| agentId | string | yes | Agent ID |
| sessionId | string | yes | Session ID |
| name | string | no | New name |
| description | string | no | New description |
| persona | string | no | New persona |
| tools | string[] | no | New tool list |

### `remove_agent`
Delete an agent.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| agentId | string | yes | Agent ID |

### `get_agent_status`
Detailed agent status and message history.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| agentId | string | yes | Agent ID |

### `install_agent_pack`
Install agent templates from marketplace.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| packName | string | yes | Pack name (web-app, api-service, content-site) |
| sessionId | string | yes | Session ID |

### `delegate_to_agent`
Route a task to a specific agent.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| sessionId | string | yes | Session ID |
| agentId | string | yes | Target agent ID |
| task | string | yes | Task description |

## Vision Tools

### `analyze_image`
Interpret an image.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| imageData | string | yes | Base64-encoded image |
| context | string | no | Additional context |

### `implement_from_image`
Build/fix based on image.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| sessionId | string | yes | Session ID |
| imageData | string | yes | Base64-encoded image |
| instruction | string | no | What to do |

### `compare_screenshots`
Visual diff between screenshots.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| expected | string | yes | Base64-encoded expected image |
| actual | string | yes | Base64-encoded actual image |

## Handover Tools

### `prepare_handover`
Generate a signed handover token.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| sessionId | string | yes | Session ID |

### `validate_token`
Check if a token is valid.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| token | string | yes | Base64url-encoded token |

### `get_context_health`
Report context window usage.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| sessionId | string | yes | Session ID |
