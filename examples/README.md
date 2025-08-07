# FluxGraph AI Examples

This directory contains comprehensive examples demonstrating FluxGraph's AI capabilities for building intelligent workflows and agents.

## 🤖 Available Examples

### 1. [Chatbot with Memory](./ai/chatbot-with-memory.ts)
Build a conversational AI assistant that maintains context across interactions.

**Features:**
- Conversation memory management
- Context retrieval and summarization
- Hybrid memory (short-term + long-term)
- Streaming responses
- Automatic memory pruning

**Use Cases:**
- Customer support chatbots
- Personal assistants
- Educational tutors
- Interactive help systems

### 2. [RAG Pipeline](./ai/rag-pipeline.ts)
Implement Retrieval Augmented Generation for accurate, context-aware responses.

**Features:**
- Document retrieval and ranking
- Query embedding and semantic search
- Context injection for LLMs
- Source attribution
- Multi-document synthesis

**Use Cases:**
- Knowledge base Q&A
- Documentation assistants
- Research tools
- Content generation with citations

### 3. [ReAct Agent](./ai/react-agent.ts)
Create autonomous agents that reason about tasks and take actions using tools.

**Features:**
- Thought-Action-Observation loops
- Dynamic tool selection
- Multi-step reasoning
- Error recovery
- Task completion detection

**Use Cases:**
- Task automation
- Problem-solving assistants
- Data analysis workflows
- Code generation and debugging

### 4. [Multi-Agent System](./ai/multi-agent-system.ts)
Deploy multiple specialized agents working together to solve complex problems.

**Features:**
- Agent coordination and delegation
- Specialized agent roles
- Response synthesis
- Team knowledge base
- Parallel agent execution

**Use Cases:**
- Complex project management
- Research and development
- Code review and testing
- Content creation pipelines

### 5. [Tool Calling](./ai/tool-calling.ts)
Demonstrate advanced function calling with parallel and sequential execution.

**Features:**
- Multiple tool types (weather, stocks, email, etc.)
- Parallel tool execution
- Tool result aggregation
- Dynamic tool registration
- Error handling and timeouts

**Use Cases:**
- API integrations
- Workflow automation
- Data gathering and processing
- Multi-service orchestration

## 🚀 Getting Started

### Prerequisites

1. Install Bun (if not already installed):
```bash
curl -fsSL https://bun.sh/install | bash
```

2. Install dependencies:
```bash
bun install
```

3. Set up environment variables (optional - examples will run with simulated responses without API keys):
```bash
export OPENAI_API_KEY="your-api-key"
# Or for other providers:
export ANTHROPIC_API_KEY="your-api-key"
export GEMINI_API_KEY="your-api-key"
```

### Running Examples

#### Interactive Mode
Run the interactive example selector:
```bash
bun run examples
```

#### Run All Examples
Run all examples automatically:
```bash
bun run examples/run-all.ts --all
```

#### Run Individual Examples
Each example can be run independently using npm scripts:

```bash
# Chatbot with conversation memory
bun run example:chatbot

# RAG pipeline for Q&A
bun run example:rag

# ReAct autonomous agent
bun run example:react

# Multi-agent collaboration
bun run example:multi-agent

# Tool calling demonstrations
bun run example:tools
```

Or run directly with bun:
```bash
# Run any example directly
bun run examples/ai/chatbot-with-memory.ts
bun run examples/ai/rag-pipeline.ts
bun run examples/ai/react-agent.ts
bun run examples/ai/multi-agent-system.ts
bun run examples/ai/tool-calling.ts
```

## 📚 Key Concepts

### Graph Architecture
FluxGraph uses a directed graph architecture where:
- **Nodes** process data packets
- **Edges** define data flow and conditions
- **Cycles** enable agent loops and iterative processing

### Node Types for AI

#### LLMNode
Interfaces with language models (OpenAI, Claude, Gemini):
```typescript
{
  type: 'llm',
  model: 'gpt-4',
  temperature: 0.7,
  systemPrompt: 'You are a helpful assistant',
  streaming: true
}
```

#### ToolNode
Executes functions and tools:
```typescript
{
  type: 'tool',
  tools: [...],
  parallelExecution: true,
  timeout: 5000
}
```

#### MemoryNode
Manages conversation and semantic memory:
```typescript
{
  type: 'memory',
  memoryType: 'hybrid',
  maxEntries: 100,
  embeddingDimension: 384
}
```

### Data Flow Patterns

#### Sequential Processing
```
Input → LLM → Tool → Output
```

#### Parallel Processing
```
       ┌→ Tool1 →┐
Input →┼→ Tool2 →┼→ Aggregator → Output
       └→ Tool3 →┘
```

#### Cyclic Processing (Agent Loops)
```
Input → LLM → Tool → Observer ↻
         ↑                    ↓
         └────────────────────┘
```

## 🎯 Best Practices

### 1. Memory Management
- Use appropriate memory types (conversation vs semantic)
- Implement memory pruning for long-running agents
- Consider persistence for production deployments

### 2. Error Handling
- Set appropriate error strategies (`continue`, `stop`, `retry`)
- Implement timeouts for external API calls
- Add fallback mechanisms for critical paths

### 3. Performance Optimization
- Use streaming for real-time responses
- Enable parallel tool execution when possible
- Implement caching for expensive operations
- Consider edge deployment for low latency

### 4. Security
- Validate and sanitize tool inputs
- Use sandboxed execution for untrusted code
- Implement rate limiting for API calls
- Store API keys securely

## 🔧 Customization

### Adding Custom Nodes
```typescript
import { BaseNode } from '@fluxgraph/core';

export class CustomAINode extends BaseNode {
  protected async processPacket(packet: DataPacket) {
    // Your custom AI logic here
    return transformedPacket;
  }
}
```

### Creating Custom Tools
```typescript
const customTool: Tool = {
  name: 'my_tool',
  description: 'Does something useful',
  parameters: { /* JSON Schema */ },
  function: async (args) => {
    // Tool implementation
    return result;
  }
};
```

### Building Custom Templates
```typescript
import { GraphBuilder } from '@fluxgraph/core';

const customTemplate = GraphBuilder.create('My AI Workflow')
  .nodes(/* your nodes */)
  .edges(/* your edges */)
  .config(/* your config */)
  .build();
```

## 🌐 Deployment

### Cloudflare Workers
```typescript
export default {
  async fetch(request: Request, env: Env) {
    const graph = new GraphRunner(yourGraph);
    await graph.initialize();
    await graph.start();
    
    const data = await request.json();
    await graph.inject('input', data);
    
    return new Response(JSON.stringify(results));
  }
};
```

### Durable Objects
```typescript
export class AIWorkflow extends DurableObject {
  private graph: GraphRunner;
  
  async fetch(request: Request) {
    if (!this.graph) {
      this.graph = new GraphRunner(yourGraph);
      await this.graph.initialize();
    }
    // Handle requests
  }
}
```

## 📊 Monitoring

Track your AI workflows with built-in metrics:
```typescript
const metrics = graph.getMetrics();
console.log({
  packetsProcessed: metrics.packetsProcessed,
  averageLatency: metrics.totalLatency,
  nodeMetrics: metrics.nodeMetrics
});
```

## 🤝 Contributing

We welcome contributions! Feel free to:
- Add new examples
- Improve existing examples
- Report issues
- Suggest enhancements

## 📄 License

MIT License - See LICENSE file for details