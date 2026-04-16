// npx vitest run src/api/providers/__tests__/claude-code.spec.ts

import { ClaudeCodeHandler } from "../claude-code"

// Mock OAuth manager
const mockGetAccessToken = vi.fn().mockResolvedValue("test-access-token")
const mockGetEmail = vi.fn().mockResolvedValue("test@example.com")
const mockForceRefreshAccessToken = vi.fn()

vi.mock("../../../integrations/claude-code/oauth", () => ({
	claudeCodeOAuthManager: {
		getAccessToken: (...args: unknown[]) => mockGetAccessToken(...args),
		getEmail: (...args: unknown[]) => mockGetEmail(...args),
		forceRefreshAccessToken: (...args: unknown[]) => mockForceRefreshAccessToken(...args),
	},
	generateUserId: vi.fn().mockReturnValue("test-user-id"),
}))

// Mock createStreamingMessage
const mockCreateStreamingMessage = vi.fn()
vi.mock("../../../integrations/claude-code/streaming-client", () => ({
	createStreamingMessage: (...args: unknown[]) => mockCreateStreamingMessage(...args),
}))

// Mock countTokens
vi.mock("../../../utils/countTokens", () => ({
	countTokens: vi.fn().mockResolvedValue(10),
}))

// Mock i18n
vi.mock("../../../i18n", () => ({
	t: vi.fn((key: string) => key),
}))

