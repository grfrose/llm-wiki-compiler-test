/**
 * OpenAI LLM provider implementation.
 *
 * Wraps the openai npm package to implement the LLMProvider interface.
 * Translates Anthropic-style tool schemas (input_schema) to OpenAI format (parameters).
 */

import OpenAI from "openai";
import type { LLMProvider, LLMMessage, LLMTool } from "../utils/provider.js";
import { EMBEDDING_MODELS, OPENAI_DEFAULT_TIMEOUT_MS } from "../utils/constants.js";
import { assertVectorValid, normalizeEmbeddingData } from "../utils/embeddings-validate.js";

/** Construction options for an OpenAI-compatible provider. */
interface OpenAIProviderOptions {
  baseURL?: string;
  apiKey?: string;
  embeddingsBaseURL?: string;
  embeddingModel?: string;
  /**
   * Per-request timeout in milliseconds. Defaults to 10 minutes for cloud
   * OpenAI (matches the SDK default). Long compile-time completions on
   * slower local models can exceed this — see {@link OllamaProvider} which
   * raises the default and reads LLMWIKI_REQUEST_TIMEOUT_MS / OLLAMA_TIMEOUT_MS.
   */
  timeoutMs?: number;
}

/**
 * Read an integer-millisecond timeout from an env var. Returns undefined when
 * the env var is unset, empty, non-numeric, zero, or negative — so the caller
 * silently falls back to the next source in its resolution chain (env-var
 * typos like `OLLAMA_TIMEOUT_MS=30m` are not surfaced to the user).
 */
export function readTimeoutEnv(name: string): number | undefined {
  const raw = process.env[name]?.trim();
  if (!raw) return undefined;
  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
}

/** Resolve the OpenAI client timeout from LLMWIKI_REQUEST_TIMEOUT_MS, if set. */
function resolveOpenAITimeoutMs(): number | undefined {
  return readTimeoutEnv("LLMWIKI_REQUEST_TIMEOUT_MS");
}

/**
 * Placeholder passed to the OpenAI client when no real key is set. The SDK (v6+)
 * throws on a missing/empty key at construction, but real credential validation
 * is owned by `ensureProviderAvailable` (the provider guard); deferring here
 * keeps that the single source of truth. Local servers that ignore auth accept
 * any value anyway.
 */
const PLACEHOLDER_API_KEY = "llmwiki-unset";

/**
 * Translate an Anthropic-style LLMTool to an OpenAI ChatCompletionTool.
 */
export function translateToolToOpenAI(
  tool: LLMTool,
): OpenAI.ChatCompletionTool {
  return {
    type: "function",
    function: {
      name: tool.name,
      description: tool.description,
      parameters: tool.input_schema,
    },
  };
}

/**
 * Read the LLMWIKI_TOOL_CHOICE_MODE env var to determine tool calling strategy.
 * 
 * - "strict" (default): Use tool_choice="required" to force tool invocation.
 *   This is the standard mode for most models and ensures tools are always called.
 * 
 * - "thinking": Use tool_choice="auto" with enhanced prompt constraints.
 *   Required for models with thinking/reasoning modes (e.g., Qwen thinking models)
 *   where tool_choice="required" conflicts with the thinking process and returns 400 errors.
 *   The enhanced prompt strongly instructs the model to invoke tools despite "auto" choice.
 *   Also includes automatic 400 error retry with "auto" fallback.
 */
function getToolChoiceMode(): "strict" | "thinking" {
  const mode = process.env.LLMWIKI_TOOL_CHOICE_MODE?.trim().toLowerCase();
  if (mode === "thinking") return "thinking";
  return "strict";
}

/**
 * Check if thinking mode is enabled via LLMWIKI_TOOL_CHOICE_MODE.
 */
function isThinkingModeEnabled(): boolean {
  return getToolChoiceMode() === "thinking";
}

/**
 * Append thinking-mode constraint instruction to system prompt.
 * In thinking mode with tool_choice="auto", the model might choose to respond
 * with plain text instead of calling a tool. This strong instruction ensures
 * tool invocation despite the "auto" setting.
 */
function enhanceSystemPromptForThinkingMode(system: string): string {
  const instruction = [
    "",
    "[MANDATORY TOOL USE]",
    "You MUST invoke one of the provided tools by calling it with valid structured arguments.",
    "Do NOT respond with plain text explanations or reasoning alone.",
    "A tool call is REQUIRED for every response.",
  ].join("\n");
  return system + instruction;
}

/** OpenAI-backed LLM provider. */
export class OpenAIProvider implements LLMProvider {
  protected readonly client: OpenAI;
  protected readonly embeddingsClient: OpenAI;
  protected readonly model: string;
  protected readonly configuredEmbeddingModel?: string;

  constructor(model: string, options: OpenAIProviderOptions = {}) {
    this.model = model;
    this.configuredEmbeddingModel = options.embeddingModel;
    // The OpenAI SDK (v6+) throws on a missing/empty key at construction. Real
    // credential validation is owned by the provider guard, so pass a
    // placeholder when unset to defer the check to that single source of truth.
    const resolvedKey = options.apiKey ?? process.env.OPENAI_API_KEY ?? PLACEHOLDER_API_KEY;
    const timeout = options.timeoutMs ?? resolveOpenAITimeoutMs() ?? OPENAI_DEFAULT_TIMEOUT_MS;
    this.client = new OpenAI({
      apiKey: resolvedKey,
      baseURL: options.baseURL ?? null,
      timeout,
    });
    this.embeddingsClient = options.embeddingsBaseURL
      ? new OpenAI({ apiKey: resolvedKey, baseURL: options.embeddingsBaseURL, timeout })
      : this.client;
  }

