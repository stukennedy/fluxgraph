/**
 * Multi-Agent Collaboration Example
 *
 * This example demonstrates multiple specialized agents working
 * together to solve complex problems.
 */

import { Graph, GraphDefinition } from '@fluxgraph/core';
import { js } from '@fluxgraph/core/utils';

const multiAgentSystem: GraphDefinition = {
  id: 'multi-agent-system',
  name: 'Collaborative Multi-Agent System',
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
      type: 'transform',
      name: 'Mock Coordinator Agent',
      transformFunction: js`
        // Mock coordinator agent that delegates tasks
        const task = data.originalTask || data.prompt;
        let response = '';
        
        if (task.includes('research') || task.includes('find') || task.includes('search')) {
          response = 'DELEGATE_TO: research\\nTASK: Gather information about ' + task;
        } else if (task.includes('code') || task.includes('implement') || task.includes('function')) {
          response = 'DELEGATE_TO: code\\nTASK: Implement ' + task;
        } else if (task.includes('test') || task.includes('validate')) {
          response = 'DELEGATE_TO: qa\\nTASK: Test and validate ' + task;
        } else {
          // Default delegation to research
          response = 'DELEGATE_TO: research\\nTASK: Research and analyze ' + task;
        }
        
        return {
          ...data,
          response,
          model: 'mock-coordinator',
        };
      `,
    },

    {
      id: 'delegation-router',
      type: 'transform',
      name: 'Delegation Router',
      transformFunction: js`
        const response = data.response;
        const delegations = [];

        // Parse delegations from coordinator
        const matches = response.matchAll(/DELEGATE_TO:\\s*(\\w+)\\s*\\nTASK:\\s*([^\\n]+)/g);

        for (const match of matches) {
          delegations.push({
            agent: match[1].toLowerCase(),
            task: match[2].trim(),
          });
        }

        if (delegations.length === 0) {
          // If no explicit delegation, try to infer
          if (response.toLowerCase().includes('research') || response.toLowerCase().includes('find') || response.toLowerCase().includes('search')) {
            delegations.push({ agent: 'research', task: data.originalTask });
          }
          if (response.toLowerCase().includes('code') || response.toLowerCase().includes('implement') || response.toLowerCase().includes('function')) {
            delegations.push({ agent: 'code', task: data.originalTask });
          }
          if (response.toLowerCase().includes('test') || response.toLowerCase().includes('validate') || response.toLowerCase().includes('check')) {
            delegations.push({ agent: 'qa', task: data.originalTask });
          }
        }

        return {
          ...data,
          delegations,
          coordinatorAnalysis: response,
        };
      `,
    },

    {
      id: 'research-agent',
      type: 'transform',
      name: 'Mock Research Specialist',
      transformFunction: js`
        // Mock research agent
        const task = data.task || data.originalTask;
        const response = 'Research completed for: ' + task + '. Key findings: This is a comprehensive analysis with multiple data points and insights.';
        
        return {
          ...data,
          response,
          agentType: 'research',
          model: 'mock-research',
        };
      `,
    },

    {
      id: 'code-agent',
      type: 'transform',
      name: 'Mock Code Specialist',
      transformFunction: js`
        // Mock code agent
        const task = data.task || data.originalTask;
        const response = 'Code implementation completed for: ' + task + '. The solution includes proper error handling, documentation, and follows best practices.';
        
        return {
          ...data,
          response,
          agentType: 'code',
          model: 'mock-code',
        };
      `,
    },

    {
      id: 'qa-agent',
      type: 'transform',
      name: 'Mock QA Specialist',
      transformFunction: js`
        // Mock QA agent
        const task = data.task || data.originalTask;
        const response = 'QA testing completed for: ' + task + '. All tests passed. Quality standards met with recommendations for edge case handling.';
        
        return {
          ...data,
          response,
          agentType: 'qa',
          model: 'mock-qa',
        };
      `,
    },

    {
      id: 'agent-dispatcher',
      type: 'transform',
      name: 'Agent Dispatcher',
      transformFunction: js`
        // Route to appropriate specialist agents based on delegations
        for (const delegation of data.delegations || []) {
          const agentTask = {
            prompt: delegation.task,
            context: data.coordinatorAnalysis,
          };

          // Mark which agent should handle this
          data[delegation.agent + 'Task'] = agentTask;
          data['needs' + delegation.agent.charAt(0).toUpperCase() + delegation.agent.slice(1)] = true;
        }

        // Always trigger at least one agent for demo
        if (!data.needsResearch && !data.needsCode && !data.needsQa) {
          data.needsResearch = true;
          data.researchTask = { prompt: data.originalTask, context: 'Default research task' };
        }

        return data;
      `,
    },

    {
      id: 'response-aggregator',
      type: 'transform',
      name: 'Response Aggregator',
      transformFunction: js`
        const responses = {};

        // Collect responses from all agents
        if (data.response && data.agentType === 'research') {
          responses.research = data.response;
        }
        if (data.response && data.agentType === 'code') {
          responses.code = data.response;
        }
        if (data.response && data.agentType === 'qa') {
          responses.qa = data.response;
        }

        // If we already have responses, add to them
        if (data.agentResponses) {
          Object.assign(responses, data.agentResponses);
        }

        return {
          ...data,
          agentResponses: responses,
          needsSynthesis: Object.keys(responses).length > 0,
        };
      `,
    },

    {
      id: 'synthesis-agent',
      type: 'transform',
      name: 'Mock Synthesis Agent',
      transformFunction: js`
        // Mock synthesis agent
        const task = data.originalTask;
        const agentResponses = data.agentResponses || {};
        
        let synthesis = 'Synthesis completed for: ' + task + '.\\n\\n';
        
        if (agentResponses.research) {
          synthesis += 'Research findings: ' + agentResponses.research + '\\n\\n';
        }
        if (agentResponses.code) {
          synthesis += 'Code implementation: ' + agentResponses.code + '\\n\\n';
        }
        if (agentResponses.qa) {
          synthesis += 'QA validation: ' + agentResponses.qa + '\\n\\n';
        }
        
        synthesis += 'Final recommendation: This is a comprehensive solution that addresses all aspects of the task.';
        
        return {
          ...data,
          response: synthesis,
          model: 'mock-synthesis',
        };
      `,
    },

    {
      id: 'team-memory',
      type: 'memory',
      name: 'Team Knowledge Base',
      memoryType: 'hybrid',
      maxEntries: 200,
      embeddingDimension: 384,
    },

    {
      id: 'output',
      type: 'sink',
      name: 'System Output',
      sinkType: 'custom',
      config: {
        callback: async (packet: any) => {
          const data = packet.data;

          console.log('\n╔══════════════════════════════════════════════╗');
          console.log('║         MULTI-AGENT SYSTEM RESPONSE         ║');
          console.log('╚══════════════════════════════════════════════╝\n');

          console.log('📋 Original Task:', data.originalTask);
          console.log('\n👥 Coordinator Analysis:');
          console.log(data.coordinatorAnalysis);

          if (data.agentResponses) {
            console.log('\n🔬 Agent Responses:');
            for (const [agent, response] of Object.entries(data.agentResponses)) {
              console.log(`\n  ${agent.toUpperCase()} Agent:`);
              console.log(`  ${response}`);
            }
          }

          if (data.finalSynthesis) {
            console.log('\n✨ Final Synthesis:');
            console.log(data.finalSynthesis);
          }

          console.log('\n' + '═'.repeat(50) + '\n');
        },
      },
    },
  ],

  edges: [
    // Main flow
    { from: 'task-input', to: 'coordinator' },
    { from: 'coordinator', to: 'delegation-router' },
    { from: 'delegation-router', to: 'agent-dispatcher' },

    // Dispatch to specialist agents (simplified - no conditions)
    { from: 'agent-dispatcher', to: 'research-agent' },
    { from: 'agent-dispatcher', to: 'code-agent' },
    { from: 'agent-dispatcher', to: 'qa-agent' },

    // Collect responses
    { from: 'research-agent', to: 'response-aggregator' },
    { from: 'code-agent', to: 'response-aggregator' },
    { from: 'qa-agent', to: 'response-aggregator' },

    // Synthesis and output
    { from: 'response-aggregator', to: 'synthesis-agent' },
    { from: 'synthesis-agent', to: 'team-memory' },
    { from: 'team-memory', to: 'output' },
  ],

  config: {
    allowCycles: false,
    errorStrategy: 'continue',
    bufferSize: 20,
  },
};

// Usage example
async function runMultiAgentSystem() {
  const system = new Graph(multiAgentSystem);

  await system.initialize();
  await system.start();

  // Example collaborative tasks
  const tasks = [
    'Design and implement a rate limiting system for an API',
    'Research best practices for edge computing and create a deployment strategy',
    'Analyze the performance implications of using WebAssembly in browsers',
    'Create a testing strategy for a real-time streaming application',
  ];

  for (const task of tasks) {
    await system.inject('task-input', {
      prompt: task,
      originalTask: task,
      timestamp: Date.now(),
    });

    // Wait for agents to collaborate
    await new Promise((resolve) => setTimeout(resolve, 5000));
  }

  // Get team memory statistics
  const teamKnowledge = await system.getVariable('teamKnowledge');
  console.log('\n📚 Team Knowledge Base:', teamKnowledge);

  await system.stop();
}

// Run the example with bun
if (import.meta.main) {
  runMultiAgentSystem().catch(console.error);
}

export { multiAgentSystem, runMultiAgentSystem };
