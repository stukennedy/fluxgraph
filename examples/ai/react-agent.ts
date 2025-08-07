/**
 * ReAct (Reasoning + Acting) Agent Example
 *
 * This example shows how to build an autonomous agent that can
 * reason about tasks and take actions using tools.
 */

import { Graph, GraphDefinition, Tool } from '@fluxgraph/core';
import { js } from '@fluxgraph/core/utils';

// Define available tools for the agent
const agentTools: Tool[] = [
  {
    name: 'search_web',
    description: 'Search the web for information',
    parameters: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Search query' },
      },
      required: ['query'],
    },
    function: async ({ query }: { query: string }) => {
      // Simulated web search
      return {
        results: [`FluxGraph is a stream processing library for edge computing`, `It supports AI workflows with LLM and tool nodes`, `Optimized for Cloudflare Workers deployment`],
        query,
        timestamp: Date.now(),
      };
    },
  },

  {
    name: 'calculate',
    description: 'Perform mathematical calculations',
    parameters: {
      type: 'object',
      properties: {
        expression: { type: 'string', description: 'Math expression to evaluate' },
      },
      required: ['expression'],
    },
    function: ({ expression }: { expression: string }) => {
      try {
        // Safe math evaluation (in production use math.js)
        const result = Function('"use strict"; return (' + expression + ')')();
        return { result, expression };
      } catch (error) {
        return { error: 'Invalid expression', expression };
      }
    },
  },

  {
    name: 'read_file',
    description: 'Read content from a file',
    parameters: {
      type: 'object',
      properties: {
        filename: { type: 'string', description: 'File name to read' },
      },
      required: ['filename'],
    },
    function: async ({ filename }: { filename: string }) => {
      // Simulated file reading
      const files = {
        'readme.txt': 'FluxGraph Documentation...',
        'config.json': '{"version": "0.1.0", "features": ["ai", "streaming"]}',
        'data.csv': 'id,name,value\n1,test,100\n2,demo,200',
      };
      return files[filename as keyof typeof files] || 'File not found';
    },
  },

  {
    name: 'analyze_data',
    description: 'Analyze data and provide insights',
    parameters: {
      type: 'object',
      properties: {
        data: { type: 'array', description: 'Data to analyze' },
        operation: { type: 'string', description: 'Analysis operation (sum, average, max, min)' },
      },
      required: ['data', 'operation'],
    },
    function: ({ data, operation }: { data: any[]; operation: string }) => {
      const numbers = data.filter((x) => typeof x === 'number');
      switch (operation) {
        case 'sum':
          return { result: numbers.reduce((a, b) => a + b, 0), operation };
        case 'average':
          return { result: numbers.reduce((a, b) => a + b, 0) / numbers.length, operation };
        case 'max':
          return { result: Math.max(...numbers), operation };
        case 'min':
          return { result: Math.min(...numbers), operation };
        default:
          return { error: 'Unknown operation', operation };
      }
    },
  },
];

