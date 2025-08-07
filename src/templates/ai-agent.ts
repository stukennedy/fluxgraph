import { GraphDefinition } from '@/core/types';
import { js } from '@/utils';

/**
 * ReAct Agent Template
 * Implements Reasoning + Acting pattern for autonomous AI agents
 */
export const reactAgentTemplate: GraphDefinition = {
  id: 'react-agent',
  name: 'ReAct Agent',
  version: '1.0.0',
  description: 'Autonomous agent that reasons and acts to complete tasks',
  nodes: [
    {
      id: 'input',
      type: 'source',
      name: 'User Input',
      sourceType: 'manual',
      config: {},
    },
    {
      id: 'memory',
      type: 'memory',
      name: 'Agent Memory',
      memoryType: 'hybrid',
      maxEntries: 100,
      summarizationInterval: 300000, // 5 minutes
    },
    {
      id: 'think',
      type: 'llm',
      name: 'Reasoning Step',
      model: 'gpt-4',
      systemPrompt: `You are a ReAct agent. Given the user's request and your previous actions, reason about what to do next.
      
      Format your response as:
      THOUGHT: [Your reasoning about the current situation]
      ACTION: [The action you want to take - either 'tool' or 'respond']
      ACTION_INPUT: [Input for the action]
      
      Available tools: web_search, calculator, code_executor
      
      If you have enough information to answer, use ACTION: respond`,
      temperature: 0.7,
      maxTokens: 500,
    },
    {
      id: 'parse-action',
      type: 'transform',
      name: 'Parse Agent Output',
      transformFunction: js`
        const text = data.response || data;
        const thought = text.match(/THOUGHT: (.+)/)?.[1];
        const action = text.match(/ACTION: (.+)/)?.[1];
        const actionInput = text.match(/ACTION_INPUT: (.+)/)?.[1];
        
        return {
          thought,
          action: action?.toLowerCase().trim(),
          actionInput,
          needsTool: action?.toLowerCase().includes('tool'),
          isComplete: action?.toLowerCase().includes('respond'),
          originalResponse: text
        };
      `,
      outputSchema: {},
    },
    {
      id: 'router',
      type: 'filter',
      name: 'Route Decision',
      filterFunction: js`
        // Route to tools if action requires it
        return data.needsTool === true;
      `,
    },
    {
      id: 'tools',
      type: 'tool',
      name: 'Tool Executor',
      tools: [
        {
          name: 'web_search',
          description: 'Search the web for information',
          parameters: {
            type: 'object',
            properties: {
              query: { type: 'string' },
            },
            required: ['query'],
          },
        },
        {
          name: 'calculator',
          description: 'Perform calculations',
          parameters: {
            type: 'object',
            properties: {
              expression: { type: 'string' },
            },
            required: ['expression'],
          },
        },
        {
          name: 'code_executor',
          description: 'Execute code',
          parameters: {
            type: 'object',
            properties: {
              code: { type: 'string' },
            },
            required: ['code'],
          },
        },
      ],
      parallelExecution: false,
    },
    {
      id: 'observe',
      type: 'transform',
      name: 'Process Tool Results',
      transformFunction: js`
        return {
          observation: data.toolResults,
          needsMoreThinking: true,
          history: data.history || []
        };
      `,
      outputSchema: {},
    },
    {
      id: 'check-complete',
      type: 'filter',
      name: 'Check if Complete',
      filterFunction: js`
        return data.isComplete === true || data.iterations > 5;
      `,
    },
    {
      id: 'format-response',
      type: 'transform',
      name: 'Format Final Response',
      transformFunction: js`
        return {
          response: data.actionInput || data.thought,
          reasoning: data.thought,
          toolsUsed: data.history?.map(h => h.tool) || [],
          iterations: data.iterations || 1
        };
      `,
      outputSchema: {},
    },
    {
      id: 'output',
      type: 'sink',
      name: 'Send Response',
      sinkType: 'log',
      config: {},
    },
  ],
  edges: [
    { id: 'e1', from: 'input', to: 'memory' },
    { id: 'e2', from: 'memory', to: 'think' },
    { id: 'e3', from: 'think', to: 'parse-action' },
    { id: 'e4', from: 'parse-action', to: 'router' },
    { id: 'e5', from: 'router', to: 'tools' },
    { id: 'e6', from: 'tools', to: 'observe' },
    { id: 'e7', from: 'observe', to: 'memory' }, // Loop back to memory
    { id: 'e8', from: 'memory', to: 'think', condition: 'data.needsMoreThinking' }, // Loop back to thinking
    { id: 'e9', from: 'parse-action', to: 'check-complete' },
    { id: 'e10', from: 'check-complete', to: 'format-response' },
    { id: 'e11', from: 'format-response', to: 'output' },
  ],
  config: {
    errorStrategy: 'continue',
    allowCycles: true,
    maxIterations: 10,
    enableCheckpointing: true,
  },
};

/**
 * RAG (Retrieval Augmented Generation) Pipeline
 */