  /** Send a single non-streaming completion request. */
  async complete(system: string, messages: LLMMessage[], maxTokens: number): Promise<string> {
    const response = await this.client.chat.completions.create({
      model: this.model,
      max_tokens: maxTokens,
      messages: [{ role: "system", content: system }, ...messages],
    });

    return response.choices[0]?.message?.content ?? "";
  }

  /** Stream a completion, invoking onToken for each text chunk. */
  async stream(
    system: string,
    messages: LLMMessage[],
    maxTokens: number,
    onToken?: (text: string) => void,
  ): Promise<string> {
    const stream = await this.client.chat.completions.create({
      model: this.model,
      max_tokens: maxTokens,
      messages: [{ role: "system", content: system }, ...messages],
      stream: true,
    });

    let fullText = "";
    for await (const chunk of stream) {
      const delta = chunk.choices[0]?.delta?.content;
      if (delta) {
        fullText += delta;
        onToken?.(delta);
      }
    }

    return fullText;
  }

  /** Call the model with tool definitions and return the parsed tool input as JSON. */
  async toolCall(
    system: string,
    messages: LLMMessage[],
    tools: LLMTool[],
    maxTokens: number,
  ): Promise<string> {
    const openaiTools = tools.map(translateToolToOpenAI);
    const useThinkingMode = isThinkingModeEnabled();

    // In thinking mode, use "auto" to avoid 400 errors from reasoning models
    // (e.g., Qwen thinking) where tool_choice="required" conflicts with the
    // thinking process. An enhanced prompt still forces tool invocation.
    const toolChoice: "required" | "auto" = useThinkingMode ? "auto" : "required";
    const systemPrompt = useThinkingMode
      ? enhanceSystemPromptForThinkingMode(system)
      : system;

    try {
      return await this.callAndExtractToolResult(
        systemPrompt, messages, openaiTools, maxTokens, toolChoice,
      );
    } catch (error) {
      // Retry with "auto" on thinking-mode tool_choice conflicts.
      if (useThinkingMode && this.isToolChoiceConflictError(error)) {
        return this.callAndExtractToolResult(
          systemPrompt, messages, openaiTools, maxTokens, "auto",
        );
      }
      throw error;
    }
  }

  /**
   * Check if an error is a tool_choice conflict (400) related to thinking mode.
   * DashScope returns: "The tool_choice parameter does not support being set to
   * required or object in thinking mode"
   */
  private isToolChoiceConflictError(error: unknown): boolean {
    if (error && typeof error === "object") {
      const err = error as { status?: number; message?: string; error?: { message?: string } };
      const status = err.status;
      const message = err.message ?? err.error?.message ?? "";
      const lowerMessage = message.toLowerCase();
      
      return (
        status === 400 &&
        (lowerMessage.includes("tool_choice") || lowerMessage.includes("thinking mode"))
      );
    }
    return false;
  }

  /**
   * Send a tool-calling completion request and return the parsed tool
   * arguments as JSON. When the model does not invoke a tool, falls back
   * to the plain text content (empty string if neither is present).
   */
  private async callAndExtractToolResult(
    systemPrompt: string,
    messages: LLMMessage[],
    openaiTools: OpenAI.ChatCompletionTool[],
    maxTokens: number,
    toolChoice: "required" | "auto",
  ): Promise<string> {
    const response = await this.client.chat.completions.create({
      model: this.model,
      max_tokens: maxTokens,
      messages: [{ role: "system", content: systemPrompt }, ...messages],
      tools: openaiTools,
      tool_choice: toolChoice,
    });

    // openai v6 made tool_calls a union of function and custom calls; only the
    // function variant carries `.function`.
    const call = response.choices[0]?.message?.tool_calls?.[0];
    if (call?.type === "function") {
      return call.function.arguments;
    }
    return response.choices[0]?.message?.content ?? "";
  }

  /** Produce a single embedding vector via the OpenAI embeddings API. */
  async embed(text: string): Promise<number[]> {
    const response = await this.embeddingsClient.embeddings.create({
      model: this.embeddingModel(),
      input: text,
      encoding_format: "float",
    });
    const vector = response.data[0]?.embedding;
    assertVectorValid(vector); // non-empty + finite (replaces the Array.isArray-only check)
    return vector;
  }

  /** Embed many texts in one request; vectors returned in input order. */
  async embedBatch(texts: string[]): Promise<number[][]> {
    if (texts.length === 0) return [];
    const response = await this.embeddingsClient.embeddings.create({
      model: this.embeddingModel(),
      input: texts,
      encoding_format: "float",
    });
    return normalizeEmbeddingData(response.data, texts.length);
  }

  /** Default embedding model for this provider. Subclasses may override. */
  protected embeddingModel(): string {
    return this.configuredEmbeddingModel ?? EMBEDDING_MODELS.openai;
  }
}