describe("ClaudeCodeHandler", () => {
	beforeEach(() => {
		vi.clearAllMocks()
	})

	function createMockStream(chunks: Array<{ type: string; [key: string]: unknown }>) {
		return (async function* () {
			for (const chunk of chunks) {
				yield chunk
			}
		})()
	}

	describe("getModel", () => {
		it("should return the specified model if valid", () => {
			const handler = new ClaudeCodeHandler({
				apiModelId: "claude-sonnet-4-6",
			})
			const model = handler.getModel()
			expect(model.id).toBe("claude-sonnet-4-6")
			expect(model.info).toBeDefined()
			expect(model.info.contextWindow).toBe(200_000)
		})

		it("should return default model if no model ID is provided", () => {
			const handler = new ClaudeCodeHandler({})
			const model = handler.getModel()
			expect(model.id).toBe("claude-sonnet-4-5")
			expect(model.info).toBeDefined()
		})

		it("should return default model if invalid model ID is provided", () => {
			const handler = new ClaudeCodeHandler({
				apiModelId: "invalid-model-id",
			})
			const model = handler.getModel()
			expect(model.id).toBe("claude-sonnet-4-5")
		})

		it("should update context window to 1M when claudeCode1MContext is true for claude-sonnet-4-6", () => {
			const handler = new ClaudeCodeHandler({
				apiModelId: "claude-sonnet-4-6",
				claudeCode1MContext: true,
			})
			const model = handler.getModel()
			expect(model.id).toBe("claude-sonnet-4-6")
			expect(model.info.contextWindow).toBe(1_000_000)
		})

		it("should update context window to 1M when claudeCode1MContext is true for claude-opus-4-6", () => {
			const handler = new ClaudeCodeHandler({
				apiModelId: "claude-opus-4-6",
				claudeCode1MContext: true,
			})
			const model = handler.getModel()
			expect(model.id).toBe("claude-opus-4-6")
			expect(model.info.contextWindow).toBe(1_000_000)
		})

		it("should keep default context window when claudeCode1MContext is false", () => {
			const handler = new ClaudeCodeHandler({
				apiModelId: "claude-sonnet-4-6",
				claudeCode1MContext: false,
			})
			const model = handler.getModel()
			expect(model.id).toBe("claude-sonnet-4-6")
			expect(model.info.contextWindow).toBe(200_000)
		})

		it("should NOT update context window for unsupported models even when claudeCode1MContext is true", () => {
			const handler = new ClaudeCodeHandler({
				apiModelId: "claude-sonnet-4-5",
				claudeCode1MContext: true,
			})
			const model = handler.getModel()
			expect(model.id).toBe("claude-sonnet-4-5")
			expect(model.info.contextWindow).toBe(200_000)
		})

		it("should NOT update context window for claude-haiku-4-5 when claudeCode1MContext is true", () => {
			const handler = new ClaudeCodeHandler({
				apiModelId: "claude-haiku-4-5",
				claudeCode1MContext: true,
			})
			const model = handler.getModel()
			expect(model.id).toBe("claude-haiku-4-5")
			expect(model.info.contextWindow).toBe(200_000)
		})
	})

	describe("createMessage - 1M context beta", () => {
		const systemPrompt = "You are a helpful assistant."
		const messages = [{ role: "user" as const, content: [{ type: "text" as const, text: "Hello" }] }]

		it("should include context-1m-2025-08-07 beta when claudeCode1MContext is true for claude-sonnet-4-6", async () => {
			mockCreateStreamingMessage.mockReturnValue(
				createMockStream([
					{ type: "text", text: "Hello" },
					{
						type: "usage",
						inputTokens: 10,
						outputTokens: 5,
					},
				]),
			)

			const handler = new ClaudeCodeHandler({
				apiModelId: "claude-sonnet-4-6",
				claudeCode1MContext: true,
			})

			const stream = handler.createMessage(systemPrompt, messages)
			for await (const _chunk of stream) {
				// Consume stream
			}

			expect(mockCreateStreamingMessage).toHaveBeenCalledTimes(1)
			const callArgs = mockCreateStreamingMessage.mock.calls[0][0]
			expect(callArgs.additionalBetas).toContain("context-1m-2025-08-07")
		})

		it("should include context-1m-2025-08-07 beta when claudeCode1MContext is true for claude-opus-4-6", async () => {
			mockCreateStreamingMessage.mockReturnValue(
				createMockStream([
					{ type: "text", text: "Hello" },
					{
						type: "usage",
						inputTokens: 10,
						outputTokens: 5,
					},
				]),
			)

			const handler = new ClaudeCodeHandler({
				apiModelId: "claude-opus-4-6",
				claudeCode1MContext: true,
			})

			const stream = handler.createMessage(systemPrompt, messages)
			for await (const _chunk of stream) {
				// Consume stream
			}

			expect(mockCreateStreamingMessage).toHaveBeenCalledTimes(1)
			const callArgs = mockCreateStreamingMessage.mock.calls[0][0]
			expect(callArgs.additionalBetas).toContain("context-1m-2025-08-07")
		})

		it("should NOT include context-1m-2025-08-07 beta when claudeCode1MContext is false", async () => {
			mockCreateStreamingMessage.mockReturnValue(
				createMockStream([
					{ type: "text", text: "Hello" },
					{
						type: "usage",
						inputTokens: 10,
						outputTokens: 5,
					},
				]),
			)

			const handler = new ClaudeCodeHandler({
				apiModelId: "claude-sonnet-4-6",
				claudeCode1MContext: false,
			})

			const stream = handler.createMessage(systemPrompt, messages)
			for await (const _chunk of stream) {
				// Consume stream
			}

			expect(mockCreateStreamingMessage).toHaveBeenCalledTimes(1)
			const callArgs = mockCreateStreamingMessage.mock.calls[0][0]
			expect(callArgs.additionalBetas).toBeUndefined()
		})

		it("should NOT include context-1m-2025-08-07 beta for unsupported models", async () => {
			mockCreateStreamingMessage.mockReturnValue(
				createMockStream([
					{ type: "text", text: "Hello" },
					{
						type: "usage",
						inputTokens: 10,
						outputTokens: 5,
					},
				]),
			)

			const handler = new ClaudeCodeHandler({
				apiModelId: "claude-sonnet-4-5",
				claudeCode1MContext: true,
			})

			const stream = handler.createMessage(systemPrompt, messages)
			for await (const _chunk of stream) {
				// Consume stream
			}

			expect(mockCreateStreamingMessage).toHaveBeenCalledTimes(1)
			const callArgs = mockCreateStreamingMessage.mock.calls[0][0]
			expect(callArgs.additionalBetas).toBeUndefined()
		})
	})
})