export const ragPipelineTemplate: GraphDefinition = {
  id: 'rag-pipeline',
  name: 'RAG Pipeline',
  version: '1.0.0',
  description: 'Retrieval-augmented generation for accurate, grounded responses',
  nodes: [
    {
      id: 'query-input',
      type: 'source',
      name: 'User Query',
      sourceType: 'manual',
      config: {},
    },
    {
      id: 'query-embedding',
      type: 'transform',
      name: 'Generate Query Embedding',
      transformFunction: js`
        // In production, call embedding API
        // For demo, using mock embedding
        return {
          ...data,
          embedding: Array.from({ length: 384 }, () => Math.random())
        };
      `,
      outputSchema: {},
    },
    {
      id: 'vector-search',
      type: 'memory',
      name: 'Vector Database',
      memoryType: 'semantic',
      embeddingDimension: 384,
      maxEntries: 10000,
    },
    {
      id: 'rerank',
      type: 'transform',
      name: 'Rerank Results',
      transformFunction: js`
        // Rerank search results by relevance
        const results = data.memory || [];
        
        // Sort by score and take top 5
        const topResults = results
          .sort((a, b) => (b.score || 0) - (a.score || 0))
          .slice(0, 5);
        
        return {
          ...data,
          context: topResults.map(r => r.content).join('\\n\\n'),
          sources: topResults.map(r => r.metadata?.source)
        };
      `,
      outputSchema: {},
    },
    {
      id: 'augment-prompt',
      type: 'transform',
      name: 'Build Augmented Prompt',
      transformFunction: js`
        const augmentedPrompt = \`
        Context:
        \${data.context}
        
        Question: \${data.query}
        
        Please answer the question based on the provided context. If the context doesn't contain relevant information, say so.
        \`;
        
        return {
          ...data,
          prompt: augmentedPrompt
        };
      `,
      outputSchema: {},
    },
    {
      id: 'generate',
      type: 'llm',
      name: 'Generate Response',
      model: 'gpt-4',
      temperature: 0.3,
      maxTokens: 1000,
      systemPrompt: 'You are a helpful assistant that provides accurate, grounded responses based on the provided context.',
    },
    {
      id: 'add-citations',
      type: 'transform',
      name: 'Add Source Citations',
      transformFunction: js`
        return {
          response: data.response,
          sources: data.sources?.filter(Boolean) || [],
          confidence: data.context ? 'high' : 'low'
        };
      `,
      outputSchema: {},
    },
    {
      id: 'response-output',
      type: 'sink',
      name: 'Send Response',
      sinkType: 'log',
      config: {},
    },
  ],
  edges: [
    { id: 'e1', from: 'query-input', to: 'query-embedding' },
    { id: 'e2', from: 'query-embedding', to: 'vector-search' },
    { id: 'e3', from: 'vector-search', to: 'rerank' },
    { id: 'e4', from: 'rerank', to: 'augment-prompt' },
    { id: 'e5', from: 'augment-prompt', to: 'generate' },
    { id: 'e6', from: 'generate', to: 'add-citations' },
    { id: 'e7', from: 'add-citations', to: 'response-output' },
  ],
  config: {
    errorStrategy: 'continue',
    streamingMode: true,
  },
};

/**
 * Multi-Agent Collaboration Template
 */
