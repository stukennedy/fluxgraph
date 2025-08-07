import { BaseNode } from '@/nodes/BaseNode';
import { DataPacket } from '@/core/types';

export interface Tool {
  name: string;
  description: string;
  parameters: {
    type: 'object';
    properties: Record<string, any>;
    required?: string[];
  };
  function: (args: any) => Promise<any> | any;
}

export interface ToolNodeConfig {
  id: string;
  type: 'tool';
  name: string;
  description?: string;
  tools: Tool[];
  parallelExecution?: boolean;
  maxParallel?: number;
  timeout?: number;
  sandboxed?: boolean;
}

/**
 * Tool Node for executing function calls from LLMs
 */
export class ToolNode extends BaseNode {
  protected config: ToolNodeConfig;

  constructor(config: ToolNodeConfig) {
    super(config as any);
    this.config = config;
  }
  private toolMap: Map<string, Tool> = new Map();

  protected async onInitialize(): Promise<void> {
    // Build tool map for quick lookup
    for (const tool of this.config.tools) {
      this.toolMap.set(tool.name, tool);
    }
  }

  protected async processPacket(packet: DataPacket): Promise<DataPacket | null> {
    const { tool_calls, toolCall, toolName, toolArgs } = packet.data;
    
    try {
      let results: any;
      
      if (tool_calls && Array.isArray(tool_calls)) {
        // Handle multiple tool calls from LLM
        results = await this.executeMultipleTools(tool_calls);
      } else if (toolCall) {
        // Handle single tool call object
        results = await this.executeTool(toolCall.name, toolCall.arguments);
      } else if (toolName) {
        // Handle direct tool invocation
        results = await this.executeTool(toolName, toolArgs);
      } else {
        throw new Error('No tool call specified in packet');
      }
      
      return {
        ...packet,
        data: {
          ...packet.data,
          toolResults: results,
          executedAt: Date.now(),
        },
        metadata: {
          ...packet.metadata,
          toolsExecuted: Array.isArray(results) 
            ? results.map(r => r.toolName)
            : [toolName || toolCall?.name],
          processedBy: this.config.id,
        },
      };
    } catch (error) {
      return {
        ...packet,
        error: error as Error,
        metadata: {
          ...packet.metadata,
          errorNode: this.config.id,
          errorAt: Date.now(),
        },
      };
    }
  }

  private async executeMultipleTools(toolCalls: any[]): Promise<any[]> {
    if (this.config.parallelExecution) {
      // Execute tools in parallel with concurrency limit
      const maxParallel = this.config.maxParallel || 5;
      const results: any[] = [];
      
      for (let i = 0; i < toolCalls.length; i += maxParallel) {
        const batch = toolCalls.slice(i, i + maxParallel);
        const batchResults = await Promise.all(
          batch.map(tc => this.executeToolCall(tc))
        );
        results.push(...batchResults);
      }
      
      return results;
    } else {
      // Execute tools sequentially
      const results: any[] = [];
      for (const toolCall of toolCalls) {
        const result = await this.executeToolCall(toolCall);
        results.push(result);
      }
      return results;
    }
  }

  private async executeToolCall(toolCall: any): Promise<any> {
    const { function: func, id } = toolCall;
    const args = typeof func.arguments === 'string' 
      ? JSON.parse(func.arguments) 
      : func.arguments;
    
    try {
      const result = await this.executeTool(func.name, args);
      return {
        tool_call_id: id,
        toolName: func.name,
        result,
        success: true,
      };
    } catch (error) {
      return {
        tool_call_id: id,
        toolName: func.name,
        error: (error as Error).message,
        success: false,
      };
    }
  }

  private async executeTool(toolName: string, args: any): Promise<any> {
    const tool = this.toolMap.get(toolName);
    
    if (!tool) {
      throw new Error(`Tool not found: ${toolName}`);
    }
    
    // Validate arguments if schema provided
    if (tool.parameters) {
      this.validateToolArgs(tool, args);
    }
    
    // Execute with timeout if configured
    const timeout = (this.config as any).timeout;
    if (timeout) {
      return this.executeWithTimeout(tool.function, args, timeout);
    }
    
    // Execute in sandbox if configured
    if (this.config.sandboxed) {
      return this.executeInSandbox(tool.function, args);
    }
    
    // Direct execution
    return await tool.function(args);
  }

