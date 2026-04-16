# Claude Code Provider Restoration Guide

This document describes how to restore the Claude Code provider feature that was removed in version 3.42.0.

## Files That Were Restored

### New Files Created:
1. `packages/types/src/providers/claude-code.ts` - Type definitions for Claude Code models
2. `src/api/providers/claude-code.ts` - Claude Code API handler
3. `src/integrations/claude-code/oauth.ts` - OAuth authentication for Claude Code
4. `src/integrations/claude-code/streaming-client.ts` - Streaming client for Claude Code API
5. `webview-ui/src/components/settings/providers/ClaudeCode.tsx` - Settings UI component
6. `webview-ui/src/components/settings/providers/ClaudeCodeRateLimitDashboard.tsx` - Rate limit dashboard

### Files Modified:
1. `packages/types/src/providers/index.ts` - Added claude-code export
2. `packages/types/src/provider-settings.ts` - Added claude-code to provider types
3. `packages/types/src/vscode-extension-host.ts` - Added Claude Code message types
4. `src/api/index.ts` - Added ClaudeCodeHandler import and case
5. `src/api/providers/index.ts` - Added ClaudeCodeHandler export
6. `src/core/webview/ClineProvider.ts` - Added claudeCodeIsAuthenticated
7. `src/core/webview/webviewMessageHandler.ts` - Added Claude Code sign in/out and rate limit handlers
8. `src/shared/checkExistApiConfig.ts` - Added claude-code to no-config providers
9. `webview-ui/src/components/settings/ApiOptions.tsx` - Added Claude Code imports and component
10. `webview-ui/src/components/settings/providers/index.ts` - Added ClaudeCode export
11. `src/extension.ts` - **CRITICAL**: Added claudeCodeOAuthManager import and initialization

## How to Restore After Updates

When you update to a new version of Roo Code, run this command to restore the feature:

```bash
git cherry-pick 7f854c0dd^  # This picks the commit BEFORE the removal
```

Or alternatively, you can restore from the commit that had Claude Code:

```bash
# Get the files from the commit before removal
git checkout 7f854c0dd^ -- \
  packages/types/src/providers/claude-code.ts \
  src/api/providers/claude-code.ts \
  src/integrations/claude-code/oauth.ts \
  src/integrations/claude-code/streaming-client.ts \
  webview-ui/src/components/settings/providers/ClaudeCode.tsx \
  webview-ui/src/components/settings/providers/ClaudeCodeRateLimitDashboard.tsx
```

Then manually add the required imports and references to the modified files listed above.

## Alternative: Create a Fork

For a more sustainable approach:

1. Fork the Roo Code repository
2. Create a branch for your Claude Code version
3. After each official release, merge the main branch into your fork
4. Resolve any conflicts to keep your Claude Code provider

## Key Changes Summary

In `provider-settings.ts`, add:
- Import `claudeCodeModels` from providers
- Add "claude-code" to `providerNames` array
- Add `claudeCodeSchema` 
- Add to `providerSettingsSchemaDiscriminated`
- Add to `modelIdKeysByProvider`
- Add to `ANTHROPIC_STYLE_PROVIDERS`
- Add to `MODELS_BY_PROVIDER`

In `webviewMessageHandler.ts`, add handlers for:
- `claudeCodeSignIn`
- `claudeCodeSignOut`  
- `requestClaudeCodeRateLimits`

In `vscode-extension-host.ts`, add:
- `claudeCodeRateLimits` to ExtensionMessage type
- `claudeCodeIsAuthenticated` to ExtensionState
- `claudeCodeSignIn`, `claudeCodeSignOut`, `requestClaudeCodeRateLimits` to WebviewMessage type

## CRITICAL: OAuth Manager Initialization

**This step is essential for OAuth to work!**

In `src/extension.ts`, you MUST:

1. Add the import at the top of the file (near other OAuth imports):
```typescript
import { claudeCodeOAuthManager } from "./integrations/claude-code/oauth"
```

2. Add initialization in the `activate()` function (before `openAiCodexOAuthManager.initialize`):
```typescript
// Initialize Claude Code OAuth manager for direct API access.
claudeCodeOAuthManager.initialize(context, (message) => outputChannel.appendLine(message))
```

Without this initialization, the OAuth manager will not have access to the VS Code extension context,
which means:
- It cannot store credentials in the secure secrets storage
- It cannot log to the output channel
- OAuth sign-in will fail with authentication errors

This was the root cause of the OAuth error when trying to re-enable Claude Code in the fork.