const reactAgent: GraphDefinition = {
  id: 'react-agent',
  name: 'ReAct Autonomous Agent',
  description: 'Agent that reasons and acts to complete tasks',

  nodes: [
    {
      id: 'task-input',
      type: 'source',
      name: 'Task Input',
      sourceType: 'manual',
      config: {},
    },

    {
      id: 'thought-memory',
      type: 'memory',
      name: 'Agent Thoughts',
      memoryType: 'conversation',
      maxEntries: 50,
    },

    {
      id: 'reasoner',
      type: 'transform',
      name: 'Mock Reasoning Engine',
      transformFunction: js`
        // Mock ReAct reasoning based on task and context
        const task = data.task || data.originalTask;
        let response = '';
        
        // Logic to handle different task types and show results
        if (data.toolResults && data.toolResults.result) {
          // We have a tool result, complete the task with the actual result
          const result = data.toolResults.result;
          response = 'Thought: I have the calculation result: ' + result + '. Now I can provide the final answer.\n\nAction: finish\nAnswer: The result is ' + result + '.';
        } else if (data.toolResults && data.toolResults.content) {
          // We have file content, complete the task
          const content = data.toolResults.content;
          response = 'Thought: I have read the file content: ' + content + '. Now I can provide the answer.\n\nAction: finish\nAnswer: The file contains: ' + content + '.';
        } else if (task.includes('25 * 4 + 10')) {
          response = 'Thought: I need to calculate 25 * 4 + 10. This is a mathematical calculation.\n\nAction: calculate("25 * 4 + 10")';
        } else if (task.includes('search') || task.includes('find')) {
          response = 'Thought: I need to search for information about FluxGraph.\n\nAction: search_web({"query": "FluxGraph features"})';
        } else if (task.includes('read') || task.includes('file')) {
          response = 'Thought: I need to read a file to get information.\n\nAction: read_file({"filename": "readme.txt"})';
        } else if (task.includes('average') || task.includes('10, 20, 30, 40, 50')) {
          // Calculate average directly
          const numbers = [10, 20, 30, 40, 50];
          const average = numbers.reduce((a, b) => a + b, 0) / numbers.length;
          response = 'Thought: I can calculate the average directly.\n\nAction: finish\nAnswer: The average of 10, 20, 30, 40, 50 is ' + average + '.';
        } else {
          response = 'Thought: I can answer this directly.\n\nAction: finish\nAnswer: Based on my analysis, I can provide a comprehensive answer to your question.';
        }
        
        return {
          ...data,
          response,
          model: 'mock-reasoner',
        };
      `,
    },

    {
      id: 'action-parser',
      type: 'transform',
      name: 'Action Parser',
      transformFunction: js`
        const response = data.response;

        // Parse the agent's response for actions
        const actionMatch = response.match(/Action:\s*(\w+)/i);
        const action = actionMatch ? actionMatch[1].toLowerCase() : null;

        if (action === 'finish') {
          // Handle escaped quotes and newlines in the response
          const cleanResponse = response.replace(/\\n/g, '\n').replace(/\\"/g, '"');
          const answerMatch = cleanResponse.match(/Answer:\s*(.+)/is);
          const finalAnswer = answerMatch ? answerMatch[1].trim() : response;
          return {
            ...data,
            isComplete: true,
            finalAnswer: finalAnswer,
            thought: response,
          };
        }

        // Parse tool call
        const toolMatch = response.match(/Action:\s*(\w+)\((.*?)\)/is);
        if (toolMatch) {
          const toolName = toolMatch[1];
          const toolArgs = toolMatch[2];

          return {
            ...data,
            needsTool: true,
            toolName,
            toolArgs: JSON.parse(toolArgs || '{}'),
            thought: response,
          };
        }

        // Extract tool call from natural language
        const agentTools = [
          { name: 'search_web', description: 'Search the web for information' },
          { name: 'calculate', description: 'Perform mathematical calculations' },
          { name: 'read_file', description: 'Read content from a file' },
          { name: 'analyze_data', description: 'Analyze data and provide insights' }
        ];
        
        // Check for tool usage in the response
        for (const tool of agentTools) {
          if (response.toLowerCase().includes(tool.name)) {
            const result = {
              ...data,
              needsTool: true,
              toolName: tool.name,
              toolArgs: {}, // Would need NLP to extract args
              thought: response,
            };
            return result;
          }
        }

        // Check for finish action
        if (response.toLowerCase().includes('action: finish')) {
          // Handle escaped quotes and newlines in the response
          const cleanResponse = response.replace(/\\n/g, '\n').replace(/\\"/g, '"');
          const answerMatch = cleanResponse.match(/Answer:\s*(.+)/is);
          const finalAnswer = answerMatch ? answerMatch[1].trim() : 'Task completed successfully';
          const result = {
            ...data,
            isComplete: true,
            finalAnswer: finalAnswer,
            thought: response,
          };
          return result;
        }

        // Default case - needs clarification
        const result = {
          ...data,
          thought: response,
          needsClarification: true,
        };
        return result;
      `,
    },

    {
      id: 'tool-executor',
      type: 'transform',
      name: 'Mock Tool Executor',
      transformFunction: js`
        // Mock tool execution
        if (data.toolName === 'calculate') {
          // Extract the calculation from the thought
          const thought = data.thought || '';
          const match = thought.match(/calculate\("([^"]+)"\)/);
          const expression = match ? match[1] : '25 * 4 + 10';
          const result = eval(expression);
          return {
            ...data,
            toolResults: { result },
            observation: 'Calculation result: ' + result,
          };
        } else if (data.toolName === 'read_file') {
          return {
            ...data,
            toolResults: { content: 'Mock file content: {"version": "1.0.0"}' },
            observation: 'File read successfully',
          };
        } else if (data.toolName === 'search_web') {
          return {
            ...data,
            toolResults: { results: 'Mock web search results' },
            observation: 'Web search completed',
          };
        } else if (data.toolName === 'analyze_data') {
          return {
            ...data,
            toolResults: { analysis: 'Mock data analysis' },
            observation: 'Data analysis completed',
          };
        }
        
        return {
          ...data,
          toolResults: { error: 'Unknown tool' },
          observation: 'Tool not implemented',
        };
      `,
    },

    {
      id: 'observation-formatter',
      type: 'transform',
      name: 'Observation Formatter',
      transformFunction: js`
        if (data.toolResults) {
          const observation = 'Observation: ' + JSON.stringify(data.toolResults, null, 2);

          return {
            ...data,
            prompt: data.thought + '\\n\\n' + observation + '\\n\\nBased on this observation, what is your next thought and action?',
            continueReasoning: true,
          };
        }

        return data;
      `,
    },

    {
      id: 'completion-checker',
      type: 'filter',
      name: 'Check Completion',
      filterFunction: 'return !data.isComplete;',
    },

    {
      id: 'output',
      type: 'sink',
      name: 'Agent Output',
      sinkType: 'custom',
      config: {
        callback: async (packet: any) => {
          if (packet.data.isComplete) {
            console.log('\n════════════════════════════════════════');
            console.log('Task:', packet.data.originalTask);
            console.log('\nFinal Answer:', packet.data.finalAnswer);
            console.log('════════════════════════════════════════\n');
          } else if (packet.data.thought) {
            console.log('\n🤔 Thought:', packet.data.thought);
            if (packet.data.toolName) {
              console.log('🔧 Using tool:', packet.data.toolName);
            }
          }
        },
      },
    },
  ],

  edges: [
    { from: 'task-input', to: 'thought-memory' },
    { from: 'thought-memory', to: 'reasoner' },
    { from: 'reasoner', to: 'action-parser' },
    { from: 'action-parser', to: 'tool-executor' },
    { from: 'tool-executor', to: 'observation-formatter' },
    { from: 'observation-formatter', to: 'completion-checker' },
    { from: 'completion-checker', to: 'thought-memory' },
    { from: 'action-parser', to: 'output' },
    { from: 'observation-formatter', to: 'output' },
  ],

  config: {
    allowCycles: true,
    maxIterations: 5,
    errorStrategy: 'continue',
  },
};

// Usage example
async function runReActAgent() {
  const agent = new Graph(reactAgent);

  // Add debugging to see graph events
  agent.on('graph:started', () => console.log('Graph started'));
  agent.on('graph:stopped', () => console.log('Graph stopped'));
  agent.on('graph:error', (event: any) => console.error('Graph error:', event.error));

  await agent.initialize();
  await agent.start();

  // Example tasks for the agent
  const tasks = [
    'What is 25 * 4 + 10?',
    'Search for information about FluxGraph and summarize its main features',
    'Read the file config.json and tell me what version it is',
    'Calculate the average of these numbers: 10, 20, 30, 40, 50',
  ];

  for (const task of tasks) {
    console.log('\n🎯 New Task:', task);
    console.log('─'.repeat(50));

    await agent.inject('task-input', {
      prompt: task,
      originalTask: task,
      timestamp: Date.now(),
    });

    // Wait for agent to complete the task
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  await agent.stop();
}

// Run the example with bun
if (import.meta.main) {
  runReActAgent().catch(console.error);
}

export { reactAgent, runReActAgent, agentTools };
