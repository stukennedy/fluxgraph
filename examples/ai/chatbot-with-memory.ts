/**
 * Chatbot with Conversation Memory Example
 *
 * This example shows how to build a conversational AI assistant
 * with memory that maintains context across interactions.
 */

import { Graph, GraphDefinition } from '@fluxgraph/core';

// Define the chatbot graph
const chatbotGraph: GraphDefinition = {
  id: 'conversational-chatbot',
  name: 'AI Chatbot with Memory',
  description: 'A conversational assistant that remembers context',

  nodes: [
    {
      id: 'input',
      type: 'source',
      name: 'User Input',
      sourceType: 'manual',
      config: {
        // Manual sources don't need additional config
      },
    },

    {
      id: 'llm',
      type: 'transform',
      name: 'Mock AI Assistant',
      transformFunction: `
        // Mock AI responses for testing
        const responses = [
          "Hello Alex! It's great to meet you. I'm excited to help you learn about AI. What specific aspects interest you most?",
          "You told me your name is Alex and you're interested in learning about AI!",
          "For beginners, I'd recommend starting with Python basics, then exploring machine learning libraries like scikit-learn and TensorFlow. Online courses on Coursera or edX are excellent resources.",
          "That's fantastic! With your Python background, you're already well-positioned for AI. You can dive into libraries like PyTorch, TensorFlow, and scikit-learn.",
          "Given your Python background and interest in AI, I'd recommend focusing on: 1) Machine Learning fundamentals, 2) Deep Learning with PyTorch/TensorFlow, 3) Natural Language Processing, and 4) Computer Vision. Your programming experience will be a huge advantage!"
        ];

        const responseIndex = Math.floor(Math.random() * responses.length);
        const response = responses[responseIndex];

        return {
          ...data,
          response,
          model: 'mock-ai',
          usage: { total_tokens: response.length }
        };
      `,
    },

    {
      id: 'output',
      type: 'sink',
      name: 'Response Output',
      sinkType: 'custom',
      config: {
        callback: async (packet: any) => {
          // Sink node callback - no need to log here since we have a subscription
        },
      },
    },
  ],

  edges: [
    { from: 'input', to: 'llm' },
    { from: 'llm', to: 'output' },
  ],

  config: {
    errorStrategy: 'continue',
    bufferSize: 10,
    metrics: {
      enabled: true,
      interval: 5000,
    },
  },
};

// Usage example
async function runChatbot() {
  const chatbot = new Graph(chatbotGraph);

  // Initialize the graph
  await chatbot.initialize();
  await chatbot.start();

  // Subscribe to AI responses
  chatbot.subscribe('llm', (packet: any) => {
    if (packet.data?.response) {
      console.log('Assistant:', packet.data.response);
    } else if (packet.data?.error) {
      console.error('AI Error:', packet.data.error);
    }
  });

  // Example conversation
  const messages = [
    "Hi! My name is Alex and I'm interested in learning about AI.",
    'What did I just tell you my name was?',
    'Can you recommend some resources for beginners?',
    'Actually, I should mention I have a background in Python programming.',
    'Based on what you know about me, what specific AI topics should I focus on?',
  ];

  for (const message of messages) {
    console.log('\nUser:', message);

    await chatbot.inject('input', {
      prompt: message,
      originalPrompt: message,
      timestamp: Date.now(),
    });

    // Wait for response to complete
    await new Promise((resolve) => setTimeout(resolve, 2000));
  }

  // Get memory statistics
  const memoryStats = await chatbot.getVariable('memoryStats');
  console.log('\nMemory Statistics:', memoryStats);

  await chatbot.stop();
}

// Run the example with bun
if (import.meta.main) {
  runChatbot().catch(console.error);
}

export { chatbotGraph, runChatbot };