  private validateToolArgs(tool: Tool, args: any): void {
    const { properties, required } = tool.parameters;
    
    // Check required fields
    if (required) {
      for (const field of required) {
        if (!(field in args)) {
          throw new Error(`Missing required field: ${field} for tool ${tool.name}`);
        }
      }
    }
    
    // Validate types (basic validation)
    for (const [key, schema] of Object.entries(properties)) {
      if (key in args) {
        const value = args[key];
        const expectedType = (schema as any).type;
        
        if (expectedType === 'string' && typeof value !== 'string') {
          throw new Error(`Invalid type for ${key}: expected string`);
        } else if (expectedType === 'number' && typeof value !== 'number') {
          throw new Error(`Invalid type for ${key}: expected number`);
        } else if (expectedType === 'boolean' && typeof value !== 'boolean') {
          throw new Error(`Invalid type for ${key}: expected boolean`);
        } else if (expectedType === 'array' && !Array.isArray(value)) {
          throw new Error(`Invalid type for ${key}: expected array`);
        } else if (expectedType === 'object' && typeof value !== 'object') {
          throw new Error(`Invalid type for ${key}: expected object`);
        }
      }
    }
  }

  private async executeWithTimeout(
    func: Function,
    args: any,
    timeout: number
  ): Promise<any> {
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error(`Tool execution timeout after ${timeout}ms`)), timeout);
    });
    
    return Promise.race([func(args), timeoutPromise]);
  }

  private async executeInSandbox(func: Function, args: any): Promise<any> {
    // Simple sandboxing - in production use VM2 or similar
    try {
      const sandboxedFunc = new Function('args', `
        'use strict';
        const func = ${func.toString()};
        return func(args);
      `);
      
      return await sandboxedFunc(args);
    } catch (error) {
      throw new Error(`Sandbox execution failed: ${(error as Error).message}`);
    }
  }

  /**
   * Get available tools for LLM
   */
  getToolDefinitions(): any[] {
    return Array.from(this.toolMap.values()).map(tool => ({
      type: 'function',
      function: {
        name: tool.name,
        description: tool.description,
        parameters: tool.parameters,
      },
    }));
  }

  /**
   * Add a tool dynamically
   */
  addTool(tool: Tool): void {
    this.toolMap.set(tool.name, tool);
  }

  /**
   * Remove a tool
   */
  removeTool(toolName: string): void {
    this.toolMap.delete(toolName);
  }

  protected async onStart(): Promise<void> {}
  protected async onPause(): Promise<void> {}
  protected async onResume(): Promise<void> {}
  protected async onStop(): Promise<void> {}
}

/**
 * Common built-in tools
 */
export class BuiltInTools {
  static webSearch(): Tool {
    return {
      name: 'web_search',
      description: 'Search the web for information',
      parameters: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'Search query' },
          max_results: { type: 'number', description: 'Maximum number of results' },
        },
        required: ['query'],
      },
      function: async ({ query, max_results = 5 }) => {
        // Implement web search API call
        const response = await fetch(`https://api.search.example.com/search?q=${encodeURIComponent(query)}&limit=${max_results}`);
        return response.json();
      },
    };
  }

  static calculator(): Tool {
    return {
      name: 'calculator',
      description: 'Perform mathematical calculations',
      parameters: {
        type: 'object',
        properties: {
          expression: { type: 'string', description: 'Mathematical expression to evaluate' },
        },
        required: ['expression'],
      },
      function: ({ expression }) => {
        // Safe math evaluation
        try {
          // This is simplified - use math.js or similar in production
          const result = Function('"use strict"; return (' + expression + ')')();
          return { result };
        } catch (error) {
          return { error: 'Invalid expression' };
        }
      },
    };
  }

  static codeExecutor(): Tool {
    return {
      name: 'execute_code',
      description: 'Execute JavaScript code safely',
      parameters: {
        type: 'object',
        properties: {
          code: { type: 'string', description: 'JavaScript code to execute' },
          context: { type: 'object', description: 'Context variables for the code' },
        },
        required: ['code'],
      },
      function: async ({ code, context = {} }) => {
        try {
          const func = new Function(...Object.keys(context), code);
          const result = await func(...Object.values(context));
          return { success: true, result };
        } catch (error) {
          return { success: false, error: (error as Error).message };
        }
      },
    };
  }

  static fetchUrl(): Tool {
    return {
      name: 'fetch_url',
      description: 'Fetch content from a URL',
      parameters: {
        type: 'object',
        properties: {
          url: { type: 'string', description: 'URL to fetch' },
          method: { type: 'string', description: 'HTTP method' },
          headers: { type: 'object', description: 'Request headers' },
          body: { type: 'string', description: 'Request body' },
        },
        required: ['url'],
      },
      function: async ({ url, method = 'GET', headers = {}, body }) => {
        const options: any = { method, headers };
        if (body) options.body = body;
        
        const response = await fetch(url, options);
        const text = await response.text();
        
        return {
          status: response.status,
          headers: {},
          body: text,
        };
      },
    };
  }

  static database(): Tool {
    return {
      name: 'database_query',
      description: 'Query a database',
      parameters: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'SQL query' },
          params: { type: 'array', description: 'Query parameters' },
        },
        required: ['query'],
      },
      function: async ({ query, params = [] }) => {
        // This would connect to your actual database
        // For demo, returning mock data
        return {
          rows: [
            { id: 1, name: 'Example', value: 42 },
          ],
          rowCount: 1,
        };
      },
    };
  }
}