export const multiAgentTemplate: GraphDefinition = {
  id: 'multi-agent',
  name: 'Multi-Agent System',
  version: '1.0.0',
  description: 'Multiple specialized agents working together',
  nodes: [
    {
      id: 'task-input',
      type: 'source',
      name: 'Task Input',
      sourceType: 'manual',
      config: {},
    },
    {
      id: 'coordinator',
      type: 'llm',
      name: 'Coordinator Agent',
      model: 'gpt-4',
      systemPrompt: `You are a coordinator agent. Break down the task into subtasks and delegate to specialized agents:
      - researcher: For information gathering
      - analyst: For data analysis
      - writer: For content creation
      
      Output format:
      TASK: [main task]
      SUBTASKS:
      1. [agent: researcher] [subtask]
      2. [agent: analyst] [subtask]
      3. [agent: writer] [subtask]`,
      temperature: 0.5,
    },
    {
      id: 'task-splitter',
      type: 'split',
      name: 'Split Tasks',
      splitFunction: js`
        const text = data.response;
        const subtasks = text.match(/\\d+\\. \\[agent: (\\w+)\\] (.+)/g) || [];
        
        return subtasks.map(task => {
          const [, agent, subtask] = task.match(/\\d+\\. \\[agent: (\\w+)\\] (.+)/);
          return { agent, subtask, parentTask: data.task };
        });
      `,
    },
    {
      id: 'researcher',
      type: 'llm',
      name: 'Research Agent',
      model: 'gpt-4',
      systemPrompt: 'You are a research agent. Gather and summarize information on the given topic.',
      temperature: 0.3,
    },
    {
      id: 'analyst',
      type: 'llm',
      name: 'Analyst Agent',
      model: 'gpt-4',
      systemPrompt: 'You are an analyst agent. Analyze data and provide insights.',
      temperature: 0.4,
    },
    {
      id: 'writer',
      type: 'llm',
      name: 'Writer Agent',
      model: 'gpt-4',
      systemPrompt: 'You are a writer agent. Create clear, engaging content based on the provided information.',
      temperature: 0.7,
    },
    {
      id: 'merge-results',
      type: 'merge',
      name: 'Merge Agent Results',
      mergeStrategy: 'custom',
      mergeFunction: js`
        // Combine results from all agents
        const results = data.map(d => ({
          agent: d.agent,
          result: d.response
        }));
        
        return {
          taskCompleted: true,
          results,
          summary: results.map(r => \`\${r.agent}: \${r.result}\`).join('\\n\\n')
        };
      `,
    },
    {
      id: 'final-output',
      type: 'sink',
      name: 'Final Output',
      sinkType: 'log',
      config: {},
    },
  ],
  edges: [
    { id: 'e1', from: 'task-input', to: 'coordinator' },
    { id: 'e2', from: 'coordinator', to: 'task-splitter' },
    { id: 'e3', from: 'task-splitter', to: 'researcher', condition: "data.agent === 'researcher'" },
    { id: 'e4', from: 'task-splitter', to: 'analyst', condition: "data.agent === 'analyst'" },
    { id: 'e5', from: 'task-splitter', to: 'writer', condition: "data.agent === 'writer'" },
    { id: 'e6', from: 'researcher', to: 'merge-results' },
    { id: 'e7', from: 'analyst', to: 'merge-results' },
    { id: 'e8', from: 'writer', to: 'merge-results' },
    { id: 'e9', from: 'merge-results', to: 'final-output' },
  ],
  config: {
    errorStrategy: 'continue',
    maxConcurrency: 3,
  },
};

/**
 * Conversational AI Template
 */
export const conversationalAITemplate: GraphDefinition = {
  id: 'conversational-ai',
  name: 'Conversational AI',
  version: '1.0.0',
  description: 'Stateful conversation with memory and context',
  nodes: [
    {
      id: 'user-input',
      type: 'source',
      name: 'User Message',
      sourceType: 'websocket',
      config: {
        url: 'wss://chat.example.com/ws',
      },
    },
    {
      id: 'conversation-memory',
      type: 'memory',
      name: 'Conversation History',
      memoryType: 'conversation',
      maxEntries: 50,
      ttl: 3600000, // 1 hour
    },
    {
      id: 'intent-classifier',
      type: 'llm',
      name: 'Classify Intent',
      model: 'gpt-3.5-turbo',
      systemPrompt: `Classify the user's intent into one of these categories:
      - question: User is asking a question
      - command: User wants to perform an action
      - feedback: User is providing feedback
      - greeting: User is greeting
      - goodbye: User is saying goodbye
      
      Respond with just the category name.`,
      temperature: 0.1,
      maxTokens: 10,
    },
    {
      id: 'response-generator',
      type: 'llm',
      name: 'Generate Response',
      model: 'gpt-4',
      systemPrompt: 'You are a helpful, friendly AI assistant. Maintain context across the conversation.',
      temperature: 0.7,
      maxTokens: 500,
      streaming: true,
    },
    {
      id: 'sentiment-analyzer',
      type: 'transform',
      name: 'Analyze Sentiment',
      transformFunction: js`
        // Simple sentiment analysis
        const text = data.response?.toLowerCase() || '';
        let sentiment = 'neutral';
        
        if (text.includes('happy') || text.includes('great') || text.includes('excellent')) {
          sentiment = 'positive';
        } else if (text.includes('sad') || text.includes('bad') || text.includes('terrible')) {
          sentiment = 'negative';
        }
        
        return {
          ...data,
          sentiment,
          timestamp: Date.now()
        };
      `,
      outputSchema: {},
    },
    {
      id: 'response-output',
      type: 'sink',
      name: 'Send to User',
      sinkType: 'websocket',
      config: {
        url: 'wss://chat.example.com/ws',
        format: 'json',
      },
    },
  ],
  edges: [
    { id: 'e1', from: 'user-input', to: 'conversation-memory' },
    { id: 'e2', from: 'conversation-memory', to: 'intent-classifier' },
    { id: 'e3', from: 'intent-classifier', to: 'response-generator' },
    { id: 'e4', from: 'response-generator', to: 'sentiment-analyzer' },
    { id: 'e5', from: 'sentiment-analyzer', to: 'conversation-memory' }, // Store in memory
    { id: 'e6', from: 'sentiment-analyzer', to: 'response-output' },
  ],
  config: {
    errorStrategy: 'continue',
    streamingMode: true,
    enableCheckpointing: true,
  },
};

export default {
  reactAgentTemplate,
  ragPipelineTemplate,
  multiAgentTemplate,
  conversationalAITemplate,
};