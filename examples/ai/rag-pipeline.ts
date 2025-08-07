/**
 * RAG (Retrieval Augmented Generation) Pipeline Example
 *
 * This example demonstrates how to build a RAG system that retrieves
 * relevant documents and uses them to generate informed responses.
 */

import { Graph, GraphDefinition } from '@fluxgraph/core';
import { js } from '@fluxgraph/core/utils';

// Sample document database
const documents = [
  {
    id: 'doc1',
    title: 'FluxGraph Overview',
    content: 'FluxGraph is a lightweight stream processing library designed for edge computing. It supports real-time data processing with graph-based architectures.',
    metadata: { category: 'overview', tags: ['architecture', 'streaming'] },
  },
  {
    id: 'doc2',
    title: 'AI Capabilities',
    content:
      'FluxGraph includes built-in AI nodes for LLM interactions, tool calling, and memory management. It supports multiple LLM providers including OpenAI, Claude, and Gemini.',
    metadata: { category: 'ai', tags: ['llm', 'tools', 'memory'] },
  },
  {
    id: 'doc3',
    title: 'Edge Deployment',
    content: 'FluxGraph is optimized for Cloudflare Workers and Durable Objects. It provides sub-millisecond latency and automatic scaling across the global edge network.',
    metadata: { category: 'deployment', tags: ['cloudflare', 'edge', 'performance'] },
  },
];

