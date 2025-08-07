import { BaseNode } from '@/nodes/BaseNode';
import { DataPacket } from '@/core/types';

export interface LLMNodeConfig {
  id: string;
  type: 'llm';
  name: string;
  description?: string;
  model: string;
  apiKey?: string;
  apiEndpoint?: string;
  temperature?: number;
  maxTokens?: number;
  systemPrompt?: string;
  responseFormat?: 'text' | 'json' | 'tool_call';
  streaming?: boolean;
  retryOnError?: boolean;
  timeout?: number;
}

export interface LLMMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
  tool_calls?: any[];
  name?: string;
}

/**
 * LLM Node for AI language model interactions
 */
export class LLMNode extends BaseNode {
  protected config: LLMNodeConfig;

  constructor(config: LLMNodeConfig) {
    super(config as any);
    this.config = config;
  }
  private conversationHistory: LLMMessage[] = [];
  private systemPrompt?: string;

  protected async onInitialize(): Promise<void> {
    this.systemPrompt = this.config.systemPrompt;
    if (this.systemPrompt) {
      this.conversationHistory.push({
        role: 'system',
        content: this.systemPrompt,
      });
    }
  }

  protected async processPacket(packet: DataPacket): Promise<DataPacket | null> {
    try {
      const { prompt, messages, context, tools } = packet.data;

      // Build messages array
      const requestMessages = this.buildMessages(prompt, messages, context);

      // Call LLM
      const response = await this.callLLM(requestMessages, tools);

      // Update conversation history if maintaining context
      if (this.config.responseFormat !== 'tool_call') {
        this.updateHistory(prompt, response);
      }

      return {
        ...packet,
        data: {
          ...packet.data,
          response: response.content,
          model: this.config.model,
          usage: response.usage,
          tool_calls: response.tool_calls,
          finish_reason: response.finish_reason,
        },
        metadata: {
          ...packet.metadata,
          processedBy: this.config.id,
          model: this.config.model,
          timestamp: Date.now(),
        },
      };
    } catch (error) {
      console.error('LLM Node error:', error);

      if (this.config.retryOnError) {
        // Retry logic
        await this.delay(1000);
        return this.processPacket(packet);
      }

      return {
        ...packet,
        error: error as Error,
        data: {
          ...packet.data,
          error: error instanceof Error ? error.message : String(error),
        },
        metadata: {
          ...packet.metadata,
          errorNode: this.config.id,
          errorAt: Date.now(),
        },
      };
    }
  }

  private buildMessages(prompt?: string, messages?: LLMMessage[], context?: any): LLMMessage[] {
    if (messages) {
      return messages;
    }

    const requestMessages: LLMMessage[] = [];

    // Add system prompt if not already in history
    if (this.systemPrompt && this.conversationHistory.length === 0) {
      requestMessages.push({ role: 'system', content: this.systemPrompt });
    }

    // Add conversation history if maintaining context
    if (context?.includeHistory) {
      requestMessages.push(...this.conversationHistory.slice(-10)); // Last 10 messages
    }

    // Add current prompt
    if (prompt) {
      requestMessages.push({ role: 'user', content: prompt });
    }

    return requestMessages;
  }

  private async callLLM(messages: LLMMessage[], tools?: any[]): Promise<any> {
    const endpoint = this.getEndpoint();
    const headers = this.getHeaders();

    const body: any = {
      model: this.config.model,
      messages,
      temperature: this.config.temperature ?? 0.7,
      max_tokens: this.config.maxTokens ?? 1000,
    };

    if (tools?.length) {
      body.tools = tools;
      body.tool_choice = 'auto';
    }

    if (this.config.responseFormat === 'json') {
      body.response_format = { type: 'json_object' };
    }

    if (this.config.streaming) {
      return this.streamLLM(endpoint, headers, body);
    }

    const response = await fetch(endpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      throw new Error(`LLM API error: ${response.status} ${response.statusText}`);
    }

    const data: any = await response.json();

    return {
      content: data.choices?.[0]?.message?.content || '',
      tool_calls: data.choices?.[0]?.message?.tool_calls,
      finish_reason: data.choices?.[0]?.finish_reason || 'stop',
      usage: data.usage || {},
    };
  }

  private async streamLLM(endpoint: string, headers: any, body: any): Promise<any> {
    body.stream = true;

    const response = await fetch(endpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      throw new Error(`LLM API error: ${response.status} ${response.statusText}`);
    }

    // For streaming, we'd need to handle Server-Sent Events
    // This is a simplified version
    const reader = response.body?.getReader();
    const decoder = new TextDecoder();
    let content = '';

    if (reader) {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') continue;

            try {
              const parsed = JSON.parse(data);
              const delta = parsed.choices[0].delta;
              if (delta.content) {
                content += delta.content;
                // Emit partial response
                this.emitPartial(content);
              }
            } catch (e) {
              // Skip invalid JSON
            }
          }
        }
      }
    }

    return { content, finish_reason: 'stop' };
  }

  private getEndpoint(): string {
    if (this.config.apiEndpoint) {
      return this.config.apiEndpoint;
    }

    // Default endpoints for common providers
    if (this.config.model.startsWith('gpt-')) {
      return 'https://api.openai.com/v1/chat/completions';
    } else if (this.config.model.startsWith('claude-')) {
      return 'https://api.anthropic.com/v1/messages';
    } else if (this.config.model.startsWith('gemini-')) {
      return 'https://generativelanguage.googleapis.com/v1beta/models/generateContent';
    }

    throw new Error(`Unknown model provider for: ${this.config.model}`);
  }

  private getHeaders(): any {
    const headers: any = {
      'Content-Type': 'application/json',
    };

    if (this.config.apiKey) {
      if (this.config.model.startsWith('gpt-')) {
        headers['Authorization'] = `Bearer ${this.config.apiKey}`;
      } else if (this.config.model.startsWith('claude-')) {
        headers['x-api-key'] = this.config.apiKey;
        headers['anthropic-version'] = '2023-06-01';
      } else if (this.config.model.startsWith('gemini-')) {
        headers['x-goog-api-key'] = this.config.apiKey;
      }
    }

    return headers;
  }

  private updateHistory(prompt: string, response: any): void {
    if (prompt) {
      this.conversationHistory.push({ role: 'user', content: prompt });
    }

    if (response.content) {
      this.conversationHistory.push({
        role: 'assistant',
        content: response.content,
        tool_calls: response.tool_calls,
      });
    }

    // Keep history size manageable
    if (this.conversationHistory.length > 50) {
      // Keep system prompt and last 49 messages
      const systemMessages = this.conversationHistory.filter((m) => m.role === 'system');
      const otherMessages = this.conversationHistory.filter((m) => m.role !== 'system');
      this.conversationHistory = [...systemMessages, ...otherMessages.slice(-49)];
    }
  }

  private emitPartial(content: string): void {
    // Emit partial response for streaming
    this.emit({
      id: `partial-${Date.now()}`,
      timestamp: Date.now(),
      data: { partialResponse: content },
      metadata: { streaming: true },
    });
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Clear conversation history
   */
  clearHistory(): void {
    this.conversationHistory = this.systemPrompt ? [{ role: 'system', content: this.systemPrompt }] : [];
  }

  /**
   * Get conversation history
   */
  getHistory(): LLMMessage[] {
    return [...this.conversationHistory];
  }

  protected async onStart(): Promise<void> {}
  protected async onPause(): Promise<void> {}
  protected async onResume(): Promise<void> {}
  protected async onStop(): Promise<void> {
    // Clear history on stop if needed
    if (!this.config.streaming) {
      this.clearHistory();
    }
  }
}