const ragPipeline: GraphDefinition = {
  id: 'rag-pipeline',
  name: 'RAG Question Answering System',
  description: 'Retrieval Augmented Generation for accurate Q&A',

  nodes: [
    {
      id: 'query-input',
      type: 'source',
      name: 'User Query',
      sourceType: 'manual',
      config: {},
    },

    {
      id: 'query-embedder',
      type: 'transform',
      name: 'Query Embedder',
      transformFunction: js`
        // In production, use real embedding API
        // For demo, we'll use keyword matching
        const query = data.query.toLowerCase();
        const keywords = query.split(' ').filter((w) => w.length > 3);

        return {
          ...data,
          queryEmbedding: keywords,
          originalQuery: data.query,
        };
      `,
    },

    {
      id: 'vector-store',
      type: 'memory',
      name: 'Document Vector Store',
      memoryType: 'semantic',
      embeddingDimension: 384,
      maxEntries: 1000,
    },

    {
      id: 'retriever',
      type: 'transform',
      name: 'Document Retriever',
      transformFunction: js`
        // Sample document database
        const documents = [
          {
            id: 'doc1',
            title: 'FluxGraph Overview',
            content: 'FluxGraph is a lightweight stream processing library designed for edge computing. It supports real-time data processing with graph-based architectures.',
            metadata: { category: 'overview', tags: ['architecture', 'streaming'] },
          },
          {
            id: 'doc2',
            title: 'AI Capabilities',
            content: 'FluxGraph includes built-in AI nodes for LLM interactions, tool calling, and memory management. It supports multiple LLM providers including OpenAI, Claude, and Gemini.',
            metadata: { category: 'ai', tags: ['llm', 'tools', 'memory'] },
          },
          {
            id: 'doc3',
            title: 'Edge Deployment',
            content: 'FluxGraph is optimized for Cloudflare Workers and Durable Objects. It provides sub-millisecond latency and automatic scaling across the global edge network.',
            metadata: { category: 'deployment', tags: ['cloudflare', 'edge', 'performance'] },
          },
        ];

        // Retrieve relevant documents based on query
        const keywords = data.queryEmbedding;

        // Score documents based on keyword matches
        const scoredDocs = documents.map((doc) => {
          const content = (doc.title + ' ' + doc.content).toLowerCase();
          const score = keywords.reduce((acc, keyword) => {
            return acc + (content.includes(keyword) ? 1 : 0);
          }, 0);
          return { ...doc, score };
        });

        // Get top 3 most relevant documents
        const relevantDocs = scoredDocs
          .sort((a, b) => b.score - a.score)
          .slice(0, 3)
          .filter((doc) => doc.score > 0);

        return {
          ...data,
          retrievedDocuments: relevantDocs,
          hasContext: relevantDocs.length > 0,
        };
      `,
    },

    {
      id: 'context-builder',
      type: 'transform',
      name: 'Context Builder',
      transformFunction: js`
        if (!data.retrievedDocuments?.length) {
          return {
            ...data,
            context: 'No relevant documents found.',
            prompt: data.originalQuery,
          };
        }

        // Build context from retrieved documents
        const context = data.retrievedDocuments.map((doc) => '[' + doc.title + ']\n' + doc.content).join('\n\n---\n\n');

        // Create augmented prompt
        const prompt = 'Based on the following context, please answer the question.\n\nContext:\n' + context + '\n\nQuestion: ' + data.originalQuery + '\n\nPlease provide a comprehensive answer based on the provided context. If the context doesn\'t contain enough information, please indicate what\'s missing.';

        return {
          ...data,
          context,
          prompt,
        };
      `,
    },

    {
      id: 'generator',
      type: 'transform',
      name: 'Mock Answer Generator',
      transformFunction: js`
        // Mock LLM response based on context
        let response = 'I apologize, but I don\'t have enough information to answer that question.';
        
        if (data.prompt && data.prompt.includes('FluxGraph')) {
          response = 'FluxGraph is a lightweight stream processing library designed for edge computing. It supports real-time data processing with graph-based architectures and includes built-in AI nodes for LLM interactions, tool calling, and memory management.';
        } else if (data.prompt && data.prompt.includes('AI')) {
          response = 'FluxGraph includes comprehensive AI capabilities with built-in nodes for LLM interactions, tool calling, and memory management. It supports multiple LLM providers including OpenAI, Claude, and Gemini.';
        } else if (data.prompt && data.prompt.includes('edge')) {
          response = 'FluxGraph is optimized for Cloudflare Workers and Durable Objects. It provides sub-millisecond latency and automatic scaling across the global edge network.';
        } else if (data.prompt && data.prompt.includes('performance')) {
          response = 'FluxGraph is designed for high-performance edge computing with sub-millisecond latency and automatic scaling capabilities.';
        } else if (data.prompt && data.prompt.includes('streaming')) {
          response = 'Yes, FluxGraph is built for real-time stream processing with graph-based architectures optimized for edge computing environments.';
        }
        
        return {
          ...data,
          response,
          model: 'mock-llm',
        };
      `,
    },

    {
      id: 'response-formatter',
      type: 'transform',
      name: 'Response Formatter',
      transformFunction: js`
        return {
          query: data.originalQuery,
          answer: data.response,
          sources: data.retrievedDocuments?.map((doc) => ({
            id: doc.id,
            title: doc.title,
            relevanceScore: doc.score,
          })) || [],
          timestamp: Date.now(),
        };
      `,
    },

    {
      id: 'output',
      type: 'sink',
      name: 'Answer Output',
      sinkType: 'custom',
      config: {
        callback: async (packet: any) => {
          const { query, answer, sources } = packet.data;
          console.log('\n═══════════════════════════════════════');
          console.log('Query:', query);
          console.log('\nAnswer:', answer);
          console.log('\nSources:', sources);
          console.log('═══════════════════════════════════════\n');
        },
      },
    },
  ],

  edges: [
    { from: 'query-input', to: 'query-embedder' },
    { from: 'query-embedder', to: 'retriever' },
    { from: 'retriever', to: 'context-builder' },
    { from: 'context-builder', to: 'generator' },
    { from: 'generator', to: 'response-formatter' },
    { from: 'response-formatter', to: 'output' },
  ],

  config: {
    errorStrategy: 'continue',
  },
};

// Usage example
async function runRAGPipeline() {
  const rag = new Graph(ragPipeline);

  await rag.initialize();
  await rag.start();

  // Example queries
  const queries = [
    'What is FluxGraph?',
    'How does FluxGraph handle AI workloads?',
    'Can FluxGraph run on edge networks?',
    'What are the performance characteristics?',
    'Does it support streaming?',
  ];

  for (const query of queries) {
    await rag.inject('query-input', { query });

    // Wait for processing
    await new Promise((resolve) => setTimeout(resolve, 1500));
  }

  await rag.stop();
}

// Run the example with bun
if (import.meta.main) {
  runRAGPipeline().catch(console.error);
}

export { ragPipeline, runRAGPipeline, documents };
